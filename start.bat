@echo off
echo ========================================
echo   Malaysia Ez Rent - Starting...
echo ========================================
echo.

echo [1/2] Starting Backend (FastAPI)...
start "EzRent Backend" cmd /k "cd /d %~dp0backend && C:\Users\Administrator\anaconda3\python.exe run.py"

echo [2/2] Starting Frontend (Next.js)...
start "EzRent Frontend" cmd /k "cd /d %~dp0frontend && npx next dev --webpack -p 3000"

echo.
echo Both windows opened!
echo   Frontend: http://localhost:3000
echo   Backend:  http://localhost:8000
echo.
pause
