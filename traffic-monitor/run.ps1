# UrbanPulse - YOLO11 Traffic Monitor Launcher
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host " UrbanPulse - Menjalankan AI Traffic Monitor (Webcam)" -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Cyan

if (Test-Path ".\.venv\Scripts\python.exe") {
    & ".\.venv\Scripts\python.exe" main.py
} else {
    python main.py
}
