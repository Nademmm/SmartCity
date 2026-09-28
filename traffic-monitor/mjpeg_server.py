import cv2
import time
import threading
import logging
from http.server import BaseHTTPRequestHandler, HTTPServer
from socketserver import ThreadingMixIn
import config

logging.basicConfig(level=logging.INFO, format="[%(asctime)s] %(levelname)s: %(message)s")

_latest_frame_bytes = None
_frame_lock = threading.Lock()

def update_stream_frame(frame):
    """
    Simpan frame OpenCV terbaru (termasuk bounding box & HUD) yang sudah di-encode ke JPEG.
    """
    global _latest_frame_bytes
    if frame is None:
        return
    ret, jpeg = cv2.imencode('.jpg', frame, [int(cv2.IMWRITE_JPEG_QUALITY), 80])
    if ret:
        with _frame_lock:
            _latest_frame_bytes = jpeg.tobytes()

class ThreadedHTTPServer(ThreadingMixIn, HTTPServer):
    """HTTP Server multithreaded untuk streaming MJPEG."""
    daemon_threads = True

class MJPEGStreamHandler(BaseHTTPRequestHandler):
    """Handler HTTP untuk rute /video_feed MJPEG Stream."""
    def do_GET(self):
        if self.path == '/video_feed' or self.path == '/':
            self.send_response(200)
            self.send_header('Content-Type', 'multipart/x-mixed-replace; boundary=frame')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()

            while True:
                with _frame_lock:
                    frame_bytes = _latest_frame_bytes

                if frame_bytes is not None:
                    try:
                        self.wfile.write(b'--frame\r\n')
                        self.send_header('Content-Type', 'image/jpeg')
                        self.send_header('Content-Length', str(len(frame_bytes)))
                        self.end_headers()
                        self.wfile.write(frame_bytes)
                        self.wfile.write(b'\r\n')
                    except (ConnectionResetError, BrokenPipeError):
                        break
                time.sleep(0.04) # ~25 FPS stream
        else:
            self.send_error(404)
            self.end_headers()

    def log_message(self, format, *args):
        # Mute standar HTTP access log agar tidak mengotori terminal
        return

class MJPEGServer:
    """
    Server pengirim stream video MJPEG berbasis HTTP port 8088.
    """
    def __init__(self, port=config.STREAM_SERVER_PORT):
        self.port = port
        self.enabled = config.ENABLE_STREAM_SERVER
        self.server = None
        self.thread = None

    def start(self):
        if not self.enabled:
            return self
        
        try:
            self.server = ThreadedHTTPServer(('0.0.0.0', self.port), MJPEGStreamHandler)
            self.thread = threading.Thread(target=self.server.serve_forever, daemon=True)
            self.thread.start()
            logging.info(f"🎥 MJPEG Web Stream Server Aktif! Buka di Dashboard: http://localhost:{self.port}/video_feed")
        except Exception as e:
            logging.warning(f"Gagal memulai MJPEG Server pada port {self.port}: {e}")
        return self

    def stop(self):
        if self.server:
            self.server.shutdown()
            self.server.server_close()
