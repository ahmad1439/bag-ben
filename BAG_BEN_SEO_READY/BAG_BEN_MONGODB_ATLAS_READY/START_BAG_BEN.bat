@echo off
title BAG BEN Store
echo Installing/checking dependencies...
call npm install
if errorlevel 1 (
  echo.
  echo npm install failed. Make sure Node.js is installed.
  pause
  exit /b 1
)
echo.
echo Starting BAG BEN...
node server.js
pause
