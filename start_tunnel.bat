@echo off
title SmartCity - Cloudflare Public Internet Tunnel
cd /d "%~dp0"

echo =====================================================================
echo          SMARTCITY ESP32: CLOUDFLARE PUBLIC TUNNEL
echo =====================================================================
echo.
echo Mengaktifkan tunnel publik untuk port 3000...
echo.
npm run tunnel

pause
