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
$releaseName = "ArchiveDesk-v0.1.0-alpha.1-win-preview"
$releaseRoot = Join-Path $repoRoot "release"
$stagingDir = Join-Path $releaseRoot $releaseName
$quickStartPath = Join-Path $stagingDir "QUICKSTART.txt"
$startBatPath = Join-Path $stagingDir "start.bat"
$nodeModulesPath = Join-Path $repoRoot "node_modules"
$betterSqliteBinary = Join-Path $repoRoot "node_modules\better-sqlite3\build\Release\better_sqlite3.node"

$requiredPaths = @(
    (Join-Path $repoRoot "dist"),
    (Join-Path $repoRoot "frontend\dist"),
    $nodeModulesPath,
    $betterSqliteBinary,
    (Join-Path $repoRoot "package.json"),
    (Join-Path $repoRoot "package-lock.json"),
    (Join-Path $repoRoot ".env.example"),
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

New-Item -ItemType Directory -Path $releaseRoot -Force | Out-Null
New-Item -ItemType Directory -Path $stagingDir -Force | Out-Null
New-Item -ItemType Directory -Path (Join-Path $stagingDir "frontend") -Force | Out-Null

Copy-Directory -Source (Join-Path $repoRoot "dist") -Destination (Join-Path $stagingDir "dist")
Copy-Directory -Source (Join-Path $repoRoot "frontend\dist") -Destination (Join-Path $stagingDir "frontend\dist")
Copy-Item -LiteralPath (Join-Path $repoRoot "package.json") -Destination $stagingDir
Copy-Item -LiteralPath (Join-Path $repoRoot "package-lock.json") -Destination $stagingDir
Copy-Item -LiteralPath (Join-Path $repoRoot ".env.example") -Destination $stagingDir
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

$quickStartBase64 = "QXJjaGl2ZURlc2sgdjAuMS4wLWFscGhhLjEgV2luZG93cyDpooTop4jniYgKCui/meaYr+S4gOS4quaXqeacn+mihOiniOeJiOacrOOAggoK6K+35Y+M5Ye7IHN0YXJ0LmJhdCDlkK/liqjvvIzlubbnrYnlvoXlh6Dnp5Lpkp/lrozmiJDlkK/liqjjgIIKCuWmguaenOa1j+iniOWZqOayoeacieiHquWKqOaJk+W8gO+8jOivt+iuv+mXru+8mgpodHRwOi8vbG9jYWxob3N0OjMwMDAKCuatpOacrOWcsOmihOiniOW3suemgeeUqCBSRVFVSVJFX0hUVFBT44CCCgrlpoLmnpwgMzAwMCDnq6/lj6Plt7LooqvljaDnlKjvvIzlkK/liqjlj6/og73kvJrlpLHotKXjgIIKCkFyY2hpdmVEZXNrIHYwLjEuMC1hbHBoYS4xIFdpbmRvd3MgUHJldmlldwoKVGhpcyBpcyBhbiBlYXJseSBwcmV2aWV3IHJlbGVhc2UuCgpUbyBzdGFydCBBcmNoaXZlRGVzaywgZG91YmxlLWNsaWNrIHN0YXJ0LmJhdCBhbmQgd2FpdCBhIGZldyBzZWNvbmRzLgoKSWYgdGhlIGJyb3dzZXIgZG9lcyBub3Qgb3BlbiBhdXRvbWF0aWNhbGx5LCB2aXNpdDoKaHR0cDovL2xvY2FsaG9zdDozMDAwCgpSRVFVSVJFX0hUVFBTIGlzIGRpc2FibGVkIGZvciB0aGlzIGxvY2FsIHByZXZpZXcuCgpJZiBwb3J0IDMwMDAgaXMgYWxyZWFkeSBpbiB1c2UsIHN0YXJ0dXAgbWF5IGZhaWwu"
$quickStart = [System.Text.Encoding]::UTF8.GetString([System.Convert]::FromBase64String($quickStartBase64))

Set-Content -LiteralPath $startBatPath -Value $startBat -Encoding ASCII
[System.IO.File]::WriteAllText($quickStartPath, $quickStart, [System.Text.UTF8Encoding]::new($true))

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

Write-Host "Release staging prepared at: $stagingDir"
