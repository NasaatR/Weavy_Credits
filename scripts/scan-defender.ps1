# Official scan reference: https://learn.microsoft.com/en-us/defender-endpoint/command-line-arguments-microsoft-defender-antivirus
param([Parameter(Mandatory=$true)][string]$Archive)
$ErrorActionPreference = 'Stop'
$PSNativeCommandUseErrorActionPreference = $false
$report = [ordered]@{ status='unavailable'; archive=(Split-Path $Archive -Leaf); sha256=$null; engine=$null; signatures=$null; signatureUpdated=$null; scans=@(); error=$null }
try {
    $resolved = (Resolve-Path -LiteralPath $Archive).Path
    $report.sha256 = (Get-FileHash -LiteralPath $resolved -Algorithm SHA256).Hash.ToLowerInvariant()
    $checksumFile = Join-Path (Split-Path $resolved -Parent) 'SHA256SUMS'
    $filename = Split-Path $resolved -Leaf
    $expectedLine = Get-Content -LiteralPath $checksumFile | Where-Object { $_ -match ('^[a-f0-9]{64}  ' + [regex]::Escape($filename) + '$') }
    if (!$expectedLine -or $expectedLine.Substring(0,64) -ne $report.sha256) { throw 'Archive does not match the committed SHA256SUMS.' }
    $engine = Get-ChildItem "$env:ProgramData\Microsoft\Windows Defender\Platform\*\MpCmdRun.exe" -ErrorAction SilentlyContinue | Sort-Object FullName -Descending | Select-Object -First 1 -ExpandProperty FullName
    if (!$engine) { $engine = "$env:ProgramFiles\Windows Defender\MpCmdRun.exe" }
    if (!(Test-Path -LiteralPath $engine)) { throw 'Microsoft Defender scanner is not installed on this runner.' }
    $service = Get-Service WinDefend -ErrorAction Stop
    if ($service.Status -ne 'Running') { Start-Service WinDefend -ErrorAction Stop }
    & $engine -SignatureUpdate
    if ($LASTEXITCODE -ne 0) { throw "Signature update failed: $LASTEXITCODE" }
    $status = Get-MpComputerStatus
    $report.engine = $status.AMEngineVersion
    $report.signatures = $status.AntivirusSignatureVersion
    $report.signatureUpdated = $status.AntivirusSignatureLastUpdated.ToUniversalTime().ToString('o')
    $expanded = Join-Path $env:RUNNER_TEMP ('weavy-scan-' + [guid]::NewGuid().ToString())
    Expand-Archive -LiteralPath $resolved -DestinationPath $expanded
    foreach ($target in @($resolved,$expanded)) {
        # Report-only custom scan: archive contents and exclusions are scanned;
        # no global Defender preference, exclusion or protection is changed.
        $output = & $engine -Scan -ScanType 3 -File $target -DisableRemediation 2>&1
        $code = $LASTEXITCODE
        $report.scans += @{ target=($target -eq $resolved ? 'archive' : 'extracted'); exitCode=$code; output=($output -join "`n") }
        $output | Write-Output
        if ($code -ne 0) { $report.status='not-clean'; throw "Defender scan did not return a clean result: $code" }
    }
    $packageRoot = Get-ChildItem -LiteralPath $expanded -Directory | Select-Object -First 1 -ExpandProperty FullName
    foreach ($line in Get-Content -LiteralPath (Join-Path $packageRoot 'PACKAGE-CONTENTS.sha256')) {
        if ($line -notmatch '^([a-f0-9]{64})  (.+)$') { throw 'Invalid package integrity entry.' }
        $expected = $Matches[1]
        $file = [IO.Path]::GetFullPath((Join-Path $packageRoot $Matches[2]))
        if (!$file.StartsWith($packageRoot + [IO.Path]::DirectorySeparatorChar, [StringComparison]::OrdinalIgnoreCase)) { throw 'Invalid package path.' }
        if (!(Test-Path -LiteralPath $file) -or (Get-FileHash -LiteralPath $file -Algorithm SHA256).Hash.ToLowerInvariant() -ne $expected) { $report.status='not-clean'; throw 'A packaged file is missing or changed after scanning.' }
    }
    if ((Get-FileHash -LiteralPath $resolved -Algorithm SHA256).Hash.ToLowerInvariant() -ne $report.sha256) { throw 'Archive changed during scan.' }
    $report.status='clean'
} catch {
    $report.error=$_.Exception.Message
    throw
} finally {
    $json = $report | ConvertTo-Json -Depth 6
    $json | Write-Output
    if ($env:GITHUB_STEP_SUMMARY) { "## Microsoft Defender scan`n``````json`n$json`n``````" | Add-Content -LiteralPath $env:GITHUB_STEP_SUMMARY }
}
