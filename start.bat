@echo off
echo Installing dependencies...
call npm install

echo Starting local server on port 8080...
start "" "http://localhost:8080"
npm run start
