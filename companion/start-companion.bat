@echo off
title ELASK - Windows Companion Service
color 0B
echo ========================================================
echo        ELASK WINDOWS COMPANION SERVICE LAUNCHER        
echo ========================================================
echo.
echo Binding to localhost:9123...
echo Security Mode: Whitelist Only (No arbitrary shell execution)
echo.

node -v >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not found on your system!
    echo Please install Node.js (v18 or higher) from https://nodejs.org/
    pause
    exit /b
)

echo Starting ELASK Companion on 127.0.0.1:9123...
node server.js
pause
