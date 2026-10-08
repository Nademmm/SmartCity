@echo off
title UrbanPulse - YOLO11 Traffic Monitor (Webcam)
cd /d "%~dp0"

echo ========================================================
echo  UrbanPulse - Menjalankan AI Traffic Monitor (Webcam)
echo ========================================================
echo.

if exist .venv\Scripts\python.exe (
    .venv\Scripts\python.exe main.py
) else (
    python main.py
)

pause
