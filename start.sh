#!/bin/bash
echo "Installing dependencies..."
npm install

echo "Starting local server on port 8080..."
# Attempt to open browser
if which xdg-open > /dev/null
then
  xdg-open "http://localhost:8080"
elif which open > /dev/null
then
  open "http://localhost:8080"
fi

npm run start
