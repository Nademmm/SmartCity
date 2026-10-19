@echo off
title UrbanPulse - Jembatan Kontrol IoT & Dashboard Jaringan
cd /d "%~dp0"

echo =====================================================================
echo       URBANPULSE SMART CITY: JEMBATAN SERIAL KE DASHBOARD JARINGAN
echo =====================================================================
echo.
echo IP Komputer Anda di Jaringan Wi-Fi:
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /c:"IPv4 Address" /c:"Alamat IPv4"') do (
    echo  -> http:%%a:3000 (Buka alamat ini dari HP atau Laptop lain)
)
echo.
echo Menghubungkan Serial ESP32 (COM3) ke http://localhost:3000...
echo.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0firmware\bridge_serial_to_dashboard.ps1"

pause
