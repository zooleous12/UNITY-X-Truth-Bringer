@echo off
cls
echo ============================================
echo  BULK PERMISSION CHANGER - USE WITH CAUTION
echo ============================================
echo.
echo This removes TrustedInstaller and sets you as owner
echo for an ENTIRE DIRECTORY TREE (recursive)
echo.
echo Target: %1
echo.

if "%~1"=="" (
    echo ERROR: No target specified!
    echo.
    echo Usage: BULK_PERMISSION_CHANGE.bat "C:\Path\To\Folder"
    echo.
    pause
    exit /b 1
)

echo [1/4] Taking ownership (recursive)...
takeown /f "%~1" /r /d y >nul 2>&1
if %errorlevel% neq 0 echo     FAILED - Check if path exists

echo [2/4] Granting you Full Control...
icacls "%~1" /grant "%USERNAME%:(OI)(CI)F" /t >nul 2>&1

echo [3/4] Removing TrustedInstaller (if present)...
icacls "%~1" /remove "NT SERVICE\TrustedInstaller" /t >nul 2>&1

echo [4/4] Setting SYSTEM to Read-Only...
icacls "%~1" /grant "SYSTEM:R" /t >nul 2>&1

echo.
echo ============================================
echo  DONE! You now control: %~1
echo ============================================
echo.
echo   Your access:    FULL CONTROL
echo   TrustedInstaller: REMOVED
echo   SYSTEM:         READ-ONLY
echo   Everyone else:  AS BEFORE
echo.
pause
