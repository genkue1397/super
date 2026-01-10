#!/bin/bash

echo "========================================"
echo "  SuperSplat Local Server"
echo "========================================"
echo ""

echo "[1/3] Checking dependencies..."
if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    npm install
    if [ $? -ne 0 ]; then
        echo "ERROR: npm install failed"
        exit 1
    fi
fi

echo "[2/3] Starting server..."
npm run start &

echo "[3/3] Waiting for server to start..."
sleep 5

echo "Opening browser..."
if command -v xdg-open &> /dev/null; then
    xdg-open "http://localhost:8080/?lng=ja"
elif command -v open &> /dev/null; then
    open "http://localhost:8080/?lng=ja"
fi

echo ""
echo "========================================"
echo "  Server is running on port 8080"
echo "  Press Ctrl+C to stop"
echo "========================================"
wait
