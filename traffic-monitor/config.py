import os
from dotenv import load_dotenv

# Load environment variables dari file .env jika ada
load_dotenv()

def parse_camera_source(source_str: str):
    """
    Mengonversi string sumber kamera menjadi integer jika merupakan indeks webcam (misal '0' -> 0),
    atau mengembalikan string URL/file path jika bukan integer.
    """
    source_str = source_str.strip()
    if source_str.isdigit():
        return int(source_str)
    return source_str

# ==============================================================
# 1. Konfigurasi Input Kamera / Video Stream
# ==============================================================
RAW_CAMERA_SOURCE = os.getenv("CAMERA_SOURCE", "0")
CAMERA_SOURCE = parse_camera_source(RAW_CAMERA_SOURCE)

# Optimasi FPS & Latency (Downscaling Frame Input & YOLO Inference Resolution)
INPUT_RESIZE_WIDTH = int(os.getenv("INPUT_RESIZE_WIDTH", "640"))
YOLO_IMGSZ = int(os.getenv("YOLO_IMGSZ", "320")) # 320px membuat inferensi CPU 4x lebih cepat

# ==============================================================
# 2. Konfigurasi YOLO11 Model & Filter Khusus Kendaraan (HotWheels / Diecast)
# ==============================================================
MODEL_PATH = os.getenv("MODEL_PATH", "yolo11n.pt")

# Confidence threshold 0.15 lebih sensitif untuk deteksi kendaraan miniatur kecil (HotWheels/diecast)
# Naikan ke 0.22-0.30 jika terlalu banyak false positive
CONFIDENCE_THRESHOLD = float(os.getenv("CONFIDENCE_THRESHOLD", "0.15"))
IOU_THRESHOLD = float(os.getenv("IOU_THRESHOLD", "0.45"))

# Agnostic NMS: satu objek tidak bisa punya 2 bbox dari kelas berbeda → tracking lebih stabil
AGNOSTIC_NMS = os.getenv("AGNOSTIC_NMS", "true").lower() == "true"

# Augmented inference: jalankan multi-scale TTA (Test Time Augmentation) untuk tangkap objek kecil
# PERINGATAN: augment=True memperlambat ~2x, aktifkan hanya jika butuh akurasi lebih pada miniatur
AUGMENT_INFERENCE = os.getenv("AUGMENT_INFERENCE", "false").lower() == "true"

# Mode Filter Deteksi Objek:
# Set DETECT_ANY_OBJECT = True agar bisa mendeteksi berbagai item/objek nyata di miniatur (orang, mobil, hp, botol, dll)
DETECT_ANY_OBJECT = os.getenv("DETECT_ANY_OBJECT", "true").lower() == "true"

# COCO class IDs:
TARGET_CLASSES = [0, 1, 2, 3, 5, 7, 9, 11, 39, 41, 63, 67, 73]
EXCLUDE_CLASSES = []

CLASS_NAMES = {
    0: "Person",
    1: "Bicycle",
    2: "Car",
    3: "Motorcycle",
    5: "Bus",
    7: "Truck",
    9: "Traffic Light",
    11: "Stop Sign",
    39: "Bottle",
    41: "Cup",
    63: "Laptop",
    67: "Cell Phone",
    73: "Book"
}

# ==============================================================
# 3. Threshold Logika Bisnis Klasifikasi Kemacetan
# ==============================================================
THRESHOLD_LANCAR = int(os.getenv("THRESHOLD_LANCAR", "5"))
THRESHOLD_MACET = int(os.getenv("THRESHOLD_MACET", "10"))

# ==============================================================
# 4. Integrasi Dashboard Next.js (UrbanPulse Command Center)
# ==============================================================
ENABLE_DASHBOARD_SYNC = os.getenv("ENABLE_DASHBOARD_SYNC", "true").lower() == "true"
DASHBOARD_API_URL = os.getenv("DASHBOARD_API_URL", "http://localhost:3000/api/iot/telemetry")
DEVICE_ID = os.getenv("DEVICE_ID", "YOLO-CV-TRAFFIC-01")
INTERSECTION_ID = os.getenv("INTERSECTION_ID", "TRF-01")
TELEMETRY_INTERVAL_SEC = float(os.getenv("TELEMETRY_INTERVAL_SEC", "1.5"))

# ==============================================================
# 5. Live MJPEG Web Stream Server untuk Visualisasi Dashboard
# ==============================================================
ENABLE_STREAM_SERVER = os.getenv("ENABLE_STREAM_SERVER", "true").lower() == "true"
STREAM_SERVER_PORT = int(os.getenv("STREAM_SERVER_PORT", "8088"))
