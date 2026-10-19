@echo off
title UrbanPulse - Cloudflare Public Internet Tunnel
cd /d "%~dp0"

echo =====================================================================
echo         URBANPULSE SMART CITY: CLOUDFLARE PUBLIC TUNNEL
echo =====================================================================
echo.
echo Mengaktifkan tunnel publik untuk port 3000...
echo.
npm run tunnel

pause
