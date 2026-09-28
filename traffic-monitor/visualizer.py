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

            # Label Teks (misal: "Car #12 [88%]")
            id_text = f"#{track_id}" if track_id is not None else ""
            label = f"{class_name} {id_text} ({int(confidence * 100)}%)"

            # Background label kecil
            (tw, th), _ = cv2.getTextSize(label, cv2.FONT_HERSHEY_SIMPLEX, 0.45, 1)
            cv2.rectangle(annotated_frame, (x1, y1 - th - 6), (x1 + tw + 6, y1), color, -1)
            cv2.putText(annotated_frame, label, (x1 + 3, y1 - 4),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.45, (0, 0, 0), 1, cv2.LINE_AA)

        # 2. Gambar HUD Panel Transparan di Pojok Kiri Atas
        panel_w = 340
        panel_h = 210
        
        # Semi-transparent overlay box
        overlay = annotated_frame.copy()
        cv2.rectangle(overlay, (15, 15), (15 + panel_w, 15 + panel_h), (10, 15, 26), -1)
        cv2.rectangle(overlay, (15, 15), (15 + panel_w, 15 + panel_h), (50, 60, 80), 1)
        cv2.addWeighted(overlay, 0.85, annotated_frame, 0.15, 0, annotated_frame)

        # 3. Header HUD Title
        cv2.putText(annotated_frame, "URBANPULSE AI VISION", (30, 38),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.55, (255, 200, 50), 2, cv2.LINE_AA)
        
        fps_text = f"FPS: {fps:.1f}"
        cv2.putText(annotated_frame, fps_text, (260, 38),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.45, (180, 180, 180), 1, cv2.LINE_AA)

        cv2.line(annotated_frame, (30, 48), (340, 48), (60, 70, 90), 1)

        # 4. Render Status Badge (LANCAR / SEDANG / MACET TOTAL)
        status_text = detection_result["status"]
        status_color = detection_result["status_color"]

        # Background badge status
        cv2.rectangle(annotated_frame, (30, 58), (340, 92), status_color, -1)
        
        # Text status (Kontras Hitam/Putih)
        text_color = (255, 255, 255) if status_text == "MACET TOTAL" else (0, 0, 0)
        cv2.putText(annotated_frame, f"STATUS: {status_text}", (40, 81),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.55, text_color, 2, cv2.LINE_AA)

        # 5. Render Detail Statistik Kendaraan
        total_v = detection_result["total_vehicles"]
        counts = detection_result["counts"]
        density_p = detection_result["density_percent"]

        y_offset = 115
        cv2.putText(annotated_frame, f"Total Kendaraan : {total_v} Unit ({density_p}% Density)",
                    (30, y_offset), cv2.FONT_HERSHEY_SIMPLEX, 0.45, (240, 240, 240), 1, cv2.LINE_AA)

        y_offset += 20
        breakdown_text = f"Mobil: {counts['car']}  |  Motor: {counts['motorcycle']}  |  Bus/Truk: {counts['bus'] + counts['truck']}"
        cv2.putText(annotated_frame, breakdown_text,
                    (30, y_offset), cv2.FONT_HERSHEY_SIMPLEX, 0.42, (180, 200, 220), 1, cv2.LINE_AA)

        y_offset += 22
        cv2.line(annotated_frame, (30, y_offset), (340, y_offset), (60, 70, 90), 1)

        # 6. Status Integrasi Ke Dashboard Next.js
        y_offset += 18
        sync_color = (0, 255, 150) if "200" in sync_status or "OK" in sync_status or "SYNC" in sync_status else (100, 180, 255)
        cv2.putText(annotated_frame, f"Dashboard Next.js API : {sync_status}",
                    (30, y_offset), cv2.FONT_HERSHEY_SIMPLEX, 0.4, sync_color, 1, cv2.LINE_AA)

        return annotated_frame
