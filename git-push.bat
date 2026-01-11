@echo off
cd /d "%~dp0"
echo.
echo === Git Push ===
echo.
git add .
git commit -m "update"
git push
echo.
echo Done!
pause