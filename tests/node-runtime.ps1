param([Parameter(Mandatory = $true)][string]$ArchivePath)
$ErrorActionPreference = 'Stop'
. "$PSScriptRoot\..\scripts\ensure-node-runtime.ps1"

# Exercise a fresh install using the official archive already downloaded locally.
$script:archive = (Resolve-Path $ArchivePath).Path
$script:downloads = 0
$script:corrupt = $false
function Invoke-WebRequest {
    param($Uri, $OutFile, [switch]$UseBasicParsing)
    if ($Uri -ne 'https://nodejs.org/dist/v22.23.3/node-v22.23.3-win-x64.zip') {
        throw "Unexpected download URL: $Uri"
    }
    $script:downloads++
    if ($script:corrupt) {
        Set-Content -LiteralPath $OutFile -Value 'invalid archive'
    } else {
        Copy-Item -LiteralPath $script:archive -Destination $OutFile
    }
}
$testRoot = Join-Path $PSScriptRoot "..\.runtime-data\node-test-$([guid]::NewGuid())"
$directory = Ensure-NodeRuntime -CacheRoot $testRoot
$abi = & (Join-Path $directory 'node.exe') -p 'process.versions.modules'
if ($LASTEXITCODE -ne 0 -or $abi -ne '127') { throw 'Runtime ABI mismatch' }
$reused = Ensure-NodeRuntime -CacheRoot $testRoot
if ($directory -ne $reused -or $script:downloads -ne 1) { throw 'Offline reuse failed' }
$script:corrupt = $true
$rejected = $false
try {
    Ensure-NodeRuntime -CacheRoot (Join-Path $testRoot 'corrupt') | Out-Null
} catch {
    if ($_.Exception.Message -notlike '*SHA-256*') { throw }
    $rejected = $true
}
if (-not $rejected) { throw 'Corrupt archive was accepted' }
Write-Host 'PASS: fresh install, matching ABI, offline reuse, corrupt archive rejection'
