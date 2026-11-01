# SmartCity: Panel Kendali Perangkat Keras ESP32 & Kamera AI

Sistem konsol kendali perangkat keras **SmartCity** berbasis Next.js dan MicroPython ESP32 yang mengintegrasikan pemantauan serta kontrol dua arah untuk:
1. **Monitoring Polusi Gas MQ & Layar LCD I2C 16x2** (`ADC Pin 39`, `SoftI2C SCL/SDA Auto-Scan`).
2. **Penyeberangan Pejalan Kaki Dual Ultrasonik & 3 LED** (`TRIG/ECHO Kanan Pin 32/34`, `Kiri Pin 33/35`, `LED Hijau Pin 12`, `Kuning Pin 14`, `Merah Pin 27`).
3. **Buzzer Peringatan Dua Fungsi Non-Blocking** (`GPIO Pin 4`: pola alarm gas `800 ms` dan pola penyeberangan 6 ketukan, bergantian tiap `2500 ms` jika aktif bersamaan).
4. **Smart PJU Otomatis & Manual via Web** (`Sensor LDR Pin 36`, `LED Merah Pin 25`, `LED Putih Pin 26`).
5. **Kamera Pemantau Lalu Lintas Simpang (YOLO11 & Browser Vision)** (`Port 8088` / WebRTC).

---

## Dokumentasi Lengkap

- **[PANDUAN_MENJALANKAN_PROYEK.md](./PANDUAN_MENJALANKAN_PROYEK.md)**: Panduan lengkap instalasi, cara menjalankan dashboard web, jembatan serial COM3, dan kamera AI.
- **[IOT_INTEGRATION_GUIDE.md](./IOT_INTEGRATION_GUIDE.md)**: Skema pinout lengkap ESP32 MicroPython, daftar perintah serial (`CMD:*`), serta spesifikasi endpoint REST API.
- **[DESIGN.md](./DESIGN.md)**: Dokumentasi sistem desain antarmuka konsol perangkat keras SmartCity.
- **[firmware/main_thonny_micropython.py](./firmware/main_thonny_micropython.py)**: Kode utama MicroPython ESP32 siap pakai untuk Thonny IDE.

---

## Cara Cepat Menjalankan Sistem

### 1. Otomatis 1-Klik (Windows)
Klik ganda file **`start_all.bat`** untuk menjalankan sekaligus:
- Next.js Web Control Console di `http://localhost:3000`
- Jembatan Serial ESP32 (`COM3` @ `115200` baud)
- Server Kamera AI YOLO11 di `http://localhost:8088/video_feed`

### 2. Menjalankan Manual via Terminal
```bash
# Terminal 1: Jalankan Dashboard Web SmartCity
npm run dev

# Terminal 2: Jalankan Jembatan Serial USB (COM3) ke Dashboard
powershell -NoProfile -ExecutionPolicy Bypass -File firmware\bridge_serial_to_dashboard.ps1

# Terminal 3 (Opsional): Jalankan Kamera AI YOLO11
cd traffic-monitor
.\.venv\Scripts\python.exe main.py
```

---

## Pemetaan Pin Perangkat Keras ESP32 (MicroPython)

| Modul / Komponen | Pin GPIO ESP32 | Fungsi & Ambang Batas |
| :--- | :--- | :--- |
| **LCD 16x2 I2C** | Auto-scan `(22,21)`, `(21,22)`, `(19,18)` | Menampilkan `Nilai MQ` (baris 1) dan `Status Polusi` (baris 2) |
| **Sensor Gas MQ** | `GPIO 39` (`ADC.ATTN_11DB`) | `< 1000` Bersih, `1000-1499` Sedang, `>= 1500` Polusi Tinggi (Alarm) |
| **Ultrasonik Kanan** | `TRIG 32`, `ECHO 34` | Deteksi pejalan kaki sisi kanan (`<= 17 cm`) |
| **Ultrasonik Kiri** | `TRIG 33`, `ECHO 35` | Deteksi pejalan kaki sisi kiri (`<= 25 cm`) |
| **Lampu Penyeberangan** | `Hijau 12`, `Kuning 14`, `Merah 27` | Siklus 4-fase: `HIJAU` -> `KUNING (1s)` -> `MERAH (5s)` -> `TUNGGU_KOSONG` |
| **Buzzer Dua Fungsi** | `GPIO 4` | Alarm Gas (`800ms`) & Pola Penyeberangan (aktif saat `MERAH`) |
| **Sensor Cahaya LDR** | `GPIO 36` (`ADC.ATTN_11DB`) | `> 2000` kondisi `GELAP` (PJU menyala otomatis pada mode `AUTO`) |
| **Lampu Smart PJU** | `LED Merah 25`, `LED Putih 26` | Menyala saat gelap (`AUTO`) atau dikontrol manual (`ON` / `OFF`) |

---

## Daftar Perintah Kontrol Serial (`CMD:*`)

Dashboard web mengirim perintah berikut ke ESP32 melalui USB Serial (`uselect.poll()` non-blocking) maupun endpoint `/api/iot/control`:

| Perintah Serial | Fungsi pada ESP32 |
| :--- | :--- |
| `CMD:PJU_ON` | Mengunci lampu PJU (`Pin 25` & `26`) agar menyala terus (`MANUAL ON`) |
| `CMD:PJU_OFF` | Mengunci lampu PJU (`Pin 25` & `26`) agar mati (`MANUAL OFF`) |
| `CMD:PJU_AUTO` | Mengembalikan kontrol lampu PJU ke sensor cahaya LDR (`Pin 36`) |
| `CMD:FORCE_CROSSING` | Memaksa siklus penyeberangan beralih dari `HIJAU` ke `KUNING` lalu `MERAH` |
| `CMD:CROSSING_RESET` | Mereset siklus penyeberangan kembali ke `HIJAU` (`siap_menyeberang = True`) |
| `CMD:BUZZER_TEST` | Membunyikan buzzer (`Pin 4`) selama `300 ms` untuk uji fungsi |
| `CMD:GAS_AUTO` | Mengembalikan pembacaan gas ke sensor fisik `ADC Pin 39` |

---

## Endpoint REST API SmartCity

| Endpoint | Method | Fungsi |
| :--- | :--- | :--- |
| `/api/iot/telemetry` | `POST` | Menerima paket data telemetri dari ESP32 (`miniature-all`, `air-quality`, `pedestrian`, `pju`, `traffic`) |
| `/api/iot/telemetry` | `GET` | Membaca status telemetri terbaru dan riwayat 20 paket terakhir |
| `/api/iot/control` | `POST` | Menambahkan perintah kontrol (`CMD:*`) ke antrean perangkat |
| `/api/iot/control?deviceId=ESP32-MINIATURE` | `GET` | Diambil oleh jembatan serial untuk diteruskan ke port `COM3` |
| `/api/iot/status` | `GET` | Memeriksa status kesehatan gateway IoT SmartCity |
