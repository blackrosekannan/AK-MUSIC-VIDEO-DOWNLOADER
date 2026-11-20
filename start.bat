@echo off
cd /d "%~dp0"
title AK MUSIC & VIDEO DOWNLOADER
where node >nul 2>nul
if errorlevel 1 (
  echo [FAIL] Node.js not found. Install Node.js 22.13 or newer.
  pause
  exit /b 1
)
node doctor.js
if errorlevel 1 (
  echo.
  echo System check failed. Fix the [FAIL] item(s) above and try again.
  pause
  exit /b 1
)
echo.
echo Starting AK MUSIC & VIDEO DOWNLOADER...
node server.js
if errorlevel 1 pause
