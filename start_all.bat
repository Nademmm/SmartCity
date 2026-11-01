@echo off
title SmartCity - ESP32 Control Console Launcher
cd /d "%~dp0"

echo =====================================================================
echo            SMARTCITY ESP32 CONTROL CONSOLE LAUNCHER
echo =====================================================================
echo.
echo [1/3] Menjalankan Next.js Web Dashboard di Port 3000 (Semua Jaringan)...
start "SmartCity - Next.js Dashboard" cmd /k "npm run dev"

echo.
echo [2/3] Menjalankan AI YOLO11 Traffic Monitor di Port 8088...
start "SmartCity - AI Camera Backend" cmd /k "cd traffic-monitor && if exist .venv\Scripts\python.exe (.venv\Scripts\python.exe main.py) else (python main.py)"

echo.
echo [3/3] Menjalankan Jembatan Serial IoT (ESP32 COM3 ke Web)...
start "SmartCity - IoT Serial Bridge" cmd /k "powershell -NoProfile -ExecutionPolicy Bypass -File firmware\bridge_serial_to_dashboard.ps1"

echo.
echo =====================================================================
echo  Semua service telah dijalankan di jendela terminal terpisah!
echo  - Akses Lokal PC         : http://localhost:3000
echo  - Akses Jaringan Wi-Fi/HP: http://10.218.11.121:3000
echo  - AI Stream Backend      : http://localhost:8088/video_feed
echo =====================================================================
echo.
pause
