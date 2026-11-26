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
YOLO_IMGSZ = int(os.getenv("YOLO_IMGSZ", "640")) # 640px agar deretan 6+ mobil HotWheels kecil terdeteksi akurat oleh YOLO11

# ==============================================================
# 2. Konfigurasi YOLO11 Model & Filter Khusus Kendaraan (HotWheels / Diecast)
# ==============================================================
MODEL_PATH = os.getenv("MODEL_PATH", "yolo11n.pt")

# Confidence threshold 0.26 (Akurat, cerdas, tidak mendeteksi barang acak/meja/buku/HP)
CONFIDENCE_THRESHOLD = float(os.getenv("CONFIDENCE_THRESHOLD", "0.26"))
IOU_THRESHOLD = float(os.getenv("IOU_THRESHOLD", "0.45"))

# Agnostic NMS: satu objek tidak bisa punya 2 bbox dari kelas berbeda → tracking lebih stabil
AGNOSTIC_NMS = os.getenv("AGNOSTIC_NMS", "true").lower() == "true"

# Augmented inference: jalankan multi-scale TTA (Test Time Augmentation) untuk tangkap objek kecil
AUGMENT_INFERENCE = os.getenv("AUGMENT_INFERENCE", "false").lower() == "true"

# Mode Filter Deteksi Objek:
# Set DETECT_ANY_OBJECT = False agar HANYA mendeteksi kendaraan (Mobil, Truk, Bus, Motor, Sepeda)
DETECT_ANY_OBJECT = False

# COCO class IDs yang dinormalisasi menjadi Mobil (HotWheels / Diecast):
# 2: car, 5: bus, 7: truck (semua dihitung sebagai Mobil miniatur)
TARGET_CLASSES = [2, 5, 7]
EXCLUDE_CLASSES = [0, 1, 3] # Tolak person, bicycle, motorcycle

CLASS_NAMES = {
    2: "Mobil",
    5: "Mobil",
    7: "Mobil"
}

# ==============================================================
# 3. Threshold Logika Bisnis Klasifikasi Kemacetan (Khusus Mobil di Kamera)
# 0 - 2 Mobil = LANCAR | 3 - 5 Mobil = PADAT | >= 6 Mobil = MACET TOTAL
# ==============================================================
THRESHOLD_LANCAR = int(os.getenv("THRESHOLD_LANCAR", "3"))
THRESHOLD_MACET = int(os.getenv("THRESHOLD_MACET", "6"))

# ==============================================================
# 4. Integrasi Dashboard Next.js (SMARTCITY Command Center)
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
SHOW_GUI_WINDOW = os.getenv("SHOW_GUI_WINDOW", "false").lower() == "true"

