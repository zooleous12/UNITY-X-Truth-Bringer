# AEGIS RECONNAISSANCE - PowerShell Edition
# Hunt for known attack signatures - NO KILLS, RECON ONLY
# Works even when system tools are broken

$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$findings = @()

function Log-Finding {
    param($Category, $Severity, $Description, $Details)
    
    $finding = @{
        Timestamp = (Get-Date).ToString("o")
        Category = $Category
        Severity = $Severity
        Description = $Description
        Details = $Details
    }
    
    $findings += $finding
    Write-Host "[$Severity] $Category`: $Description" -ForegroundColor $(
        switch($Severity) {
            "CRITICAL" { "Red" }
            "HIGH" { "Yellow" }
            default { "White" }
        }
    )
    
    return $finding
}

Write-Host "=" * 60
Write-Host "AEGIS RECONNAISSANCE MODE - HUNTING THREATS"
Write-Host "Based on Feb 28, 2026 forensic evidence"
Write-Host "=" * 60

# 1. Check UEFI Boot Entries
Write-Host "`n[*] Scanning UEFI boot entries..."
try {
    $bootEntries = bcdedit /enum firmware 2>&1 | Out-String
    $suspiciousPatterns = @('ggg', 'rtdrgr', 'Dell\BiosTelemetry', 'Dell\logs')
    
    foreach ($pattern in $suspiciousPatterns) {
        if ($bootEntries -match $pattern) {
            $findings += Log-Finding "UEFI_BOOTKIT" "CRITICAL" "Suspicious UEFI entry: $pattern" @{Pattern=$pattern}
        }
    }
} catch {
    Write-Host "[!] UEFI check failed: $_"
}

# 2. Check Hidden User Accounts
Write-Host "`n[*] Scanning for hidden user accounts..."
try {
    $users = net user 2>&1 | Out-String
    $suspiciousUsers = @('bonni', 'zoole')
    
    foreach ($user in $suspiciousUsers) {
        if ($users -match $user) {
            $findings += Log-Finding "HIDDEN_USER" "CRITICAL" "Attacker account found: $user" @{Username=$user}
        }
    }
} catch {
    Write-Host "[!] User check failed: $_"
}

# 3. Check Orphaned SID Tasks
Write-Host "`n[*] Scanning for orphaned SID tasks..."
try {
    $tasks = schtasks /query /fo LIST /v 2>&1 | Out-String
    if ($tasks -match 'S-1-5-21-.*-1001') {
        $findings += Log-Finding "ORPHANED_SID" "HIGH" "Orphaned SID tasks detected" @{Evidence="SID-1001 found"}
    }
} catch {
    Write-Host "[!] Task check failed: $_"
}

# 4. Check BBSK Malware
Write-Host "`n[*] Scanning for BBSK malware..."
$bbskPath = "$env:APPDATA\BBSK"
if (Test-Path $bbskPath) {
    $files = Get-ChildItem $bbskPath -ErrorAction SilentlyContinue
    $findings += Log-Finding "BBSK_MALWARE" "CRITICAL" "BBSK malware folder detected" @{Path=$bbskPath; Files=$files.Name}
}

# Check hidden PowerShell processes
$hiddenPS = Get-Process powershell -ErrorAction SilentlyContinue | Where-Object {
    $_.MainWindowHandle -eq 0
}
if ($hiddenPS.Count -gt 5) {
    $findings += Log-Finding "HIDDEN_POWERSHELL" "CRITICAL" "Multiple hidden PowerShell: $($hiddenPS.Count)" @{Count=$hiddenPS.Count}
}

# 5. Check MMC Hijacking
Write-Host "`n[*] Checking for MMC hijacking..."
$mmcConfig = "$env:SystemRoot\System32\mmc.exe.config"
if (Test-Path $mmcConfig) {
    $findings += Log-Finding "MMC_HIJACK" "HIGH" "MMC hijacking config detected" @{Path=$mmcConfig}
}

# 6. Check Steganography Files
Write-Host "`n[*] Scanning for steganography files..."
$suspiciousFiles = @(
    'UNLOCKED_EVIDENCE_DECODED.json',
    'UNLOCKED_EVIDENCE_ENCODED.base64',
    'UNLOCKED_EVIDENCE_STEGANOGRAPHY.png',
    'tmpDFF8.tmp.py',
    'decode.py'
)

$searchPaths = @(
    "$env:USERPROFILE\Desktop",
    "$env:USERPROFILE\Documents",
    "C:\core"
)

foreach ($searchPath in $searchPaths) {
    if (Test-Path $searchPath) {
        foreach ($file in $suspiciousFiles) {
            $found = Get-ChildItem -Path $searchPath -Filter $file -Recurse -ErrorAction SilentlyContinue
            if ($found) {
                $findings += Log-Finding "STEGANOGRAPHY" "CRITICAL" "Steganography file: $file" @{Path=$found.FullName}
            }
        }
    }
}

# 7. Check Wavesor Adware
Write-Host "`n[*] Scanning for Wavesor adware..."
$wavesorPaths = @(
    "$env:USERPROFILE\Wavesor Software",
    "$env:LOCALAPPDATA\Wavesor",
    "$env:APPDATA\WaveBrowser"
)

foreach ($path in $wavesorPaths) {
    if (Test-Path $path) {
        $findings += Log-Finding "WAVESOR_ADWARE" "HIGH" "Wavesor detected: $path" @{Path=$path}
    }
}

# 8. Check BingSvc Malware
Write-Host "`n[*] Scanning for BingSvc malware..."
$bingSvc = Get-Process | Where-Object { $_.Name -like "*bingsvc*" }
if ($bingSvc) {
    $findings += Log-Finding "BINGSVC_MALWARE" "HIGH" "BingSvc process: PID $($bingSvc.Id)" @{PID=$bingSvc.Id}
}

# 9. Check Attacker Emails in .env files
Write-Host "`n[*] Scanning for attacker email addresses..."
$attackerEmails = @('Bonni601@gmail.com', 'Bellamari601@gmail.com', 'Freebirdt90@msn.com')

foreach ($searchPath in @("C:\core", "$env:USERPROFILE\Desktop")) {
    if (Test-Path $searchPath) {
        $envFiles = Get-ChildItem -Path $searchPath -Filter ".env" -Recurse -ErrorAction SilentlyContinue
        foreach ($envFile in $envFiles) {
            $content = Get-Content $envFile.FullName -Raw -ErrorAction SilentlyContinue
            foreach ($email in $attackerEmails) {
                if ($content -match $email) {
                    $findings += Log-Finding "ATTACKER_EMAIL" "CRITICAL" "Attacker email in .env: $email" @{File=$envFile.FullName; Email=$email}
                }
            }
        }
    }
}

# 10. Check Manus Surveillance Domains
Write-Host "`n[*] Scanning for Manus surveillance infrastructure..."
$manusDomains = @('manuspre.computer', 'manus.computer', 'manus-asia.computer', 'manuscomputer.ai', 'manusvm.computer')

if (Test-Path "C:\core") {
    $codeFiles = Get-ChildItem -Path "C:\core" -Include *.js,*.ts,*.py,*.html -Recurse -ErrorAction SilentlyContinue
    foreach ($file in $codeFiles) {
        $content = Get-Content $file.FullName -Raw -ErrorAction SilentlyContinue
        foreach ($domain in $manusDomains) {
            if ($content -match $domain) {
                $findings += Log-Finding "MANUS_SURVEILLANCE" "CRITICAL" "Manus domain: $domain" @{File=$file.FullName; Domain=$domain}
            }
        }
    }
}

# 11. Check Broken System Programs
Write-Host "`n[*] Checking for sabotaged system programs..."
$criticalPrograms = @(
    @{Name="Notepad"; Path="$env:SystemRoot\System32\notepad.exe"},
    @{Name="CMD"; Path="$env:SystemRoot\System32\cmd.exe"},
    @{Name="PowerShell"; Path="$env:SystemRoot\System32\WindowsPowerShell\v1.0\powershell.exe"},
    @{Name="MSEdge"; Path="$env:ProgramFiles(x86)\Microsoft\Edge\Application\msedge.exe"}
)

foreach ($prog in $criticalPrograms) {
    if (Test-Path $prog.Path) {
        $file = Get-Item $prog.Path
        # Check if file is suspiciously small or modified recently
        if ($file.Length -lt 1000) {
            $findings += Log-Finding "SABOTAGED_PROGRAM" "CRITICAL" "$($prog.Name) appears damaged" @{Path=$prog.Path; Size=$file.Length}
        }
    } else {
        $findings += Log-Finding "MISSING_PROGRAM" "HIGH" "$($prog.Name) is missing" @{Path=$prog.Path}
    }
}

# 12. Check for .config hijacking on multiple programs
Write-Host "`n[*] Checking for .config file hijacking..."
$system32 = "$env:SystemRoot\System32"
$configFiles = Get-ChildItem -Path $system32 -Filter "*.exe.config" -ErrorAction SilentlyContinue

foreach ($config in $configFiles) {
    $findings += Log-Finding "CONFIG_HIJACK" "HIGH" "Suspicious .config file: $($config.Name)" @{Path=$config.FullName}
}

# Save Report
Write-Host "`n" + ("=" * 60)
Write-Host "RECONNAISSANCE COMPLETE"
Write-Host "Total findings: $($findings.Count)"

$reportFile = "aegis_recon_report_$timestamp.json"
$findings | ConvertTo-Json -Depth 10 | Out-File $reportFile

Write-Host "Report saved: $reportFile"
Write-Host ("=" * 60)

# Summary
$critical = ($findings | Where-Object { $_.Severity -eq "CRITICAL" }).Count
$high = ($findings | Where-Object { $_.Severity -eq "HIGH" }).Count

if ($critical -gt 0) {
    Write-Host "`n⚠️  CRITICAL THREATS: $critical" -ForegroundColor Red
}
if ($high -gt 0) {
    Write-Host "⚠️  HIGH THREATS: $high" -ForegroundColor Yellow
}

Write-Host "`n[*] Recon complete. Review $reportFile for details."
Write-Host "[*] NO ACTIONS TAKEN - Recon mode only"
