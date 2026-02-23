#!/bin/bash

# Build script for BoongAI Facebook Assistant

echo "Building BoongAI Facebook Assistant..."

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
  echo "Installing dependencies..."
  npm install
fi

# Run TypeScript compilation and webpack bundling
echo "Compiling TypeScript and bundling..."
npm run build

# Check if build was successful
if [ $? -eq 0 ]; then
  echo "Build completed successfully!"
  echo "Load the extension in Chrome from this directory."
else
  echo "Build failed. Please check the errors above."
  exit 1
fi
