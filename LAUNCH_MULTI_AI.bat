@echo off
cls
echo ============================================
echo     ?? MULTI-AI LAUNCHER - UNITY ECOSYSTEM
echo ============================================
echo.
echo Select AI Instance to Launch:
echo.
echo [1] Kimi Instance #1 (Primary - Current)
echo [2] Kimi Instance #2 (Secondary)
echo [3] Gemini CLI (Google)
echo [4] ALL THREE (Parallel)
echo [5] Exit
echo.
set /p choice="Choice (1-5): "

if "%choice%"=="1" goto kimi1
if "%choice%"=="2" goto kimi2
if "%choice%"=="3" goto gemini
if "%choice%"=="4" goto all
if "%choice%"=="5" goto end

goto end

:kimi1
echo Launching Kimi #1 (Primary)...
start cmd /k "cd /d %USERPROFILE%\Desktop\New folder && kimi"
goto end

:kimi2
echo Launching Kimi #2 (Secondary)...
start cmd /k "cd /d %USERPROFILE%\Desktop\New folder && kimi"
goto end

:gemini
echo Launching Gemini CLI...
start cmd /k "cd /d %USERPROFILE%\Desktop\New folder && gemini-cli"
goto end

:all
echo Launching ALL AI Instances...
start cmd /k "cd /d %USERPROFILE%\Desktop\New folder && kimi"
timeout /t 2 >nul
start cmd /k "cd /d %USERPROFILE%\Desktop\New folder && kimi"
timeout /t 2 >nul
start cmd /k "cd /d %USERPROFILE%\Desktop\New folder && gemini-cli"
goto end

:end
echo.
echo Done. Press any key to exit...
pause >nul
