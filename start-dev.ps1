param(
    [switch]$InstallDeps
)

$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$frontend = Join-Path $root "frontend"

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
    } finally {
        Pop-Location
    }
}

Ensure-Dependencies -Path $root -Name "backend"
Ensure-Dependencies -Path $frontend -Name "frontend"

$backendCommand = "Set-Location '$root'; npm.cmd run dev"
$frontendCommand = "Set-Location '$frontend'; npm.cmd run dev"

Start-Process powershell -ArgumentList "-NoExit", "-ExecutionPolicy", "Bypass", "-Command", $backendCommand -WindowStyle Normal
Start-Process powershell -ArgumentList "-NoExit", "-ExecutionPolicy", "Bypass", "-Command", $frontendCommand -WindowStyle Normal

Write-Host "Backend and frontend dev servers started in separate windows." -ForegroundColor Green
Write-Host "Backend: http://localhost:3000" -ForegroundColor Gray
Write-Host "Frontend: http://localhost:5173" -ForegroundColor Gray

