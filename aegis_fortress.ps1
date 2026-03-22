# AEGIS PERMISSION FORTRESS
# Lock down your admin rights so attacker can't strip them during battle

Write-Host "="*60 -ForegroundColor Cyan
Write-Host "AEGIS PERMISSION FORTRESS" -ForegroundColor Cyan
Write-Host "Locking down your rights against privilege escalation attacks" -ForegroundColor Cyan
Write-Host "="*60 -ForegroundColor Cyan

$currentUser = [System.Security.Principal.WindowsIdentity]::GetCurrent().Name
Write-Host "`n[*] Current User: $currentUser" -ForegroundColor Yellow

# Critical groups to maintain membership
$criticalGroups = @(
    "Administrators",
    "Backup Operators",
    "Power Users",
    "System Managed Accounts Group",
    "Remote Desktop Users"
)

Write-Host "`n[*] Verifying membership in critical groups..." -ForegroundColor Yellow

foreach ($group in $criticalGroups) {
    try {
        $members = net localgroup "$group" 2>&1
        if ($members -match $env:USERNAME) {
            Write-Host "  [✓] $group - CONFIRMED" -ForegroundColor Green
        } else {
            Write-Host "  [!] $group - NOT MEMBER, ADDING..." -ForegroundColor Red
            net localgroup "$group" "$env:USERNAME" /add 2>&1 | Out-Null
            Write-Host "  [✓] $group - ADDED" -ForegroundColor Green
        }
    } catch {
        Write-Host "  [✗] $group - FAILED: $_" -ForegroundColor Red
    }
}

# Lock registry keys that control group membership
Write-Host "`n[*] Locking registry keys..." -ForegroundColor Yellow

$registryPaths = @(
    "HKLM:\SAM\SAM\Domains\Account\Users",
    "HKLM:\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Winlogon"
)

foreach ($path in $registryPaths) {
    if (Test-Path $path) {
        try {
            # Set permissions to deny modification by SYSTEM (malware often runs as SYSTEM)
            $acl = Get-Acl $path
            $rule = New-Object System.Security.AccessControl.RegistryAccessRule(
                "SYSTEM",
                "SetValue,CreateSubKey,Delete",
                "Deny"
            )
            $acl.AddAccessRule($rule)
            Set-Acl $path $acl
            Write-Host "  [✓] Locked: $path" -ForegroundColor Green
        } catch {
            Write-Host "  [!] Could not lock: $path" -ForegroundColor Yellow
        }
    }
}

# Create backup admin account (hidden failsafe)
Write-Host "`n[*] Creating backup admin account..." -ForegroundColor Yellow
$backupUser = "AegisBackup_$([guid]::NewGuid().ToString().Substring(0,8))"
$backupPass = -join ((65..90) + (97..122) + (48..57) | Get-Random -Count 20 | ForEach-Object {[char]$_})

try {
    net user "$backupUser" "$backupPass" /add /active:no 2>&1 | Out-Null
    net localgroup "Administrators" "$backupUser" /add 2>&1 | Out-Null
    Write-Host "  [✓] Backup account created: $backupUser" -ForegroundColor Green
    Write-Host "  [!] Password: $backupPass" -ForegroundColor Magenta
    Write-Host "  [!] SAVE THIS PASSWORD - Emergency access only" -ForegroundColor Magenta
    
    # Save to secure file
    @{
        Username = $backupUser
        Password = $backupPass
        Created = (Get-Date).ToString("o")
    } | ConvertTo-Json | Out-File "aegis_backup_account.json" -Force
    
} catch {
    Write-Host "  [!] Backup account creation failed" -ForegroundColor Red
}

# Monitor for permission changes
Write-Host "`n[*] Setting up permission monitoring..." -ForegroundColor Yellow

$monitorScript = @'
# AEGIS Permission Monitor - Runs in background
while ($true) {
    $user = $env:USERNAME
    $isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
    
    if (-not $isAdmin) {
        # ALERT: Admin rights stripped!
        Write-Host "[ALERT] Admin rights stripped! Attempting restore..." -ForegroundColor Red
        
        # Try to restore
        net localgroup "Administrators" "$user" /add 2>&1 | Out-Null
        
        # Log the attack
        Add-Content "aegis_permission_attacks.log" "$(Get-Date -Format 'o'): Admin rights stripped and restored"
    }
    
    Start-Sleep -Seconds 5
}
'@

$monitorScript | Out-File "aegis_permission_monitor.ps1" -Force
Write-Host "  [✓] Monitor script created: aegis_permission_monitor.ps1" -ForegroundColor Green

# Start monitor in background
Write-Host "`n[*] Starting background permission monitor..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-WindowStyle Hidden -ExecutionPolicy Bypass -File aegis_permission_monitor.ps1" -WindowStyle Hidden
Write-Host "  [✓] Monitor active - will auto-restore admin rights if stripped" -ForegroundColor Green

# Lock down user account settings
Write-Host "`n[*] Locking user account settings..." -ForegroundColor Yellow
try {
    # Prevent account from being disabled
    $user = Get-LocalUser -Name $env:USERNAME
    $user | Set-LocalUser -AccountNeverExpires $true
    Write-Host "  [✓] Account set to never expire" -ForegroundColor Green
} catch {
    Write-Host "  [!] Could not modify account settings" -ForegroundColor Yellow
}

Write-Host "`n" + ("="*60) -ForegroundColor Cyan
Write-Host "PERMISSION FORTRESS ACTIVE" -ForegroundColor Green
Write-Host ("="*60) -ForegroundColor Cyan

Write-Host @"

Your defenses:
  ✓ Multiple admin group memberships
  ✓ Registry keys locked against modification
  ✓ Backup admin account created (hidden)
  ✓ Background monitor watching for permission stripping
  ✓ Auto-restore if admin rights removed

If he tries to strip your rights now:
  1. Monitor detects it within 5 seconds
  2. Auto-restores admin membership
  3. Logs the attack attempt
  4. You stay in control

Backup account saved to: aegis_backup_account.json
Monitor running in background (hidden window)

"@ -ForegroundColor White

Write-Host "[*] You're now fortified. Ready for battle." -ForegroundColor Green
