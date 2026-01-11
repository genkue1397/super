#!/bin/bash
cd "$(dirname "$0")"
if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    npm install
fi
echo "Starting server..."
sleep 3
if command -v xdg-open &> /dev/null; then
    xdg-open "http://localhost:3000/?lng=ja"
elif command -v open &> /dev/null; then
    open "http://localhost:3000/?lng=ja"
fi
npm run develop
