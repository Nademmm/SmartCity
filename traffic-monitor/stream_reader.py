import cv2
import time
import threading
import logging

logging.basicConfig(level=logging.INFO, format="[%(asctime)s] %(levelname)s: %(message)s")

class ThreadedCamera:
    """
    Threaded VideoCapture ultra-low-latency untuk mengambil frame terbaru secara real-time.
    Membuang (flush) buffer lama secara agresif agar tidak ada akumulasi delay/lag pada IP Webcam / ESP32-CAM.
    """
    def __init__(self, src, reconnect_interval=3.0):
        self.src = src
        self.reconnect_interval = reconnect_interval
        self.cap = cv2.VideoCapture(self.src)
        
        # Minimalkan buffer internal OpenCV ke 1 frame
        if isinstance(self.src, str) and ("http" in self.src or "rtsp" in self.src):
            self.cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)

        self.grabbed, self.frame = self.cap.read()
        self.started = False
        self.read_lock = threading.Lock()
        self.thread = None

    def start(self):
        if self.started:
            logging.warning("ThreadedCamera sudah berjalan.")
            return self
        
        self.started = True
        self.thread = threading.Thread(target=self.update, args=(), daemon=True)
        self.thread.start()
        logging.info(f"ThreadedCamera (Zero-Latency) dimulai pada: {self.src}")
        return self

    def update(self):
        while self.started:
            if not self.cap.isOpened():
                logging.warning(f"Kamera/Stream terputus ({self.src}). Mencoba reconnect...")
                time.sleep(self.reconnect_interval)
                self.cap.release()
                self.cap = cv2.VideoCapture(self.src)
                if isinstance(self.src, str) and ("http" in self.src or "rtsp" in self.src):
                    self.cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)
                continue

            # Flush buffer: Hanya ambil frame terbaru
            grabbed = self.cap.grab()
            if not grabbed:
                time.sleep(0.01)
                continue

            # Retrieve frame hanya ketika diminta
            ret, frame = self.cap.retrieve()
            if not ret or frame is None:
                continue

            with self.read_lock:
                self.grabbed = ret
                self.frame = frame

            time.sleep(0.001)

    def read(self):
        with self.read_lock:
            if self.frame is None:
                return False, None
            return self.grabbed, self.frame

    def is_opened(self):
        return self.cap.isOpened() and self.grabbed

    def stop(self):
        self.started = False
        if self.thread is not None and self.thread.is_alive():
            self.thread.join(timeout=1.0)
        self.cap.release()
        logging.info("ThreadedCamera dihentikan.")
