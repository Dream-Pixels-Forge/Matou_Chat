@echo off
echo ==========================================
echo Starting Matou Chat Application
echo ==========================================

:: Check if Python is installed
where python >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Python is not installed or not in PATH
    echo Please install Python 3.8+ from https://www.python.org/downloads/
    pause
    exit /b 1
)

:: Check if Node.js is installed
where npm >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Node.js is not installed or not in PATH
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

:: Set paths
set "ROOT=%~dp0"
set "FRONTEND=%ROOT%frontend"
set "BACKEND=%ROOT%backend"

echo Installing backend dependencies...
cd /d "%BACKEND%"
pip install -r requirements.txt
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Failed to install backend dependencies
    pause
    exit /b 1
)

echo Installing frontend dependencies...
cd /d "%FRONTEND%"
if not exist "node_modules" (
    npm install
    if %ERRORLEVEL% NEQ 0 (
        echo ERROR: Failed to install frontend dependencies
        pause
        exit /b 1
    )
)

echo Starting backend server...
cd /d "%BACKEND%"
start "Matou Backend" cmd /k "python -m uvicorn main:app --reload --host 0.0.0.0 --port 8001"

echo Waiting for backend to start...
timeout /t 5 /nobreak >nul

echo Starting frontend server...
cd /d "%FRONTEND%"
start "Matou Frontend" cmd /k "npm run dev"

echo Waiting for frontend to start...
timeout /t 10 /nobreak >nul

echo Opening browser...
start "" "http://localhost:5174"

echo.
echo ==========================================
echo Matou is starting!
echo ==========================================
echo Backend:  http://localhost:8001
echo Frontend: http://localhost:5174
echo.
echo Close the backend and frontend windows to stop the application.
echo Or run 'stop_matou.bat' to stop all services at once.
echo ==========================================

:: Handle Ctrl+C to cleanup
setlocal EnableDelayedExpansion
set "cleanup=false"

:wait_loop
ping 127.0.0.1 -n 2 >nul
if !cleanup!==true goto :cleanup
goto :wait_loop

:cleanup
echo.
echo Cleaning up processes...
taskkill /F /IM python.exe /T >nul 2>&1
taskkill /F /IM node.exe /T >nul 2>&1
echo Cleanup complete.
pause
exit