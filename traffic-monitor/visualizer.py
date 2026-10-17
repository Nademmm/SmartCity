import cv2
import numpy as np

class Visualizer:
    """
    Render UI overlay HUD modern, bounding box kendaraan, tracking ID,
    dan badge status kemacetan dinamis pada frame OpenCV.
    """
    def __init__(self):
        # Palet warna BGR untuk kelas kendaraan
        self.class_colors = {
            "Car": (255, 180, 50),        # Cyan / Light Blue
            "Motorcycle": (255, 100, 200),# Pink / Purple
            "Bus": (50, 200, 255),       # Orange / Yellow
            "Truck": (200, 200, 50)      # Teal
        }

    def render(self, frame, detection_result, fps=0.0, sync_status="SYNCING"):
        annotated_frame = frame.copy()
        h, w, _ = annotated_frame.shape

        # 1. Gambar Bounding Box & Label Kendaraan
        detections = detection_result.get("detections", [])
        for det in detections:
            x1, y1, x2, y2 = det["bbox"]
            track_id = det["track_id"]
            class_name = det["class_name"]
            confidence = det["confidence"]
            color = self.class_colors.get(class_name, (0, 255, 0))

            # Gambar Bounding Box dengan efek garis tebal halus
            cv2.rectangle(annotated_frame, (x1, y1), (x2, y2), color, 2)

            # Gambar Titik Tengah (Centroid) persis seperti repo codewithaarohi
            cx = (x1 + x2) // 2
            cy = (y1 + y2) // 2
            cv2.circle(annotated_frame, (cx, cy), 4, (0, 0, 255), -1)

            # Label Teks persis seperti repo codewithaarohi (ID: <id> <class_name> <conf>)
            id_text = f"ID: {track_id} " if track_id is not None else ""
            label = f"{id_text}{class_name} {int(confidence * 100)}%"

            # Background label kecil
            (tw, th), _ = cv2.getTextSize(label, cv2.FONT_HERSHEY_SIMPLEX, 0.45, 1)
            cv2.rectangle(annotated_frame, (x1, y1 - th - 6), (x1 + tw + 6, y1), color, -1)
            cv2.putText(annotated_frame, label, (x1 + 3, y1 - 4),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.45, (0, 0, 0), 1, cv2.LINE_AA)

        # 2. Gambar HUD Mini Badge di Pojok Kanan Atas (Agar tidak menutupi tengah frame/objek kamera)
        panel_w = 230
        panel_h = 100
        x_panel = w - panel_w - 12
        y_panel = 12

        # Semi-transparent overlay box
        overlay = annotated_frame.copy()
        cv2.rectangle(overlay, (x_panel, y_panel), (x_panel + panel_w, y_panel + panel_h), (10, 15, 26), -1)
        cv2.rectangle(overlay, (x_panel, y_panel), (x_panel + panel_w, y_panel + panel_h), (50, 60, 80), 1)
        cv2.addWeighted(overlay, 0.85, annotated_frame, 0.15, 0, annotated_frame)

        # 3. Header HUD Title
        cv2.putText(annotated_frame, "URBANPULSE AI", (x_panel + 10, y_panel + 20),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.42, (255, 200, 50), 1, cv2.LINE_AA)
        
        fps_text = f"{fps:.1f} FPS"
        cv2.putText(annotated_frame, fps_text, (x_panel + panel_w - 55, y_panel + 20),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.38, (180, 180, 180), 1, cv2.LINE_AA)

        # 4. Status Badge Ringkas
        status_text = detection_result["status"]
        status_color = detection_result["status_color"]
        cv2.rectangle(annotated_frame, (x_panel + 10, y_panel + 30), (x_panel + panel_w - 10, y_panel + 55), status_color, -1)
        text_color = (255, 255, 255) if status_text == "MACET TOTAL" else (0, 0, 0)
        cv2.putText(annotated_frame, status_text, (x_panel + 16, y_panel + 48),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.42, text_color, 1, cv2.LINE_AA)

        # 5. Detail Statistik Ringkas
        total_v = detection_result["total_vehicles"]
        density_p = detection_result["density_percent"]
        cv2.putText(annotated_frame, f"Kendaraan: {total_v} Unit ({density_p}%)",
                    (x_panel + 10, y_panel + 74), cv2.FONT_HERSHEY_SIMPLEX, 0.38, (230, 230, 230), 1, cv2.LINE_AA)

        # 6. Status API
        sync_color = (0, 255, 150) if "200" in sync_status or "OK" in sync_status or "SYNC" in sync_status else (100, 180, 255)
        cv2.putText(annotated_frame, f"API Sync: {sync_status}",
                    (x_panel + 10, y_panel + 90), cv2.FONT_HERSHEY_SIMPLEX, 0.35, sync_color, 1, cv2.LINE_AA)

        return annotated_frame