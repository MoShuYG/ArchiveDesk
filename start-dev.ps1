param(
    [switch]$InstallDeps
)

$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$frontend = Join-Path $root "frontend"
$serverEntry = Join-Path $root "dist\src\server.js"
$browserUrl = "http://localhost:3000"

function Ensure-Dependencies {
    param(
        [string]$Path,
        [string]$Name
    )

    $nodeModules = Join-Path $Path "node_modules"
    if (Test-Path $nodeModules) {
        return
    }

    if (-not $InstallDeps) {
        throw "缺少 $Name 依赖：$nodeModules`n请使用 -InstallDeps 重新运行，或在 $Path 目录执行 'npm install'。"
    }

    Write-Host "正在安装 $Name 依赖..." -ForegroundColor Cyan
    Push-Location $Path
    try {
        npm.cmd install
        if ($LASTEXITCODE -ne 0) {
            throw "安装 $Name 依赖失败。"
        }
    } finally {
        Pop-Location
    }
}

function Invoke-NpmScript {
    param(
        [string]$ScriptName
    )

    Write-Host "正在执行 npm 脚本：$ScriptName" -ForegroundColor Cyan
    & npm.cmd run $ScriptName
    if ($LASTEXITCODE -ne 0) {
        throw "npm 脚本执行失败：$ScriptName"
    }
}

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

Ensure-Dependencies -Path $root -Name "后端"
Ensure-Dependencies -Path $frontend -Name "前端"

Push-Location $root
try {
    Get-Command node -ErrorAction Stop | Out-Null
    Get-Command npm.cmd -ErrorAction Stop | Out-Null

    Write-Host "ArchiveDesk 本地生产模拟模式启动中..." -ForegroundColor Green
    Invoke-NpmScript -ScriptName "clean"
    Invoke-NpmScript -ScriptName "build:all"

    if (-not (Test-Path $serverEntry)) {
        throw "缺少构建产物：$serverEntry"
    }

    Start-BrowserLaunch -Url $browserUrl
    Write-Host "正在通过后端托管前端构建产物，端口：3000" -ForegroundColor Green
    Write-Host "按 Ctrl+C 停止服务" -ForegroundColor Gray

    $env:NODE_ENV = "production"
    $env:REQUIRE_HTTPS = "false"

    & node $serverEntry
    $exitCode = $LASTEXITCODE
    if ($exitCode -ne 0) {
        throw "ArchiveDesk 退出，退出码：$exitCode"
    }
} finally {
    Pop-Location
}
