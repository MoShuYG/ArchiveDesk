function Ensure-NodeRuntime {
    param([Parameter(Mandatory = $true)][string]$CacheRoot)

    $version = 'v22.23.3'
    $name = "node-$version-win-x64"
    $directory = Join-Path $CacheRoot $name
    $executable = Join-Path $directory 'node.exe'
    if (-not (Test-Path -LiteralPath $executable)) {
        New-Item -ItemType Directory -Path $CacheRoot -Force | Out-Null
        $archive = Join-Path $CacheRoot "$name.zip"
        if (-not (Test-Path -LiteralPath $archive)) {
            Write-Host "Downloading Node.js $version from nodejs.org..."
            [Net.ServicePointManager]::SecurityProtocol = [Net.ServicePointManager]::SecurityProtocol -bor [Net.SecurityProtocolType]::Tls12
            $partial = "$archive.$([guid]::NewGuid()).download"
            Invoke-WebRequest -UseBasicParsing -Uri "https://nodejs.org/dist/$version/$name.zip" -OutFile $partial
            $archiveToCheck = $partial
        } else {
            $archiveToCheck = $archive
        }
        # Pinned from the official release SHASUMS256.txt.
        $expected = '2b0ff57b049cda1bbcea2240eec20467018713c1efe1f7360c2681859b90ed71'
        if ((Get-FileHash -LiteralPath $archiveToCheck -Algorithm SHA256).Hash -ne $expected) {
            throw "Node.js SHA-256 verification failed: $archiveToCheck"
        }
        if ($archiveToCheck -ne $archive) {
            Move-Item -LiteralPath $archiveToCheck -Destination $archive -Force
        }
        Expand-Archive -LiteralPath $archive -DestinationPath $CacheRoot -Force
    }
    $actual = & $executable -p "process.version + ':' + process.versions.modules"
    if ($LASTEXITCODE -ne 0 -or $actual -ne "${version}:127") {
        throw "Invalid project Node.js runtime: $executable (expected ${version}:127)"
    }
    return $directory
}
