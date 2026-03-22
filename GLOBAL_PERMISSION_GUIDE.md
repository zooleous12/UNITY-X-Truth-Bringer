# GLOBAL PERMISSION MODIFICATION GUIDE
# For TrustedInstaller, SYSTEM, and Protected Accounts

## ⚠️ DANGER WARNING
Modifying TrustedInstaller/SYSTEM permissions GLOBALLY will:
- BREAK Windows Update
- Prevent system file repairs (SFC /scannow)
- Corrupt the component store
- Make your system UNSUPPORTED by Microsoft

## 🛡️ SAFER ALTERNATIVES (Recommended)

### METHOD 1: Target Specific Directories (What we did)
# Instead of system-wide, target just what you need:

# Example: Take ownership of your entire project folder
# INCLUDING all subdirectories and files
takeown /f "C:\Users\Charles Kendrick\Desktop\New folder" /r /d y
icacls "C:\Users\Charles Kendrick\Desktop\New folder" /grant "$env:USERNAME`:(OI)(CI)F" /t

# Breakdown:
# /r = Recursive (all subdirectories)
# /d y = Default yes to prompts
# /t = Traverse (apply to all)
# (OI) = Object Inherit (files inherit)
# (CI) = Container Inherit (folders inherit)
# F = Full Control

### METHOD 2: Script for Bulk Permission Changes
# Create this as a .bat or .ps1 file:

@echo off
echo Taking ownership of target directories...

:: List your protected directories here
set TARGETS="C:\MyProjects^" "C:\SecureData^" "D:\Development"

for %%D in (%TARGETS%) do (
    echo Processing %%D...
    takeown /f %%D /r /d y >nul 2>&1
    icacls %%D /grant "%USERNAME%`:(OI)(CI)F" /t >nul 2>&1
    icacls %%D /remove "TrustedInstaller" /t >nul 2>&1
    icacls %%D /remove "SYSTEM" /t >nul 2>&1
)

echo Done.

### METHOD 3: Disable TrustedInstaller (ADVANCED - DANGEROUS)
# This disables TI service entirely (NOT RECOMMENDED)

# Check current status
sc query TrustedInstaller

# DISABLE (DANGER!):
# sc config TrustedInstaller start= disabled
# sc stop TrustedInstaller

# RE-ENABLE (If you must):
# sc config TrustedInstaller start= demand
# sc start TrustedInstaller

### METHOD 4: Boot into Recovery (Offline Takeown)
# For files that are locked even from Administrator:

# 1. Boot from Windows Install USB
# 2. Press Shift+F10 for Command Prompt
# 3. Find your Windows drive (might be D: or E:)
# 4. Run:
#    takeown /f D:\Windows\System32\* /r /d y
#    icacls D:\Windows\System32\* /grant "Administrators:F" /t

### METHOD 5: Using PSExec (System-Level Access)
# Download Sysinternals PSExec
# Run commands as actual SYSTEM account:

# psexec -i -s cmd.exe
# Now you ARE TrustedInstaller
# takeown /f "C:\ProtectedPath" /r /d y

### METHOD 6: Change TI Token Permissions (EXPERT ONLY)
# Modify who can control TI service:

# subinacl /service TrustedInstaller /grant=Administrators=F

## 🎯 PRACTICAL BULK SCRIPT FOR YOUR USE CASE

# Save this as: BULK_PERMISSION_CHANGE.ps1

param([string]$TargetPath)

if (-not $TargetPath) {
    Write-Host "Usage: .\BULK_PERMISSION_CHANGE.ps1 'C:\Your\Path'" -ForegroundColor Yellow
    exit
}

Write-Host "🔥 GLOBAL PERMISSION CHANGE FOR: $TargetPath" -ForegroundColor Red
Write-Host "This will remove TrustedInstaller and SYSTEM access..." -ForegroundColor Yellow

# Take ownership (recursive)
Write-Host "`n[1/4] Taking ownership..." -ForegroundColor Cyan
takeown /f "$TargetPath" /r /d y | Out-Null

# Grant yourself full control
Write-Host "[2/4] Granting yourself Full Control..." -ForegroundColor Cyan
icacls "$TargetPath" /grant "$env:USERNAME`:(OI)(CI)F" /t | Out-Null

# Remove TrustedInstaller
Write-Host "[3/4] Removing TrustedInstaller..." -ForegroundColor Cyan
icacls "$TargetPath" /remove "NT SERVICE\TrustedInstaller" /t 2>$null | Out-Null

# Remove SYSTEM (optional - be careful!)
Write-Host "[4/4] Reducing SYSTEM to Read-Only..." -ForegroundColor Cyan
icacls "$TargetPath" /grant "SYSTEM:R" /t | Out-Null

Write-Host "`n✅ Done! You now own: $TargetPath" -ForegroundColor Green
Write-Host "TrustedInstaller: REMOVED" -ForegroundColor Yellow
Write-Host "SYSTEM: Read-Only only" -ForegroundColor Yellow
Write-Host "You: Full Control" -ForegroundColor Green

## 🔒 REVERT CHANGES (Emergency restore)

# If you break something, restore TI access:
# icacls "C:\Path" /grant "NT SERVICE\TrustedInstaller:(OI)(CI)F" /t

## 📊 QUICK REFERENCE: COMMON ACCOUNTS

# User accounts:
# $env:USERNAME = Your current user
# %USERNAME% = Your current user (cmd)
# Everyone = All users
# Users = Standard users group

# System accounts:
# SYSTEM = Windows kernel/system
# NT SERVICE\TrustedInstaller = Component installer (super-root)
# NT AUTHORITY\LOCAL SERVICE = Local service account
# NT AUTHORITY\NETWORK SERVICE = Network service account

# Admin accounts:
# Administrators = Admin group
# $env:COMPUTERNAME\Administrator = Built-in admin

## ⚡ ONE-LINER FOR YOUR ENTIRE USER FOLDER

# WARNING: This affects EVERYTHING in your profile!
# takeown /f "%USERPROFILE%" /r /d y && icacls "%USERPROFILE%" /grant "%USERNAME%:(OI)(CI)F" /t
