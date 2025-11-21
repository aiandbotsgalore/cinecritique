# CineCritique AI - Windows 11 Setup Script
# Run with: PowerShell -ExecutionPolicy Bypass -File setup-windows.ps1

Write-Host "=== CineCritique AI - Windows 11 Setup ===" -ForegroundColor Cyan
Write-Host ""

# Check if Python is installed
Write-Host "Checking Python installation..." -ForegroundColor Yellow
$pythonVersion = python --version 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Python not found!" -ForegroundColor Red
    Write-Host "Please install Python 3.12 from https://www.python.org/downloads/" -ForegroundColor Red
    exit 1
}
Write-Host "Found: $pythonVersion" -ForegroundColor Green

# Check if Node.js is installed
Write-Host "Checking Node.js installation..." -ForegroundColor Yellow
$nodeVersion = node --version 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Node.js not found!" -ForegroundColor Red
    Write-Host "Please install Node.js from https://nodejs.org/" -ForegroundColor Red
    exit 1
}
Write-Host "Found Node.js $nodeVersion" -ForegroundColor Green

# Check if FFmpeg is installed
Write-Host "Checking FFmpeg installation..." -ForegroundColor Yellow
$ffmpegVersion = ffmpeg -version 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "WARNING: FFmpeg not found!" -ForegroundColor Yellow
    Write-Host "FFmpeg is required for video processing." -ForegroundColor Yellow
    Write-Host "Install from: https://www.ffmpeg.org/download.html" -ForegroundColor Yellow
    Write-Host "Or use Chocolatey: choco install ffmpeg" -ForegroundColor Yellow
    Write-Host ""
} else {
    Write-Host "Found FFmpeg" -ForegroundColor Green
}

# Create .env file if it doesn't exist
if (-Not (Test-Path ".env.local")) {
    Write-Host "Creating .env.local file..." -ForegroundColor Yellow
    Copy-Item ".env.example" ".env.local"
    Write-Host "Please edit .env.local and add your GEMINI_API_KEY" -ForegroundColor Yellow
    Write-Host ""
}

# Install Node.js dependencies
Write-Host "Installing Node.js dependencies..." -ForegroundColor Yellow
npm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: npm install failed!" -ForegroundColor Red
    exit 1
}
Write-Host "Node.js dependencies installed!" -ForegroundColor Green

# Install Python dependencies
Write-Host "Installing Python backend dependencies..." -ForegroundColor Yellow
Set-Location backend
python -m pip install --upgrade pip
pip install -r requirements.txt
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: pip install failed!" -ForegroundColor Red
    Set-Location ..
    exit 1
}
Set-Location ..
Write-Host "Python dependencies installed!" -ForegroundColor Green

# Create necessary directories
Write-Host "Creating directories..." -ForegroundColor Yellow
New-Item -ItemType Directory -Force -Path "backend/.cache" | Out-Null
New-Item -ItemType Directory -Force -Path "backend/.logs" | Out-Null
New-Item -ItemType Directory -Force -Path "backend/models" | Out-Null
Write-Host "Directories created!" -ForegroundColor Green

Write-Host ""
Write-Host "=== Setup Complete! ===" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. Edit .env.local and add your GEMINI_API_KEY" -ForegroundColor White
Write-Host "2. (Optional) Download a local LLM model to backend/models/" -ForegroundColor White
Write-Host "3. Start the development server:" -ForegroundColor White
Write-Host "   npm run dev:all" -ForegroundColor Yellow
Write-Host ""
Write-Host "Or start frontend and backend separately:" -ForegroundColor White
Write-Host "   npm run dev          (frontend only)" -ForegroundColor Yellow
Write-Host "   npm run dev:backend  (backend only)" -ForegroundColor Yellow
Write-Host ""
