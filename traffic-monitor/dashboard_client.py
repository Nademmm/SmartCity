import time
import json
import threading
import logging
import requests
import config

logging.basicConfig(level=logging.INFO, format="[%(asctime)s] %(levelname)s: %(message)s")

class DashboardClient:
    """
    Klien Asinkron untuk mengirim data telemetri hasil deteksi YOLO11
    ke Next.js REST API Ingestion Endpoint (/api/iot/telemetry) UrbanPulse.
    Menjalankan background worker thread agar tidak menghambat FPS OpenCV.
    """
    def __init__(self, api_url=config.DASHBOARD_API_URL, interval=config.TELEMETRY_INTERVAL_SEC):
        self.api_url = api_url
        self.interval = interval
        self.enabled = config.ENABLE_DASHBOARD_SYNC
        self.latest_data = None
        self.last_sync_time = 0
        self.sync_status = "READY" if self.enabled else "DISABLED"
        
        self.lock = threading.Lock()
        self.running = False
        self.thread = None

    def start(self):
        if not self.enabled:
            logging.info("Pengiriman telemetri ke Dashboard dinonaktifkan via config.")
            return self

        self.running = True
        self.thread = threading.Thread(target=self._worker_loop, daemon=True)
        self.thread.start()
        logging.info(f"DashboardClient dimulai. Target API: {self.api_url}")
        return self

    def update_telemetry(self, detection_result):
        """
        Menyimpan hasil deteksi terbaru untuk dikirim pada siklus berikutnya.
        """
        if not self.enabled:
            return

        with self.lock:
            self.latest_data = detection_result

    def _worker_loop(self):
        while self.running:
            time.sleep(self.interval)
            
            with self.lock:
                if self.latest_data is None:
                    continue
                data = dict(self.latest_data)

            # Estimasi kecepatan rata-rata & panjang antrean dari kepadatan
            density = data.get("density_percent", 30)
            total = data.get("total_vehicles", 0)
            status_text = data.get("status", "LANCAR")

            if density > 75:
                speed_kmh = 14
                queue_meters = total * 10
            elif density > 45:
                speed_kmh = 32
                queue_meters = total * 7
            else:
                speed_kmh = 52
                queue_meters = total * 3

            # Format JSON Payload sesuai standar Ingestion UrbanPulse Dashboard
            payload = {
                "deviceId": config.DEVICE_ID,
                "type": "traffic",
                "intersectionId": config.INTERSECTION_ID,
                "payload": {
                    "density": density,
                    "vehicleCount": total,
                    "statusText": status_text,
                    "avgSpeedKmh": speed_kmh,
                    "queueLengthMeters": queue_meters,
                    "counts": data.get("counts", {}),
                    "currentLight": "green" if density < 75 else "yellow"
                }
            }

            try:
                response = requests.post(
                    self.api_url,
                    json=payload,
                    headers={"Content-Type": "application/json"},
                    timeout=2.0
                )
                if response.status_code == 200:
                    self.sync_status = "CONNECTED (HTTP 200)"
                    logging.info(f"[POST SUCCESS] Telemetri YOLO11 terkirim ke Dashboard! Vehicle: {total}, Status: {status_text}")
                else:
                    self.sync_status = f"HTTP {response.status_code}"
                    logging.warning(f"[POST FAILED] Response HTTP Code: {response.status_code}")
            except Exception as e:
                self.sync_status = "CONNECT ERROR"
                logging.debug(f"[POST ERROR] Gagal terhubung ke Dashboard API: {e}")

    def get_status(self):
        return self.sync_status

    def stop(self):
        self.running = False
        if self.thread and self.thread.is_alive():
            self.thread.join(timeout=1.0)
