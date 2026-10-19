# ==========================================================
# URBANPULSE - SCRIPT UPLOAD FIRMWARE KE ESP32 (COM3)
# ==========================================================
$ErrorActionPreference = "Stop"
Write-Host "Mengunggah firmware MicroPython ke ESP32..." -ForegroundColor Cyan

python "$PSScriptRoot\..\safe_uploader.py"
