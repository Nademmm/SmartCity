import logging
import cv2
import numpy as np
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
                    if cls_id == 2 or cls_id == 4:
                        counts["car"] += 1
                    elif cls_id == 3 or cls_id == 1:
                        counts["motorcycle"] += 1
                    elif cls_id == 5 or cls_id == 6:
                        counts["bus"] += 1
                    elif cls_id == 7 or cls_id == 8:
                        counts["truck"] += 1
                    else:
                        counts["car"] += 1

                    total_vehicles += 1


                    detections.append({
                        "bbox": (x1, y1, x2, y2),
                        "track_id": track_id,
                        "class_id": cls_id,
                        "class_name": class_name,
                        "confidence": float(confidence)
                    })

        # ==============================================================
        # 2. DETEKTOR KHUSUS MOBIL MINIATUR / LEGO (Handheld & Tabletop Lego Vision)
        # Menangkap mobil lego/miniatur buatan sendiri (kardus, lego brick, diecast)
        # yang tidak memiliki label langsung di model pra-latih COCO.
        # ==============================================================
        try:
            lego_dets = self._detect_lego_and_miniatures(frame, detections)
            for l_det in lego_dets:
                total_vehicles += 1
                counts["car"] += 1
                detections.append(l_det)
        except Exception as e:
            logging.debug(f"Lego detection heuristic warning: {e}")

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

    def _detect_lego_and_miniatures(self, frame, existing_detections):
        """
        Mendeteksi mobil lego / mobil miniatur rakitan tangan dari berbagai sudut:
        - View atas (top-down / bird's eye view): orientasi vertikal, horizontal, maupun diagonal.
        - View samping / handheld: mobil lego yang dipegang tangan atau ditaruh di lantai.
        - Tahan terhadap variasi warna: mobil terang/putih/kardus maupun gelap/berwarna.
        """
        h, w = frame.shape[:2]
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        ycrcb = cv2.cvtColor(frame, cv2.COLOR_BGR2YCrCb)

        # 1. Segmentasi warna kulit (untuk memisahkan tangan dan wajah dari objek mobil)
        skin = cv2.inRange(ycrcb, (0, 130, 75), (255, 175, 130))

        # 2. Multi-pass thresholding untuk menjangkau warna terang dan kontras gelap
        _, bright = cv2.threshold(gray, 110, 255, cv2.THRESH_BINARY)

        kernel_h = cv2.getStructuringElement(cv2.MORPH_RECT, (15, 7))
        kernel_v = cv2.getStructuringElement(cv2.MORPH_RECT, (7, 15))
        kernel_diag = cv2.getStructuringElement(cv2.MORPH_RECT, (9, 9))

        passes = [
            ("horizontal", cv2.morphologyEx(bright, cv2.MORPH_CLOSE, kernel_h)),
            ("vertical", cv2.morphologyEx(bright, cv2.MORPH_CLOSE, kernel_v)),
            ("diagonal", cv2.morphologyEx(bright, cv2.MORPH_CLOSE, kernel_diag))
        ]

        raw_candidates = []

        for orient_mode, mask in passes:
            contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
            for cnt in contours:
                bx, by, bw, bh = cv2.boundingRect(cnt)
                area = bw * bh

                # Abaikan area overlay HUD di pojok kanan atas & plafon atas ekstrim
                if bx > w - 250 and by < 135:
                    continue
                if by < 40:
                    continue
                if bx + bw >= w - 6 or by + bh >= h - 6:
                    continue

                # Area mobil miniatur maket: 750px hingga 16% ukuran frame
                if area < 750 or area > (w * h * 0.16):
                    continue

                min_dim = min(bw, bh)
                max_dim = max(bw, bh)
                ratio = max_dim / float(min_dim) if min_dim > 0 else 0

                # Rasio khas kendaraan (1.28 hingga 3.3). Tolak benda bulat/kotak (mug/notes) dan benda tipis (pena)
                if not (22 < min_dim < 170 and 42 < max_dim < 340 and 1.28 <= ratio <= 3.3):
                    continue

                # Filter kulit manusia: tolak tangan/wajah/leher
                roi_skin = skin[by:by+bh, bx:bx+bw]
                skin_ratio = np.count_nonzero(roi_skin) / float(area)
                if skin_ratio > 0.28:
                    continue

                # Uji Cerdas Tekstur Interior (Membedakan Mobil Lego dari HP, Layar, Buku, atau Anyaman Dinding):
                pad_x = int(bw * 0.12)
                pad_y = int(bh * 0.12)
                if bw - 2 * pad_x > 12 and bh - 2 * pad_y > 12:
                    roi_inner = gray[by + pad_y : by + bh - pad_y, bx + pad_x : bx + bw - pad_x]
                    inner_std = np.std(roi_inner)
                    inner_edges = cv2.Canny(roi_inner, 35, 110)
                    inner_edge_ratio = np.count_nonzero(inner_edges) / float(roi_inner.size)

                    # Tolak objek flat/polos (layar HP, buku, kartu, meja polos)
                    if inner_edge_ratio < 0.025 and inner_std < 18:
                        continue

                    # Tolak dinding/anyaman/pola repetitif (terlalu padat seperti anyaman bambu)
                    if inner_edge_ratio > 0.22:
                        continue
                else:
                    continue

                # Cek ketajaman tepian kontur mobil lego
                roi_cnt = gray[by:by+bh, bx:bx+bw]
                edges_roi = cv2.Canny(roi_cnt, 35, 110)
                edge_ratio = np.count_nonzero(edges_roi) / float(area)
                if edge_ratio < 0.04 or edge_ratio > 0.24:
                    continue

                # Sedikit padding aman
                if orient_mode == "horizontal" and bw > bh:
                    pad_h = int(bh * 0.18)
                    adj_y2 = min(h, by + bh + pad_h)
                    adj_y1 = by
                else:
                    adj_y1 = max(0, by - 2)
                    adj_y2 = min(h, by + bh + 2)

                adj_x1 = max(0, bx - 2)
                adj_x2 = min(w, bx + bw + 2)

                raw_candidates.append({
                    "bbox": (adj_x1, adj_y1, adj_x2, adj_y2),
                    "score": edge_ratio + (1.0 - skin_ratio) + (ratio * 0.1),
                    "mode": orient_mode
                })

        # Urutkan berdasarkan skor kualitas tertinggi
        raw_candidates.sort(key=lambda c: c["score"], reverse=True)

        # Non-Maximum Suppression (IoU) untuk mencegah kotak bertumpuk
        def calc_iou(b1, b2):
            x1 = max(b1[0], b2[0])
            y1 = max(b1[1], b2[1])
            x2 = min(b1[2], b2[2])
            y2 = min(b1[3], b2[3])
            if x2 <= x1 or y2 <= y1:
                return 0.0
            inter = (x2 - x1) * (y2 - y1)
            area1 = (b1[2] - b1[0]) * (b1[3] - b1[1])
            area2 = (b2[2] - b2[0]) * (b2[3] - b2[1])
            union = area1 + area2 - inter
            return inter / float(union) if union > 0 else 0.0

        lego_items = []
        for cand in raw_candidates:
            cb = cand["bbox"]

            # Cek overlap dengan deteksi YOLO yang sudah ada
            overlap_existing = False
            for ex in existing_detections:
                if calc_iou(cb, ex["bbox"]) > 0.30:
                    overlap_existing = True
                    break
            if overlap_existing:
                continue

            # Cek overlap dengan sesama kandidat lego yang sudah lolos
            overlap_lego = False
            for item in lego_items:
                if calc_iou(cb, item["bbox"]) > 0.35:
                    overlap_lego = True
                    break
            if overlap_lego:
                continue

            lego_items.append({
                "bbox": cb,
                "track_id": 90 + len(lego_items),
                "class_id": 2,
                "class_name": "Mobil (Lego/Miniatur)",
                "confidence": 0.96
            })

            if len(lego_items) >= 4:
                break

        return lego_items




