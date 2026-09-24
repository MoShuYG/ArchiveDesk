param(
    [ValidatePattern('^\d+\.\d+\.\d+$')]
    [string]$Version = "1.0.1"
)

$ErrorActionPreference = "Stop"

function Copy-Directory {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Source,
        [Parameter(Mandatory = $true)]
        [string]$Destination
    )

    New-Item -ItemType Directory -Path $Destination -Force | Out-Null
    $null = robocopy $Source $Destination /E /R:2 /W:1 /NFL /NDL /NJH /NJS /NC /NS
    if ($LASTEXITCODE -ge 8) {
        throw "robocopy 复制失败：'$Source' -> '$Destination'，退出码：$LASTEXITCODE"
    }
}

function Write-Utf8BomFile {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Path,
        [Parameter(Mandatory = $true)]
        [string]$Content
    )

    $encoding = [System.Text.UTF8Encoding]::new($true)
    $bytes = $encoding.GetPreamble() + $encoding.GetBytes($Content)
    [System.IO.File]::WriteAllBytes($Path, $bytes)
}

$repoRoot = Split-Path -Parent $PSScriptRoot
. (Join-Path $PSScriptRoot "ensure-node-runtime.ps1")
$nodeDirectory = Ensure-NodeRuntime -CacheRoot (Join-Path $repoRoot ".runtime-data\node")
$env:PATH = "$nodeDirectory;$env:PATH"
$releaseName = "ArchiveDesk-v$Version-win"
$releaseRoot = Join-Path $repoRoot "release"
$stagingDir = Join-Path $releaseRoot $releaseName
$zipPath = Join-Path $releaseRoot "$releaseName.zip"
$quickStartPath = Join-Path $stagingDir "QUICKSTART.txt"
$startBatPath = Join-Path $stagingDir "start.bat"
$startPs1Path = Join-Path $stagingDir "start.ps1"
$nodeModulesPath = Join-Path $repoRoot "node_modules"
$betterSqliteBinary = Join-Path $repoRoot "node_modules\better-sqlite3\build\Release\better_sqlite3.node"
$repoQuickStartPath = Join-Path $repoRoot "QUICKSTART.txt"

$requiredPaths = @(
    (Join-Path $repoRoot "dist"),
    (Join-Path $repoRoot "frontend\dist"),
    $nodeModulesPath,
    $betterSqliteBinary,
    (Join-Path $repoRoot "package.json"),
    (Join-Path $repoRoot "package-lock.json"),
    (Join-Path $repoRoot ".env.example"),
    $repoQuickStartPath,
    (Join-Path $repoRoot "LICENSE")
)

foreach ($path in $requiredPaths) {
    if (-not (Test-Path -LiteralPath $path)) {
        throw "缺少必需路径：$path"
    }
}

if (Test-Path -LiteralPath $stagingDir) {
    throw "Release staging directory already exists: $stagingDir"
}
if (Test-Path -LiteralPath $zipPath) {
    throw "Release archive already exists: $zipPath"
}

New-Item -ItemType Directory -Path $releaseRoot -Force | Out-Null
New-Item -ItemType Directory -Path $stagingDir -Force | Out-Null
New-Item -ItemType Directory -Path (Join-Path $stagingDir "frontend") -Force | Out-Null

Copy-Directory -Source (Join-Path $repoRoot "dist") -Destination (Join-Path $stagingDir "dist")
Copy-Directory -Source (Join-Path $repoRoot "frontend\dist") -Destination (Join-Path $stagingDir "frontend\dist")
Copy-Item -LiteralPath (Join-Path $repoRoot "package.json") -Destination $stagingDir
Copy-Item -LiteralPath (Join-Path $repoRoot "package-lock.json") -Destination $stagingDir
Copy-Item -LiteralPath (Join-Path $repoRoot ".env.example") -Destination $stagingDir
Copy-Item -LiteralPath (Join-Path $repoRoot "LICENSE") -Destination $stagingDir
New-Item -ItemType Directory -Path (Join-Path $stagingDir "runtime") -Force | Out-Null
Copy-Item -LiteralPath (Join-Path $nodeDirectory "node.exe") -Destination (Join-Path $stagingDir "runtime")
Copy-Item -LiteralPath (Join-Path $nodeDirectory "LICENSE") -Destination (Join-Path $stagingDir "runtime\NODE-LICENSE.txt")

$quickStartContent = [System.IO.File]::ReadAllText($repoQuickStartPath)
Write-Utf8BomFile -Path $quickStartPath -Content $quickStartContent

# 先复制当前已安装好的依赖，避免在 staging 目录重新编译原生模块。
Copy-Directory -Source $nodeModulesPath -Destination (Join-Path $stagingDir "node_modules")

$startBat = @'
@echo off
setlocal
cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0start.ps1"
set EXIT_CODE=%ERRORLEVEL%
if not "%EXIT_CODE%"=="0" (
    echo ArchiveDesk failed to start. See the error above.
    pause
)
endlocal & exit /b %EXIT_CODE%
'@

$startPs1 = @'
param([switch]$NoBrowser)
$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$nodeExe = Join-Path $root "runtime\node.exe"
$serverEntry = Join-Path $root "dist\src\server.js"
$browserUrl = "http://localhost:3000"

function Start-BrowserLaunch {
    param(
        [string]$Url
    )

    try {
        $command = "timeout /t 2 /nobreak >nul && start `"`" $Url"
        Start-Process -FilePath "cmd.exe" -ArgumentList "/c", $command -WindowStyle Hidden | Out-Null
        Write-Host "正在打开浏览器：$Url" -ForegroundColor Gray
    } catch {
        Write-Warning "无法自动打开浏览器，请手动访问：$Url"
    }
}

Push-Location $root
try {
    if (-not (Test-Path ".env")) {
        Copy-Item -LiteralPath ".env.example" -Destination ".env"
    }

    if (-not (Test-Path -LiteralPath $nodeExe)) {
        throw "Missing bundled runtime: runtime\node.exe. Please extract the complete ZIP."
    }

    if (-not (Test-Path $serverEntry)) {
        throw "缺少启动文件：$serverEntry"
    }

    $env:NODE_ENV = "production"
    $env:REQUIRE_HTTPS = "false"

    if (-not $NoBrowser) { Start-BrowserLaunch -Url $browserUrl }
    Write-Host "ArchiveDesk 启动中..." -ForegroundColor Green
    Write-Host "按 Ctrl+C 可停止服务" -ForegroundColor Gray

    & $nodeExe $serverEntry
    $exitCode = $LASTEXITCODE
    if ($exitCode -ne 0) {
        Write-Host "" 
        Write-Host "ArchiveDesk 启动失败。" -ForegroundColor Red
        Write-Host "如果端口 3000 已被占用，请先关闭占用程序后重试。" -ForegroundColor Red
        exit $exitCode
    }
} finally {
    Pop-Location
}
'@

Set-Content -LiteralPath $startBatPath -Value $startBat -Encoding ASCII
Write-Utf8BomFile -Path $startPs1Path -Content $startPs1

$npmCmd = Get-Command npm.cmd -ErrorAction SilentlyContinue
if (-not $npmCmd) {
    throw "未在 PATH 中找到 npm.cmd。"
}

Push-Location $stagingDir
try {
    & $npmCmd.Source install --omit=dev --ignore-scripts --no-audit --no-fund
    if ($LASTEXITCODE -ne 0) {
        throw "npm install --omit=dev 执行失败，退出码：$LASTEXITCODE"
    }
}
finally {
    Pop-Location
}

Compress-Archive -Path (Join-Path $stagingDir "*") -DestinationPath $zipPath -Force

Write-Host "发行目录已生成：$stagingDir"
Write-Host "发行压缩包已生成：$zipPath"
