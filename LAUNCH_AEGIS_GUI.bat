@echo off
echo ============================================================
echo    AEGIS DEFENSE - LAUNCHING GUI
echo    "Think like the enemy to defend against the enemy"
echo ============================================================
echo.
echo Starting backend server on port 3009...
echo Frontend will be at: http://localhost:3008
echo.
echo Press buttons to scan for threats!
echo.

cd "c:\Users\Charles Kendrick\Desktop\New folder\REPO\assets\123\unity-extracted\unity-ai-ecosystem\apps\aegis-defense"

start "AEGIS Backend" python server.py

timeout /t 3 /nobreak >nul

echo.
echo Backend started! Now starting frontend...
echo.

start "AEGIS Frontend" npm run dev

timeout /t 5 /nobreak >nul

echo.
echo Opening browser...
start http://localhost:3008

echo.
echo ============================================================
echo AEGIS DEFENSE IS ONLINE
echo ============================================================
echo.
echo Available Scans:
echo   - PNG Malware Scanner (steganography detection)
echo   - Data Exfiltration Scanner
echo   - Process Scanner (hidden processes)
echo   - Network Scanner (suspicious connections)
echo   - Registry Scanner (malware persistence)
echo   - Task Scanner (scheduled task malware)
echo   - Entropy Scanner (encrypted/packed files)
echo   - FULL SYSTEM SCAN (all of the above)
echo.
echo Press any key to keep windows open...
pause >nul
