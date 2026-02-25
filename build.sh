#!/bin/bash

# Build script for BoongAI Facebook Assistant

MODE=${1:-production}

echo "Building BoongAI Facebook Assistant ($MODE)..."

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
  echo "Installing dependencies..."
  npm install
fi

# Run TypeScript compilation and webpack bundling
echo "Compiling TypeScript and bundling..."
npx webpack --mode "$MODE"

# Check if build was successful
if [ $? -eq 0 ]; then
  echo "Build completed successfully!"
  echo "Extension files are in the dist/ directory."
  echo "Load the extension in Chrome: chrome://extensions → Load unpacked → select dist/"
else
  echo "Build failed. Please check the errors above."
  exit 1
fi
