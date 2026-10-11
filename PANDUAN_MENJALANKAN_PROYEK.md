# 📘 PANDUAN LENGKAP MENJALANKAN URBANPULSE SMART CITY COMMAND CENTER

Panduan resmi dari awal (instalasi nol) hingga seluruh fitur kota pintar, AI Traffic Camera (YOLO11), dan integrasi IoT dapat beroperasi sempurna.

---

## 📑 DAFTAR ISI

1. [Gambaran Arsitektur Sistem](#1-gambaran-arsitektur-sistem)
2. [Prasyarat Sistem & Perangkat](#2-prasyarat-sistem--perangkat)
3. [Instalasi Pertama Kali (Setup Dari Nol)](#3-instalasi-pertama-kali-setup-dari-nol)
4. [Konfigurasi Lingkungan (.env)](#4-konfigurasi-lingkungan-env)
5. [Cara Menjalankan Sistem](#5-cara-menjalankan-sistem)
   - [Opsi A: Jalankan Otomatis 1-Klik (start_all.bat)](#opsi-a-jalankan-otomatis-1-klik-start_allbat)
   - [Opsi B: Jalankan Manual via Dua Terminal](#opsi-b-jalankan-manual-via-dua-terminal)
6. [Panduan Lengkap Eksplorasi Fitur Dashboard](#6-panduan-lengkap-eksplorasi-fitur-dashboard)
   - [Fitur 1: AI Traffic Camera & Adaptive Traffic Control (ATSC)](#fitur-1-ai-traffic-camera--adaptive-traffic-control-atsc)
   - [Fitur 2: Kualitas Udara & Stasiun Cuaca (Air Quality)](#fitur-2-kualitas-udara--stasiun-cuaca-air-quality)
   - [Fitur 3: Lampu Jalan Pintar (Smart PJU Lighting)](#fitur-3-lampu-jalan-pintar-smart-pju-lighting)
   - [Fitur 4: Penyeberangan Pintar (Smart Pelican Crossing)](#fitur-4-penyeberangan-pintar-smart-pelican-crossing)
   - [Fitur 5: Mesin Aturan Otomasi Kota (Automation Engine)](#fitur-5-mesin-aturan-otomasi-kota-automation-engine)
   - [Fitur 6: Pusat Alarm & Log Darurat (Alerts & Emergency)](#fitur-6-pusat-alarm--log-darurat-alerts--emergency)
   - [Fitur 7: Hardware Registry & Gateway IoT ESP32](#fitur-7-hardware-registry--gateway-iot-esp32)
7. [Panduan Khusus: Deteksi Mobil Miniatur / Lego dari Sudut Atas (Top-Down)](#7-panduan-khusus-deteksi-mobil-miniatur--lego-dari-sudut-atas-top-down)
8. [Uji Coba Pengiriman Data Sensor (Simulasi Tanpa Hardware Fisik)](#8-uji-coba-pengiriman-data-sensor-simulasi-tanpa-hardware-fisik)
9. [Troubleshooting & Solusi Kendala Populer](#9-troubleshooting--solusi-kendala-populer)

---

## 1. Gambaran Arsitektur Sistem

UrbanPulse tersusun dari 3 pilar utama yang saling terhubung secara real-time:

```
┌────────────────────────────────────────────────────────┐
│                   URBANPULSE ECOSYSTEM                 │
└────────────────────────────────────────────────────────┘
          ▲                                    ▲
          │ (HTTP POST Telemetry & MJPEG)      │ (HTTP POST / MQTT)
          │                                    │
┌───────────────────────┐            ┌───────────────────────┐
│ PYTHON AI CAMERA      │            │ HARDWARE IOT MESH     │
│ (traffic-monitor/)    │            │ (Node ESP32 Fisik)    │
│ • Model: YOLO11       │            │ • Sensor MQ-135/DHT22 │
│ • OpenCV DirectShow   │            │ • Sensor PIR / LDR    │
│ • Port: 8088          │            │ • LED Traffic & Relay │
│ • Dual Cam (0 & 1)    │            │ • Button & Buzzer     │
└───────────────────────┘            └───────────────────────┘
          │                                    │
          └──────────────────┬─────────────────┘
                             ▼
              ┌─────────────────────────────┐
              │ NEXT.JS COMMAND CENTER      │
              │ • Port: 3000                │
              │ • Dashboard Realtime        │
              │ • Engine Logika Kota        │
              │ • Endpoint Ingestion API    │
              └─────────────────────────────┘
```

---

## 2. Prasyarat Sistem & Perangkat

Pastikan software pendukung berikut telah terpasang di komputer/laptop Anda:

| Perangkat Lunak | Versi Minimal | Fungsi |
| :--- | :--- | :--- |
| **Node.js** | v18.0.0 atau lebih baru (disarankan v20+) | Menjalankan Next.js Web Dashboard |
| **npm** | v9.0.0 atau lebih baru | Manajemen paket JavaScript/TypeScript |
| **Python** | v3.10 atau v3.11 (64-bit) | Menjalankan mesin AI YOLO11 & OpenCV |
| **Git** | Bebas | Version control sistem |
| **Kamera** | Webcam Laptop bawaan atau Webcam USB eksternal | Input visual deteksi lalu lintas |

> **Catatan Pengguna Windows:** Pastikan Python telah dicentang opsi **"Add python.exe to PATH"** saat instalasi.

---

## 3. Instalasi Pertama Kali (Setup Dari Nol)

Buka terminal (PowerShell atau Command Prompt) dan arahkan ke direktori proyek:

### Langkah 3.1: Install Dependensi Frontend (Next.js)

```bash
cd c:\Users\nadem\OneDrive\Documents\urbanpulse
npm install
```

Tunggu hingga folder `node_modules` selesai diunduh.

### Langkah 3.2: Siapkan Virtual Environment Python (Backend AI)

Masuk ke folder `traffic-monitor` dan buat virtual environment agar tidak bentrok dengan pustaka sistem:

```bash
cd traffic-monitor
python -m venv .venv
```

Aktifkan virtual environment:
- **Di Windows PowerShell:**
  ```powershell
  .\.venv\Scripts\activate
  ```
  *(Jika muncul peringatan script execution policy, jalankan: `Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned`)*
- **Di Command Prompt (cmd.exe):**
  ```cmd
  .\.venv\Scripts\activate.bat
  ```

### Langkah 3.3: Install Pustaka Python

Dengan posisi virtual environment aktif, jalankan instalasi paket:

```bash
pip install -r requirements.txt
```

Isi dari `requirements.txt` meliputi:
- `ultralytics` (mesin YOLO11 resmi)
- `opencv-python` (pengolahan citra video & streaming webcam)
- `requests` (pengiriman telemetri data ke Next.js)
- `python-dotenv` (pembacaan file konfigurasi `.env`)

File model `yolo11n.pt` sudah tersedia langsung di dalam folder `traffic-monitor/`. Jika terhapus, Ultralytics akan otomatis mengunduhnya kembali saat pertama kali dijalankan.

---

## 4. Konfigurasi Lingkungan (.env)

Pengaturan AI kamera dikendalikan melalui file `traffic-monitor/.env`:

```env
# URL Ingestion Dashboard Next.js
DASHBOARD_API_URL=http://localhost:3000/api/iot/telemetry

# Pilihan Sumber Kamera:
# 0 = Kamera Bawaan Laptop
# 1 = Kamera Eksternal USB Webcam
CAMERA_SOURCE=1

# Tipe Kamera: webcam atau rtsp
CAMERA_TYPE=webcam

# Tingkat Sensitivitas Deteksi (0.20 - 0.50)
# Nilai 0.26 optimal mendeteksi mobil sungguhan maupun miniatur Lego sudut atas
CONFIDENCE_THRESHOLD=0.26

# ID Kamera untuk penamaan di dashboard
CAMERA_ID=CAM-JKT-01

# Port MJPEG Live Streaming
STREAM_PORT=8088
```

> **Tips Penentuan Nomor Kamera:**
> - Jika hanya ada kamera laptop: gunakan `CAMERA_SOURCE=0`
> - Jika ada USB Webcam yang ditancapkan: gunakan `CAMERA_SOURCE=1`
> - Anda tidak perlu repot mengubah file ini setiap saat, karena tombol pergantian kamera telah disediakan langsung di layar Dashboard!

---

## 5. Cara Menjalankan Sistem

Anda dapat memilih salah satu dari dua metode di bawah ini:

### Opsi A: Jalankan Otomatis 1-Klik (start_all.bat)

Di folder utama proyek (`urbanpulse/`), klik ganda file:
```
start_all.bat
```
Script ini akan otomatis membuka 2 jendela terminal terpisah:
1. Terminal 1: Menjalankan `npm run dev` (Frontend Dashboard Port 3000).
2. Terminal 2: Menjalankan Python AI YOLO11 Monitor (Port 8088).

Tunggu sekitar 5-10 detik, lalu buka browser Anda ke:
👉 **`http://localhost:3000`**

---

### Opsi B: Jalankan Manual via Dua Terminal

Jika ingin melihat log dan output masing-masing service secara detail, gunakan 2 tab terminal:

#### Terminal 1: Frontend Next.js
```powershell
cd c:\Users\nadem\OneDrive\Documents\urbanpulse
npm run dev
```
*Tunggu hingga muncul pesan `Ready in ...ms (localhost:3000)`.*

#### Terminal 2: Backend AI Traffic Monitor
```powershell
cd c:\Users\nadem\OneDrive\Documents\urbanpulse\traffic-monitor
.\.venv\Scripts\python.exe main.py
```
*Tunggu hingga muncul pesan:*
```
[CAM] Starting camera (source: 1)...
[CAM] DirectShow connection OK (source: 1, 640x480 @ 30 FPS)
[MJPEG] Server running on http://0.0.0.0:8088/video_feed
```

---

## 6. Panduan Lengkap Eksplorasi Fitur Dashboard

Buka `http://localhost:3000` pada browser Chrome/Edge. Di sisi kiri terdapat menu navigasi:

### Fitur 1: AI Traffic Camera & Adaptive Traffic Control (ATSC)

Klik menu **"Lalu Lintas"** (ikon mobil).

1. **Pemilihan Kamera Langsung (Dual-Camera Support):**
   - Di bagian kanan atas panel live stream, terdapat tombol:
     - **[Kamera Laptop]** : Mengalihkan AI ke webcam internal laptop (Index 0).
     - **[Webcam USB]** : Mengalihkan AI ke webcam USB eksternal (Index 1).
   - Pengalihan terjadi dalam hitungan detik tanpa perlu merestart program Python.
2. **Mode Tampilan:**
   - **Mode AI Stream (Default):** Mengambil feed dari server Python port 8088 lengkap dengan kotak deteksi bounding box warna hijau/oranye/merah, label jenis kendaraan, confidence score, dan garis zona hitung.
   - **Mode Browser Direct:** Mengakses webcam langsung lewat WebRTC browser untuk fallback tanpa server Python.
3. **Statistik Antrean & Kepadatan:**
   - Jumlah kendaraan terdeteksi (Mobil, Motor, Bus, Truk).
   - Panjang antrean (Queue Length).
   - Estimasi waktu tunggu (Estimated Delay).
4. **Siklus Lampu Adaptif (ATSC):**
   - Sinyal lampu lalu lintas (Merah, Kuning, Hijau) menyesuaikan durasi hijau secara otomatis sesuai tingkat kepadatan antrean.
5. **Tombol Koridor Hijau Darurat (Emergency Green Corridor):**
   - Tekan tombol **"Aktifkan Koridor Hijau"** untuk memprioritaskan ambulans atau pemadam kebakaran. Sinyal lampu arah darurat akan langsung dipaksa Hijau penuh dan arah lain Merah.

---

### Fitur 2: Kualitas Udara & Stasiun Cuaca (Air Quality)

Klik menu **"Kualitas Udara"** (ikon angin/daun).

1. **Indeks Standar Pencemar Udara (ISPU / AQI):**
   - Indikator gauge visual tingkat kesehatan udara (Baik: 0-50, Sedang: 51-100, Tidak Sehat: 101-199, Sangat Berbahaya: 200+).
2. **Monitoring Multi-Gas:**
   - Konsentrasi partikulat halus **PM2.5** (µg/m³).
   - Karbon Monoksida **CO** (ppm).
   - Karbon Dioksida **CO2** (ppm).
3. **Parameter Meteorologi:**
   - Suhu udara (°C) dan Kelembaban relatif (%).
4. **Grafik Riwayat Tren:**
   - Grafik historis fluktuasi polusi udara sepanjang jam pengamatan.

---

### Fitur 3: Lampu Jalan Pintar (Smart PJU Lighting)

Klik menu **"Lampu Jalan"** (ikon bohlam).

1. **Mode Adaptif Otomatis:**
   - Lampu jalan meredup hingga 20% saat larut malam ketika tidak ada kendaraan (hemat energi hingga 68%).
   - Saat sensor mendeteksi kendaraan atau pejalan kaki lewat, intensitas cahaya otomatis naik instan ke 100%.
2. **Manual Override:**
   - Operator kota dapat mengatur slider kecerahan setiap zona jalan secara manual (0% - 100%).
3. **Metrik Konsumsi Daya:**
   - Menampilkan total daya aktif (Watt) dan akumulasi kilowatt-jam (kWh) yang berhasil dihemat.

---

### Fitur 4: Penyeberangan Pintar (Smart Pelican Crossing)

Klik menu **"Penyeberangan"** (ikon pejalan kaki).

1. **Simulasi Tombol Penyeberang (Pedestrian Demand):**
   - Klik tombol **"Tekan Tombol Penyeberang"** untuk menyimulasikan warga yang menekan tombol fisik di tiang penyeberangan.
2. **Siklus Sinyal Pejalan Kaki:**
   - Lampu kendaraan berubah Kuning -> Merah.
   - Lampu pejalan kaki berubah Hijau disertai hitung mundur (countdown timer) dan simulasi audio beeper untuk tunanetra.
3. **Radar Perpanjangan Waktu Difabel:**
   - Jika pejalan kaki berjalan lambat atau lansia masih berada di zebra cross, durasi hijau otomatis diperpanjang hingga mereka tiba di seberang dengan aman.

---

### Fitur 5: Mesin Aturan Otomasi Kota (Automation Engine)

Klik menu **"Otomasi"** (ikon roda gigi/proses).

- Mengatur skenario aksi otomatis kota cerdas:
  - *Skenario Polusi:* Jika AQI > 150 -> Aktifkan sprinkler kabut air dan batasi kecepatan kendaraan di area terkait.
  - *Skenario Cuaca Ekstrim:* Jika intensitas cahaya rendah siang hari akibat badai -> Nyalakan lampu PJU lebih awal.
  - *Skenario Macet Total:* Jika antrean > 15 kendaraan -> Alihkan rute lampu lalu lintas simpang hulu.

---

### Fitur 6: Pusat Alarm & Log Darurat (Alerts & Emergency)

Klik menu **"Peringatan"** (ikon lonceng peringatan).

- Menampilkan daftar insiden kota real-time berdasarkan tingkat urgensi:
  - **Info** (Biru): Perubahan jadwal operasional atau siklus rutin.
  - **Warning** (Kuning): Peningkatan polusi atau kepadatan lalu lintas.
  - **Critical** (Merah): Kemacetan parah, kerusakan sensor, atau panggilan darurat ambulans.

---

### Fitur 7: Hardware Registry & Gateway IoT ESP32

Klik menu **"Perangkat IoT"** (ikon chip/mikrokontroler).

- Memantau status kesehatan setiap modul mikrokontroler di lapangan:
  - Alamat IP lokal masing-masing node.
  - Kualitas sinyal nirkabel (WiFi RSSI dBm).
  - Waktu aktif (Uptime) dan status detak jantung (Last Ping / Heartbeat).
  - Riwayat paket data mentah yang diterima gateway.

---

## 7. Panduan Khusus: Deteksi Mobil Miniatur / Lego dari Sudut Atas (Top-Down)

AI Vision UrbanPulse telah dioptimalkan secara khusus menggunakan algoritma multi-pass orientation analysis untuk mampu mengenali kendaraan sungguhan maupun mobil miniatur/Lego dari sudut pandang atas (top-down view):

### 💡 Tips Penempatan & Pengambilan Gambar yang Maksimal:

1. **Jarak Kamera:** Letakkan webcam USB sekitar **30 cm hingga 70 cm** di atas miniatur jalan atau meja.
2. **Sudut Kamera:**
   - Sudut atas tegak lurus (90 derajat) atau sudut agak miring (45 - 60 derajat) sama-sama didukung.
3. **Pencahayaan:**
   - Pastikan miniatur mobil mendapatkan cahaya yang cukup. Hindari bayangan tangan yang terlalu pekat menutupi seluruh objek.
4. **Alas / Background:**
   - Sangat dianjurkan menggunakan alas datar (kertas karton jalan, lantai, atau meja biasa).
5. **Anti-False-Alarm (Perlindungan Benda Meja):**
   - Sistem dilengkapi analisis tekstur kontur internal. Benda datar seperti ponsel, dompet, buku, atau anyaman bambu secara otomatis diabaikan sehingga tidak memicu deteksi mobil palsu.

---

## 8. Uji Coba Pengiriman Data Sensor (Simulasi Tanpa Hardware Fisik)

Jika Anda belum memasang mikrokontroler fisik ESP32, Anda dapat menyimulasikan data telemetri menggunakan perintah cURL pada terminal:

### Test Sensor Kualitas Udara (MQ-135 & DHT22):
```bash
curl -X POST http://localhost:3000/api/iot/telemetry ^
  -H "Content-Type: application/json" ^
  -d "{\"deviceId\":\"ESP32-AIR-01\",\"type\":\"air-quality\",\"payload\":{\"aqi\":85,\"pm25\":38.5,\"co\":1.2,\"co2\":420,\"temperature\":28.4,\"humidity\":65.0}}"
```

### Test Sensor Lampu PJU (PIR & LDR):
```bash
curl -X POST http://localhost:3000/api/iot/telemetry ^
  -H "Content-Type: application/json" ^
  -d "{\"deviceId\":\"ESP32-LIGHT-01\",\"type\":\"lighting\",\"payload\":{\"lux\":120,\"motionDetected\":true,\"currentDimming\":100,\"powerConsumption\":45.0}}"
```

### Test Permintaan Pelican Crossing (Push Button):
```bash
curl -X POST http://localhost:3000/api/iot/telemetry ^
  -H "Content-Type: application/json" ^
  -d "{\"deviceId\":\"ESP32-CROSS-01\",\"type\":\"pedestrian\",\"payload\":{\"buttonPressed\":true,\"waitingCount\":3}}"
```

Setelah perintah dijalankan, angka dan status di layar Dashboard akan langsung berubah seketika!

---

## 9. Troubleshooting & Solusi Kendala Populer

### Kendala 1: Layar Kamera Hitam atau "Camera Disconnected"
- **Penyebab:** Kamera sedang digunakan oleh aplikasi lain (seperti Zoom, Microsoft Teams, WhatsApp, atau Camera Windows bawaan).
- **Solusi:** Tutup seluruh aplikasi yang memakai kamera, lalu klik tombol **[Webcam USB]** atau **[Kamera Laptop]** di dashboard untuk menghubungkan ulang.

### Kendala 2: Port 3000 atau Port 8088 Sudah Terpakai
- **Penyebab:** Ada proses lama yang belum ditutup sempurna.
- **Solusi:** Jalankan perintah PowerShell berikut untuk mematikan proses yang tertinggal:
  ```powershell
  # Cek proses pada port 3000 atau 8088
  Get-Process -Id (Get-NetTCPConnection -LocalPort 3000).OwningProcess -ErrorAction SilentlyContinue | Stop-Process -Force
  Get-Process -Id (Get-NetTCPConnection -LocalPort 8088).OwningProcess -ErrorAction SilentlyContinue | Stop-Process -Force
  ```

### Kendala 3: PowerShell Menolak Skrip (.venv Scripts Activate Dilarang)
- **Penyebab:** Kebijakan ExecutionPolicy bawaan Windows membatasi script PowerShell.
- **Solusi:** Buka PowerShell sebagai User dan ketik:
  ```powershell
  Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned
  ```
  Atau gunakan file `.venv\Scripts\python.exe main.py` secara langsung tanpa aktivasi.

### Kendala 4: Mobil Miniatur Belum Terdeteksi
- **Penyebab:** Miniatur mobil terlalu kecil di dalam frame atau pencahayaan terlalu gelap.
- **Solusi:**
  - Dekatkan kamera sedikit ke arah objek.
  - Pastikan mobil memiliki bentuk memanjang (rasio panjang terhadap lebar kendaraan proporsional).
  - Anda juga dapat menurunkan sedikit threshold di file `traffic-monitor/.env` menjadi `CONFIDENCE_THRESHOLD=0.22`.

### Kendala 5: Menghubungkan ESP32 Fisik di Jaringan WiFi
- Pastikan ESP32 dan laptop berada di satu jaringan WiFi yang sama (misal hotspot HP).
- Cari tahu alamat IP lokal laptop Anda dengan mengetik `ipconfig` di command prompt (misal: `192.168.1.50`).
- Pada firmware Arduino ESP32, ubah tujuan server ke IP tersebut:
  `http://192.168.1.50:3000/api/iot/telemetry`.

---

**Selamat Mengembangkan UrbanPulse Smart City Command Center!** 🚀
Jika ada pertanyaan tambahan atau penyesuaian fitur khusus, seluruh kode telah terdokumentasi rapi di folder `src/` dan `traffic-monitor/`.
