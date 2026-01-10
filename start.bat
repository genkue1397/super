@echo off
echo ========================================
echo   SuperSplat Local Server
echo ========================================
echo.

echo [1/3] Checking dependencies...
if not exist "node_modules" (
    echo Installing dependencies...
    call npm install
    if errorlevel 1 (
        echo ERROR: npm install failed
        pause
        exit /b 1
    )
)

echo [2/3] Starting server...
start /B npm run start

echo [3/3] Waiting for server to start...
timeout /t 5 /nobreak >nul

echo Opening browser...
start "" "http://localhost:8080/?lng=ja"

echo.
echo ========================================
echo   Server is running on port 8080
echo   Press Ctrl+C to stop
echo ========================================
pause >nul
