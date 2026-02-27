@echo off
echo ====================================
echo  NFC Platform - Quick Start
echo  (Without NFC Reader Hardware)
echo ====================================
echo.

echo Starting MongoDB...
net start MongoDB
timeout /t 2 >nul

echo.
echo Starting Backend (Port 5000)...
start cmd /k "cd backend && npm run dev"
timeout /t 3 >nul

echo.
echo Starting Frontend (Port 3000)...
start cmd /k "cd frontend && npm run dev"
timeout /t 3 >nul

echo.
echo ====================================
echo  Services started successfully!
echo ====================================
echo.
echo  Backend:  http://localhost:5000
echo  Frontend: http://localhost:3000
echo.
echo  The NFC reader is optional and not started.
echo  Register cards manually through the dashboard.
echo.
echo  To use NFC hardware, see: nfc-reader\README.md
echo.
pause
