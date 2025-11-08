@echo off
echo ==========================================
echo Stopping Matou Chat Application
echo ==========================================

echo Stopping backend server (Python/Uvicorn)...
taskkill /F /IM python.exe /T >nul 2>&1
taskkill /F /IM uvicorn.exe /T >nul 2>&1

echo Stopping frontend server (Node.js/Vite)...
taskkill /F /IM node.exe /T >nul 2>&1

echo Stopping any remaining Matou processes...
for /f "tokens=2" %%i in ('tasklist /FI "WINDOWTITLE eq Matou*" /FO CSV ^| find /V "INFO"') do (
    taskkill /F /PID %%i >nul 2>&1
)

echo Cleaning up temporary files...
if exist "%TEMP%\matou_launcher.vbs" del "%TEMP%\matou_launcher.vbs" >nul 2>&1

echo.
echo ==========================================
echo Matou has been stopped successfully!
echo All related processes have been terminated.
echo ==========================================
pause