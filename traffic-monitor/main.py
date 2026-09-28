import cv2
import time
import logging
import config
from stream_reader import ThreadedCamera
from detector import YOLODetector
from visualizer import Visualizer
from dashboard_client import DashboardClient
from mjpeg_server import MJPEGServer, update_stream_frame

logging.basicConfig(level=logging.INFO, format="[%(asctime)s] %(levelname)s: %(message)s")

def main():
    print("\n" + "=" * 65)
    print(" 🏙️  URBANPULSE SMART CITY - YOLO11 TRAFFIC MONITORING SYSTEM")
    print("=" * 65)
    print(f" ► Camera Source        : {config.CAMERA_SOURCE}")
    print(f" ► Model YOLO11         : {config.MODEL_PATH}")
    print(f" ► Filter Mode          : ONLY VEHICLES (HotWheels Target: {config.TARGET_CLASSES})")
    print(f" ► Confidence Threshold : {config.CONFIDENCE_THRESHOLD}")
    print(f" ► Dashboard API Sync   : {config.DASHBOARD_API_URL if config.ENABLE_DASHBOARD_SYNC else 'Disabled'}")
    print(f" ► Live Stream Server   : http://localhost:{config.STREAM_SERVER_PORT}/video_feed")
    print(f" ► Threshold Status     : LANCAR (< {config.THRESHOLD_LANCAR}) | RAMAI (5-10) | MACET (> {config.THRESHOLD_MACET})")
    print("=" * 65 + "\n")

    # 1. Inisialisasi Modul
    camera = ThreadedCamera(src=config.CAMERA_SOURCE).start()
    detector = YOLODetector()
    visualizer = Visualizer()
    dashboard = DashboardClient().start()
    mjpeg_server = MJPEGServer(port=config.STREAM_SERVER_PORT).start()

    previous_status = None
    frame_count = 0
    start_time = time.time()
    fps = 0.0

    try:
        while True:
            grabbed, frame = camera.read()
            if not grabbed or frame is None:
                time.sleep(0.01)
                continue

            # 2. Jalankan Deteksi & Tracking YOLO11
            detection_result = detector.process_frame(frame)
            current_status = detection_result["status"]
            total_vehicles = detection_result["total_vehicles"]

            # 3. Log Perubahan Status ke Terminal
            if current_status != previous_status:
                if previous_status is not None:
                    logging.info(f"🚨 [STATUS TRAFIK BERUBAH]: {previous_status} ➔ {current_status} ({total_vehicles} Unit Kendaraan)")
                else:
                    logging.info(f"ℹ️ [STATUS TRAFIK INITIAL]: {current_status} ({total_vehicles} Unit Kendaraan)")
                previous_status = current_status

            # 4. Update Telemetri ke Dashboard Client Thread
            dashboard.update_telemetry(detection_result)

            # 5. Hitung Real-time FPS
            frame_count += 1
            elapsed_time = time.time() - start_time
            if elapsed_time >= 1.0:
                fps = frame_count / elapsed_time
                frame_count = 0
                start_time = time.time()

            # 6. Render Overlay UI & HUD Modern
            sync_status = dashboard.get_status()
            annotated_frame = visualizer.render(frame, detection_result, fps=fps, sync_status=sync_status)

            # 7. Update Live Stream Frame untuk Dashboard Web UI
            update_stream_frame(annotated_frame)

            # 8. Tampilkan Window OpenCV Lokal
            cv2.imshow("UrbanPulse YOLO11 Traffic Monitor", annotated_frame)

            # 9. Cek Tombol Exit ('q' atau ESC)
            key = cv2.waitKey(1) & 0xFF
            if key == ord('q') or key == 27:
                logging.info("Pengguna menekan tombol Keluar ('q' / ESC). Menghentikan sistem...")
                break

    except KeyboardInterrupt:
        logging.info("Sistem dihentikan via KeyboardInterrupt.")
    except Exception as e:
        logging.error(f"Terjadi error pada main loop: {e}", exc_info=True)
    finally:
        camera.stop()
        dashboard.stop()
        mjpeg_server.stop()
        cv2.destroyAllWindows()
        print("\n✅ Sistem Traffic Monitor dihentikan secara aman.\n")

if __name__ == "__main__":
    main()
