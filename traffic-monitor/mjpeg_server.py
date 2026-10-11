import cv2
import time
import json
import threading
import logging
from urllib.parse import urlparse, parse_qs
from http.server import BaseHTTPRequestHandler, HTTPServer
from socketserver import ThreadingMixIn
import config

logging.basicConfig(level=logging.INFO, format="[%(asctime)s] %(levelname)s: %(message)s")

_latest_frame_bytes = None
_frame_lock = threading.Lock()
_camera_switch_callback = None
_current_camera_source = getattr(config, 'CAMERA_SOURCE', 1)

def set_camera_switch_callback(callback, current_source=1):
    global _camera_switch_callback, _current_camera_source
    _camera_switch_callback = callback
    _current_camera_source = current_source

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
    """Handler HTTP untuk rute /video_feed MJPEG Stream dan API kontrol kamera."""

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

    def do_GET(self):
        global _current_camera_source
        parsed = urlparse(self.path)
        path = parsed.path
        query = parse_qs(parsed.query)

        if path == '/video_feed' or path == '/':
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

        elif path == '/camera_status':
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            data = {
                "current_source": _current_camera_source,
                "current_name": "Webcam USB (Logitech)" if _current_camera_source == 1 else "Kamera Laptop",
                "options": [
                    {"id": 0, "name": "Kamera Laptop (Internal)"},
                    {"id": 1, "name": "Webcam USB (Logitech Eksternal)"}
                ]
            }
            self.wfile.write(json.dumps(data).encode('utf-8'))

        elif path == '/switch_camera':
            src_param = query.get('source', [None])[0]
            success = False
            msg = "Parameter source tidak valid"
            if src_param is not None and src_param.isdigit():
                new_src = int(src_param)
                if _camera_switch_callback:
                    success = _camera_switch_callback(new_src)
                    if success:
                        _current_camera_source = new_src
                        msg = f"Berhasil beralih ke kamera {new_src}"
                    else:
                        msg = f"Gagal membuka kamera {new_src}"
                else:
                    _current_camera_source = new_src
                    success = True
                    msg = f"Kamera diatur ke {new_src}"

            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            resp = {
                "success": success,
                "current_source": _current_camera_source,
                "message": msg
            }
            self.wfile.write(json.dumps(resp).encode('utf-8'))

        else:
            self.send_error(404)
            self.end_headers()

    def do_POST(self):
        self.do_GET()

    def log_message(self, format, *args):
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
