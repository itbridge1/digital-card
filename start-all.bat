@echo off
echo ====================================
echo  NFC Platform - Full Stack Startup
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
echo Starting NFC Reader (Optional - requires hardware)...
start cmd /k "cd nfc-reader && echo NFC Reader requires ACR1311U-N2 hardware && echo If npm install failed, see nfc-reader\README.md && npm start"

echo.
echo ====================================
echo  All services started!
echo ====================================
echo.
echo  Backend:  http://localhost:5000
echo  Frontend: http://localhost:3000
echo.
echo  Press any key to exit...
pause >nul
