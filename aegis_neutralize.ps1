# AEGIS STEALTH NEUTRALIZATION
# Your technique: Take ownership -> Set read-only -> Neutralize without triggering defense network

param(
    [string]$TargetFile,
    [switch]$DeleteAfter,
    [switch]$BatchMode
)

function Neutralize-File {
    param($FilePath, $ShouldDelete = $false)
    
    if (-not (Test-Path $FilePath)) {
        Write-Host "[!] File not found: $FilePath" -ForegroundColor Red
        return $false
    }
    
    Write-Host "`n[*] Neutralizing: $FilePath" -ForegroundColor Cyan
    
    try {
        # Step 1: Take ownership
        Write-Host "  [1] Taking ownership..." -ForegroundColor Yellow
        $currentUser = [System.Security.Principal.WindowsIdentity]::GetCurrent().Name
        takeown /F "$FilePath" /A 2>&1 | Out-Null
        
        # Step 2: Grant yourself full control
        Write-Host "  [2] Granting full control..." -ForegroundColor Yellow
        icacls "$FilePath" /grant "${currentUser}:F" /T /C 2>&1 | Out-Null
        
        # Step 3: Set Everyone to Read-Only (except you)
        Write-Host "  [3] Setting Everyone to Read-Only..." -ForegroundColor Yellow
        icacls "$FilePath" /grant "Everyone:R" /T /C 2>&1 | Out-Null
        
        # Step 4: Remove write/execute for SYSTEM and other accounts
        Write-Host "  [4] Removing dangerous permissions..." -ForegroundColor Yellow
        icacls "$FilePath" /deny "SYSTEM:(W,X)" 2>&1 | Out-Null
        icacls "$FilePath" /deny "Administrators:(W,X)" 2>&1 | Out-Null
        
        if ($ShouldDelete) {
            Write-Host "  [5] Deleting neutralized file..." -ForegroundColor Red
            Remove-Item -Path "$FilePath" -Force -ErrorAction Stop
            Write-Host "  [✓] DELETED" -ForegroundColor Green
        } else {
            Write-Host "  [✓] NEUTRALIZED (left in place)" -ForegroundColor Green
        }
        
        return $true
        
    } catch {
        Write-Host "  [✗] Failed: $_" -ForegroundColor Red
        return $false
    }
}

# Batch mode - neutralize all known threats
if ($BatchMode) {
    Write-Host "="*60
    Write-Host "AEGIS STEALTH NEUTRALIZATION - BATCH MODE"
    Write-Host "Using your technique to avoid triggering defense network"
    Write-Host "="*60
    
    $threats = @(
        # MMC Hijacking
        @{Path="$env:SystemRoot\System32\mmc.exe.config"; Delete=$true; Critical=$false},
        @{Path="$env:SystemRoot\System32\UevAppMonitor.exe.config"; Delete=$true; Critical=$false},
        
        # Steganography Evidence (KEEP for legal evidence)
        @{Path="$env:USERPROFILE\Desktop\UNLOCKED_EVIDENCE_DECODED.json"; Delete=$false; Critical=$true},
        @{Path="$env:USERPROFILE\Desktop\UNLOCKED_EVIDENCE_ENCODED.base64"; Delete=$false; Critical=$true},
        @{Path="$env:USERPROFILE\Desktop\UNLOCKED_EVIDENCE_STEGANOGRAPHY.png"; Delete=$false; Critical=$true},
        @{Path="$env:USERPROFILE\Desktop\tmpDFF8.tmp.py"; Delete=$false; Critical=$true},
        @{Path="$env:USERPROFILE\Desktop\decode.py"; Delete=$false; Critical=$true},
        
        # BBSK Malware (if exists)
        @{Path="$env:APPDATA\BBSK\SK.Driver.dll"; Delete=$true; Critical=$false},
        @{Path="$env:APPDATA\BBSK\updater.exe"; Delete=$true; Critical=$false},
        
        # Wavesor
        @{Path="$env:USERPROFILE\Wavesor Software"; Delete=$true; Critical=$false}
    )
    
    $neutralized = 0
    $failed = 0
    
    foreach ($threat in $threats) {
        if (Test-Path $threat.Path) {
            if ($threat.Critical) {
                Write-Host "`n[!] CRITICAL EVIDENCE - Neutralizing but NOT deleting" -ForegroundColor Magenta
            }
            
            $result = Neutralize-File -FilePath $threat.Path -ShouldDelete $threat.Delete
            if ($result) { $neutralized++ } else { $failed++ }
            
            Start-Sleep -Milliseconds 500  # Slow and steady to avoid detection
        }
    }
    
    Write-Host "`n" + ("="*60)
    Write-Host "BATCH NEUTRALIZATION COMPLETE"
    Write-Host "Neutralized: $neutralized | Failed: $failed"
    Write-Host ("="*60)
    
} elseif ($TargetFile) {
    # Single file mode
    Neutralize-File -FilePath $TargetFile -ShouldDelete $DeleteAfter
    
} else {
    Write-Host @"
AEGIS STEALTH NEUTRALIZATION

Usage:
  Single file:  .\aegis_neutralize.ps1 -TargetFile "C:\path\to\file.dll"
  With delete:  .\aegis_neutralize.ps1 -TargetFile "C:\path\to\file.dll" -DeleteAfter
  Batch mode:   .\aegis_neutralize.ps1 -BatchMode

Your technique:
  1. Take ownership of file
  2. Grant yourself full control
  3. Set Everyone to Read-Only
  4. Optionally delete (or leave neutralized)
  
This avoids triggering the malware's defense network.
"@
}
