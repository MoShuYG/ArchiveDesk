param(
    [string]$Version = "0.1.0-alpha.2"
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
        throw "robocopy failed from '$Source' to '$Destination' with exit code $LASTEXITCODE"
    }
}

$repoRoot = Split-Path -Parent $PSScriptRoot
$releaseName = "ArchiveDesk-v$Version-win-preview"
$releaseRoot = Join-Path $repoRoot "release"
$stagingDir = Join-Path $releaseRoot $releaseName
$zipPath = Join-Path $releaseRoot "$releaseName.zip"
$quickStartPath = Join-Path $stagingDir "QUICKSTART.txt"
$startBatPath = Join-Path $stagingDir "start.bat"
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
    (Join-Path $repoRoot "README.md"),
    (Join-Path $repoRoot "LICENSE")
)

foreach ($path in $requiredPaths) {
    if (-not (Test-Path -LiteralPath $path)) {
        throw "Required path not found: $path"
    }
}

if (Test-Path -LiteralPath $stagingDir) {
    Remove-Item -LiteralPath $stagingDir -Recurse -Force
}
if (Test-Path -LiteralPath $zipPath) {
    Remove-Item -LiteralPath $zipPath -Force
}

New-Item -ItemType Directory -Path $releaseRoot -Force | Out-Null
New-Item -ItemType Directory -Path $stagingDir -Force | Out-Null
New-Item -ItemType Directory -Path (Join-Path $stagingDir "frontend") -Force | Out-Null

Copy-Directory -Source (Join-Path $repoRoot "dist") -Destination (Join-Path $stagingDir "dist")
Copy-Directory -Source (Join-Path $repoRoot "frontend\dist") -Destination (Join-Path $stagingDir "frontend\dist")
Copy-Item -LiteralPath (Join-Path $repoRoot "package.json") -Destination $stagingDir
Copy-Item -LiteralPath (Join-Path $repoRoot "package-lock.json") -Destination $stagingDir
Copy-Item -LiteralPath (Join-Path $repoRoot ".env.example") -Destination $stagingDir
Copy-Item -LiteralPath (Join-Path $repoRoot "README.md") -Destination $stagingDir
Copy-Item -LiteralPath (Join-Path $repoRoot "LICENSE") -Destination $stagingDir

# Copy the already-working local install first so native modules do not need to rebuild in staging.
Copy-Directory -Source $nodeModulesPath -Destination (Join-Path $stagingDir "node_modules")

$startBat = @'
@echo off
setlocal
cd /d "%~dp0"

if not exist ".env" (
  copy /Y ".env.example" ".env" >nul
)

where node >nul 2>nul
if errorlevel 1 (
  echo Node.js was not found in PATH.
  echo Please install Node.js, then run start.bat again.
  pause
  exit /b 1
)

start "" cmd /c "timeout /t 2 /nobreak >nul && start "" http://localhost:3000"

set NODE_ENV=production
set REQUIRE_HTTPS=false
node dist\src\server.js
set EXIT_CODE=%ERRORLEVEL%

if not "%EXIT_CODE%"=="0" (
  echo.
  echo ArchiveDesk failed to start.
  echo If port 3000 is already in use, close the other app and try again.
  pause
)

exit /b %EXIT_CODE%
'@

$generatedQuickStart = @"
ArchiveDesk v$Version Windows 预览版

这是一个早期预览版本。

请双击 start.bat 启动，并等待几秒钟完成初始化。

如果浏览器没有自动打开，请访问：
http://localhost:3000

此预览包默认关闭 REQUIRE_HTTPS，方便本地运行。

如果端口 3000 已被占用，启动可能会失败。

ArchiveDesk v$Version Windows Preview

This is an early preview release.

To start ArchiveDesk, double-click start.bat and wait a few seconds.

If the browser does not open automatically, visit:
http://localhost:3000

REQUIRE_HTTPS is disabled for this local preview.

If port 3000 is already in use, startup may fail.
"@

Set-Content -LiteralPath $startBatPath -Value $startBat -Encoding ASCII
if (Test-Path -LiteralPath $repoQuickStartPath) {
    Copy-Item -LiteralPath $repoQuickStartPath -Destination $quickStartPath
} else {
    [System.IO.File]::WriteAllText($quickStartPath, $generatedQuickStart, [System.Text.UTF8Encoding]::new($true))
}

$npmCmd = Get-Command npm.cmd -ErrorAction SilentlyContinue
if (-not $npmCmd) {
    throw "npm.cmd was not found in PATH."
}

Push-Location $stagingDir
try {
    & $npmCmd.Source install --omit=dev --ignore-scripts --no-audit --no-fund
    if ($LASTEXITCODE -ne 0) {
        throw "npm install --omit=dev failed with exit code $LASTEXITCODE"
    }
}
finally {
    Pop-Location
}

Compress-Archive -Path (Join-Path $stagingDir "*") -DestinationPath $zipPath -Force

Write-Host "Release staging prepared at: $stagingDir"
Write-Host "Release zip created at: $zipPath"
