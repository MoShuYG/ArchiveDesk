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
        throw "$Name dependencies missing: $nodeModules`nRun with -InstallDeps or execute 'npm install' in $Path."
    }

    Write-Host "Installing $Name dependencies..." -ForegroundColor Cyan
    Push-Location $Path
    try {
        npm.cmd install
        if ($LASTEXITCODE -ne 0) {
            throw "Failed to install $Name dependencies."
        }
    } finally {
        Pop-Location
    }
}

function Invoke-NpmScript {
    param(
        [string]$ScriptName
    )

    Write-Host "Running npm script: $ScriptName" -ForegroundColor Cyan
    & npm.cmd run $ScriptName
    if ($LASTEXITCODE -ne 0) {
        throw "npm script failed: $ScriptName"
    }
}

function Start-BrowserLaunch {
    param(
        [string]$Url
    )

    try {
        $command = "timeout /t 2 /nobreak >nul && start `"`" $Url"
        Start-Process -FilePath "cmd.exe" -ArgumentList "/c", $command -WindowStyle Hidden | Out-Null
        Write-Host "Opening browser at $Url" -ForegroundColor Gray
    } catch {
        Write-Warning "Unable to auto-open browser. Open $Url manually."
    }
}

Ensure-Dependencies -Path $root -Name "backend"
Ensure-Dependencies -Path $frontend -Name "frontend"

Push-Location $root
try {
    Get-Command node -ErrorAction Stop | Out-Null
    Get-Command npm.cmd -ErrorAction Stop | Out-Null

    Write-Host "ArchiveDesk release-like mode is starting..." -ForegroundColor Green
    Invoke-NpmScript -ScriptName "clean"
    Invoke-NpmScript -ScriptName "build:all"

    if (-not (Test-Path $serverEntry)) {
        throw "Build output missing: $serverEntry"
    }

    Start-BrowserLaunch -Url $browserUrl
    Write-Host "Serving frontend build from backend on port 3000" -ForegroundColor Green
    Write-Host "Press Ctrl+C to stop" -ForegroundColor Gray

    $env:NODE_ENV = "production"
    $env:REQUIRE_HTTPS = "false"

    & node $serverEntry
    $exitCode = $LASTEXITCODE
    if ($exitCode -ne 0) {
        throw "ArchiveDesk exited with code $exitCode."
    }
} finally {
    Pop-Location
}

