@echo off
title UrbanPulse - Smart City Launcher
cd /d "%~dp0"

echo =====================================================================
echo           URBANPULSE SMART CITY COMMAND CENTER LAUNCHER
echo =====================================================================
echo.
echo [1/2] Menjalankan Next.js Web Dashboard di Port 3000...
start "UrbanPulse - Next.js Dashboard" cmd /k "npm run dev"

echo.
echo [2/2] Menjalankan AI YOLO11 Traffic Monitor di Port 8088...
start "UrbanPulse - AI Camera Backend" cmd /k "cd traffic-monitor && if exist .venv\Scripts\python.exe (.venv\Scripts\python.exe main.py) else (python main.py)"

echo.
echo =====================================================================
echo  Kedua server telah dijalankan di jendela terminal terpisah!
echo  - Frontend Dashboard : http://localhost:3000
echo  - AI Stream Backend  : http://localhost:8088/video_feed
echo =====================================================================
echo.
pause
