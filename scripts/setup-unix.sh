#!/bin/bash
# CineCritique AI - Unix/Linux/Mac Setup Script

set -e

echo "=== CineCritique AI - Setup ==="
echo ""

# Check Python
echo "Checking Python installation..."
if ! command -v python3 &> /dev/null; then
    echo "ERROR: Python 3 not found!"
    echo "Please install Python 3.12+"
    exit 1
fi
PYTHON_VERSION=$(python3 --version)
echo "Found: $PYTHON_VERSION"

# Check Node.js
echo "Checking Node.js installation..."
if ! command -v node &> /dev/null; then
    echo "ERROR: Node.js not found!"
    echo "Please install Node.js from https://nodejs.org/"
    exit 1
fi
NODE_VERSION=$(node --version)
echo "Found Node.js $NODE_VERSION"

# Check FFmpeg
echo "Checking FFmpeg installation..."
if ! command -v ffmpeg &> /dev/null; then
    echo "WARNING: FFmpeg not found!"
    echo "FFmpeg is required for video processing."
    echo "Install: sudo apt-get install ffmpeg (Ubuntu/Debian)"
    echo "        brew install ffmpeg (macOS)"
    echo ""
else
    echo "Found FFmpeg"
fi

# Create .env file
if [ ! -f ".env.local" ]; then
    echo "Creating .env.local file..."
    cp .env.example .env.local
    echo "Please edit .env.local and add your GEMINI_API_KEY"
    echo ""
fi

# Install Node.js dependencies
echo "Installing Node.js dependencies..."
npm install

# Install Python dependencies
echo "Installing Python backend dependencies..."
cd backend
python3 -m pip install --upgrade pip
pip3 install -r requirements.txt
cd ..

# Create directories
echo "Creating directories..."
mkdir -p backend/.cache
mkdir -p backend/.logs
mkdir -p backend/models

echo ""
echo "=== Setup Complete! ==="
echo ""
echo "Next steps:"
echo "1. Edit .env.local and add your GEMINI_API_KEY"
echo "2. (Optional) Download a local LLM model to backend/models/"
echo "3. Start the development server:"
echo "   npm run dev:all"
echo ""
echo "Or start frontend and backend separately:"
echo "   npm run dev          (frontend only)"
echo "   npm run dev:backend  (backend only)"
echo ""

chmod +x scripts/setup-unix.sh
