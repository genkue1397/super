@echo off
cd /d "%~dp0"
if not exist node_modules (
    echo Installing dependencies...
    npm install
)
echo Starting server...
timeout /t 3 /nobreak >nul
start http://localhost:3000/?lng=ja
npm run develop
pause
