import logging
import cv2
import torch
from ultralytics import YOLO
import config

# Optimasi PyTorch CPU Multithreading
try:
    torch.set_num_threads(4)
except Exception:
    pass

logging.basicConfig(level=logging.INFO, format="[%(asctime)s] %(levelname)s: %(message)s")

class YOLODetector:
    """
    Wrapper untuk Ultralytics YOLO11 (Tracking, Object Detection, dan Vehicle Counting).
    Mendukung dua mode:
    1. STRICT VEHICLE MODE (DETECT_ANY_OBJECT=false): Khusus Mobil (HotWheels), Motor, Bus, Truk.
    2. ANY OBJECT MODE (DETECT_ANY_OBJECT=true): Mendeteksi benda/item APAPUN yang ditaruh di maket.
    """
    def __init__(self, model_path=config.MODEL_PATH, conf=config.CONFIDENCE_THRESHOLD, iou=config.IOU_THRESHOLD):
        self.model_path = model_path
        self.conf = conf
        self.iou = iou
        logging.info(f"Menginisialisasi Model YOLO11 (imgsz={config.YOLO_IMGSZ}, Any-Object Mode={config.DETECT_ANY_OBJECT})")
        
        # Load model YOLO11
        self.model = YOLO(self.model_path)
        
    def process_frame(self, frame):
        """
        Menjalankan tracking & deteksi objek pada frame.
        """
        h, w = frame.shape[:2]

        # Downscale frame jika terlalu besar (misal 1080p -> 640px) untuk kecepatan inferensi maksimal
        scale = 1.0
        proc_frame = frame
        if w > config.INPUT_RESIZE_WIDTH:
            scale = config.INPUT_RESIZE_WIDTH / float(w)
            new_h = int(h * scale)
            proc_frame = cv2.resize(frame, (config.INPUT_RESIZE_WIDTH, new_h), interpolation=cv2.INTER_LINEAR)

        # Mode Deteksi: jika DETECT_ANY_OBJECT=true, deteksi semua barang (classes=None)
        classes_to_track = None if config.DETECT_ANY_OBJECT else config.TARGET_CLASSES

        results = self.model.track(
            source=proc_frame,
            persist=True,
            classes=classes_to_track,
            conf=self.conf,
            iou=self.iou,
            imgsz=config.YOLO_IMGSZ,
            agnostic_nms=config.AGNOSTIC_NMS,
            half=False,
            augment=config.AUGMENT_INFERENCE,
            verbose=False
        )

        detections = []
        counts = {
            "car": 0,
            "motorcycle": 0,
            "bus": 0,
            "truck": 0
        }

        total_vehicles = 0

        if results and len(results) > 0:
            result = results[0]
            boxes = result.boxes

            if boxes is not None and len(boxes) > 0:
                track_ids = boxes.id.int().cpu().tolist() if boxes.id is not None else [i+1 for i in range(len(boxes))]
                box_data = boxes.xyxy.cpu().numpy()
                cls_data = boxes.cls.int().cpu().tolist()
                conf_data = boxes.conf.cpu().numpy()

                for box, track_id, cls_id, confidence in zip(box_data, track_ids, cls_data, conf_data):
                    # Jika mode STRICT (DETECT_ANY_OBJECT=False), abaikan kelas non-kendaraan
                    if not config.DETECT_ANY_OBJECT:
                        if cls_id in config.EXCLUDE_CLASSES or cls_id not in config.TARGET_CLASSES:
                            continue

                    # Skala koordinat bounding box kembali ke ukuran frame asli jika di-downscale
                    x1, y1, x2, y2 = box
                    if scale != 1.0:
                        x1, y1, x2, y2 = x1 / scale, y1 / scale, x2 / scale, y2 / scale

                    x1, y1, x2, y2 = map(int, (x1, y1, x2, y2))

                    # Nama kelas
                    if cls_id in config.CLASS_NAMES:
                        class_name = config.CLASS_NAMES[cls_id]
                    else:
                        class_name = f"Item ({result.names.get(cls_id, cls_id)})"

                    # Hitung statistik per tipe
                    if cls_id == 2:
                        counts["car"] += 1
                    elif cls_id == 3:
                        counts["motorcycle"] += 1
                    elif cls_id == 5:
                        counts["bus"] += 1
                    elif cls_id == 7:
                        counts["truck"] += 1
                    else:
                        counts["car"] += 1 # Benda umum dianggap kategori kendaraan maket

                    total_vehicles += 1

                    detections.append({
                        "bbox": (x1, y1, x2, y2),
                        "track_id": track_id,
                        "class_id": cls_id,
                        "class_name": class_name,
                        "confidence": float(confidence)
                    })

        # Klasifikasi Status Kemacetan berdasarkan Logika Bisnis:
        if total_vehicles < config.THRESHOLD_LANCAR:
            status = "LANCAR"
            status_color = (0, 220, 100)
            badge_variant = "success"
        elif total_vehicles <= config.THRESHOLD_MACET:
            status = "SEDANG / RAMAI LANCAR"
            status_color = (0, 215, 255)
            badge_variant = "warning"
        else:
            status = "MACET TOTAL"
            status_color = (50, 50, 255)
            badge_variant = "danger"

        density_percent = min(98, max(15, int((total_vehicles / 12.0) * 100)))

        return {
            "detections": detections,
            "total_vehicles": total_vehicles,
            "counts": counts,
            "status": status,
            "status_color": status_color,
            "badge_variant": badge_variant,
            "density_percent": density_percent
        }
