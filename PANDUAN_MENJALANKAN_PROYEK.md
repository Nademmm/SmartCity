# PANDUAN LENGKAP MENJALANKAN SISTEM SMARTCITY ESP32 CONTROL CONSOLE

Panduan resmi dari instalasi awal hingga seluruh fitur perangkat keras MicroPython ESP32, Jembatan Serial USB (`COM3`), dan Kamera Pemantau Lalu Lintas (YOLO11 / Webcam Browser) beroperasi penuh.

---

## DAFTAR ISI

1. [Gambaran Arsitektur Sistem](#1-gambaran-arsitektur-sistem)
2. [Prasyarat Perangkat Lunak & Perangkat Keras](#2-prasyarat-perangkat-lunak--perangkat-keras)
3. [Instalasi Pertama Kali](#3-instalasi-pertama-kali)
4. [Cara Menjalankan Sistem](#4-cara-menjalankan-sistem)
5. [Panduan Modul Panel Kendali SmartCity](#5-panduan-modul-panel-kendali-smartcity)
   - [Modul 01: Polusi MQ & Layar LCD I2C 16x2](#modul-01-polusi-mq--layar-lcd-i2c-16x2)
   - [Modul 02: Penyeberangan Dual Ultrasonik & Buzzer](#modul-02-penyeberangan-dual-ultrasonik--buzzer)
   - [Modul 03: Smart PJU (Sensor LDR & Kendali Web)](#modul-03-smart-pju-sensor-ldr--kendali-web)
   - [Modul 04: Kamera Simpang & Lampu Lalu Lintas](#modul-04-kamera-simpang--lampu-lalu-lintas)
   - [Modul 05: Terminal Serial & Log Perintah](#modul-05-terminal-serial--log-perintah)
6. [Cara Upload Firmware MicroPython ke ESP32](#6-cara-upload-firmware-micropython-ke-esp32)
7. [Troubleshooting & Solusi Cepat](#7-troubleshooting--solusi-cepat)

---

## 1. Gambaran Arsitektur Sistem

Sistem **SmartCity** menghubungkan 3 komponen utama secara real-time:

```
┌────────────────────────────────────────────────────────┐
│               SMARTCITY CONTROL ECOSYSTEM              │
└────────────────────────────────────────────────────────┘
           ▲                                  ▲
           │ (Serial COM3 / Web Serial API)   │ (MJPEG Stream & HTTP POST)
           ▼                                  ▼
┌─────────────────────────┐        ┌─────────────────────────┐
│ MICROPYTHON ESP32       │        │ PYTHON AI CAMERA        │
│ (main_thonny_micro...)  │        │ (traffic-monitor/)      │
│ • LCD I2C 16x2 AutoScan │        │ • Model: YOLO11n        │
│ • Sensor Gas MQ (Pin39) │        │ • Port: 8088            │
│ • 2x Ultrasonik (32/33) │        │ • Deteksi Mobil/Motor   │
│ • LED Seberang (12/14/27│        └─────────────────────────┘
│ • Buzzer 2 Mode (Pin 4) │
│ • LDR (36) & PJU (25/26)│
└─────────────────────────┘
```

---

## 2. Prasyarat Perangkat Lunak & Perangkat Keras

| Komponen | Spesifikasi / Versi | Fungsi |
| :--- | :--- | :--- |
| **Node.js** | v18.0+ (disarankan v20+) | Menjalankan Next.js SmartCity Control Console |
| **Python** | v3.10+ (64-bit) | Menjalankan skrip uploader ESP32 & kamera AI YOLO11 |
| **Thonny IDE** | Versi terbaru (opsional) | Mengelola file MicroPython pada board ESP32 |
| **ESP32 Board** | ESP32 dengan firmware MicroPython | Mikrokontroler utama pengendali sensor dan LED |
| **Browser** | Google Chrome / Microsoft Edge | Mendukung penuh Web Serial API langsung dari browser |

---

## 3. Instalasi Pertama Kali

### Langkah 3.1: Install Dependensi Web Dashboard
Buka PowerShell di direktori proyek, lalu jalankan:
```powershell
npm install
```

### Langkah 3.2: Siapkan Lingkungan Python Kamera AI (Opsional)
Jika menggunakan fitur server kamera YOLO11 (`traffic-monitor/`):
```powershell
cd traffic-monitor
python -m venv .venv
.\.venv\Scripts\activate
pip install -r requirements.txt
```

---

## 4. Cara Menjalankan Sistem

### Opsi A: Jalankan Otomatis 1-Klik (`start_all.bat`)
Klik ganda file **`start_all.bat`** pada folder utama proyek. Skrip ini akan membuka:
1. **SmartCity Next.js Dashboard** pada `http://localhost:3000`
2. **SmartCity AI Camera Backend** pada `http://localhost:8088/video_feed`
3. **SmartCity IoT Serial Bridge** yang menghubungkan port `COM3` ke dashboard web.

### Opsi B: Jalankan Manual via Terminal
1. **Jalankan Web Dashboard**:
   ```powershell
   npm run dev
   ```
   Buka `http://localhost:3000` di browser.
2. **Hubungkan ESP32 ke Dashboard**:
   - **Cara 1 (Langsung dari Browser Chrome/Edge)**: Buka tab **Serial & Log** di navbar, lalu klik tombol **Sambungkan USB** dan pilih port `COM3`.*(Pastikan Thonny sedang ditutup agar port tidak terkunci).*
   - **Cara 2 (Melalui Jembatan PowerShell)**:
     ```powershell
     powershell -NoProfile -ExecutionPolicy Bypass -File firmware\bridge_serial_to_dashboard.ps1
     ```

---

## 5. Panduan Modul Panel Kendali SmartCity

Navigasi di bagian atas (Segmented Navbar) menyediakan akses langsung ke seluruh modul:

### Modul 01: Polusi MQ & Layar LCD I2C 16x2
- **Pin Fisik**: Sensor Gas MQ pada `ADC Pin 39` (`ATTN_11DB`), Layar LCD 16x2 I2C dideteksi otomatis pada pasangan pin `(SCL=22, SDA=21)`, `(21, 22)`, atau `(19, 18)`.
- **Klasifikasi Status**:
  - `< 1000 ADC`: `UDARA BERSIH`
  - `1000 - 1499 ADC`: `POLUSI SEDANG`
  - `>= 1500 ADC`: `POLUSI TINGGI` (mengaktifkan `alarm_gas` pada Buzzer Pin 4)
- **Kontrol Panel**: Geser slider ADC atau klik tombol preset `AUTO`, `650`, `1250`, `2100` untuk menguji respons LCD dan alarm.

### Modul 02: Penyeberangan Dual Ultrasonik & Buzzer
- **Pin Fisik**:
  - Ultrasonik Kanan: `TRIG Pin 32`, `ECHO Pin 34` (Ambang deteksi `<= 17 cm`).
  - Ultrasonik Kiri: `TRIG Pin 33`, `ECHO Pin 35` (Ambang deteksi `<= 25 cm`).
  - Lampu Penyeberangan: `LED Hijau Pin 12`, `LED Kuning Pin 14`, `LED Merah Pin 27`.
  - Buzzer: `GPIO Pin 4`.
- **Siklus 4 Fase Non-Blocking**:
  1. `HIJAU`: `LED 12 ON`, siap mendeteksi pejalan kaki (`siap_menyeberang = True`).
  2. `KUNING`: `LED 14 ON` selama `1000 ms` (`1 detik`) saat objek terdeteksi atau dipicu dari web.
  3. `MERAH`: `LED 27 ON` selama `5000 ms` (`5 detik`), `alarm_seberang = True` membunyikan pola buzzer penyeberangan.
  4. `TUNGGU_KOSONG`: `LED 12 ON`, sistem menunggu hingga kedua sensor ultrasonik tidak lagi mendeteksi objek sebelum mengaktifkan kembali `siap_menyeberang = True`.
- **Kontrol Panel**: Gunakan tombol **Paksa Merah** (`CMD:FORCE_CROSSING`), **Kanan 12cm**, **Kiri 18cm**, atau **Reset Hijau** (`CMD:CROSSING_RESET`).

### Modul 03: Smart PJU (Sensor LDR & Kendali Web)
- **Pin Fisik**: Sensor LDR pada `ADC Pin 36` (`THRESHOLD_LDR = 2000`), `LED Merah Pin 25`, dan `LED Putih Pin 26`.
- **3 Mode Kendali (`pju_manual_mode`)**:
  - **PJU AUTO** (`CMD:PJU_AUTO`): Mengikuti sensor LDR (`> 2000` = `GELAP` -> kedua LED menyala; `<= 2000` = `TERANG` -> kedua LED mati).
  - **PJU ON** (`CMD:PJU_ON`): Menyalakan paksa `Pin 25` dan `Pin 26` dari web.
  - **PJU OFF** (`CMD:PJU_OFF`): Mematikan paksa `Pin 25` dan `Pin 26` dari web.

### Modul 04: Kamera Simpang & Lampu Lalu Lintas
- Mendukung stream langsung dari server Python YOLO11 (`Port 8088`) maupun **Webcam Browser** (WebRTC) lengkap dengan pengaturan mode sinyal `AUTO` / `MANUAL` dan tombol `Prioritas Hijau Darurat`.

### Modul 05: Terminal Serial & Log Perintah
- Menampilkan aliran data serial `[JSON]` dari ESP32 secara langsung, dilengkapi tombol cepat (`PJU ON`, `PJU OFF`, `PJU AUTO`, `FORCE CROSSING`, `BUZZER TEST`, `RESET HIJAU`, `GAS AUTO`) dan kolom input perintah manual.

---

## 6. Cara Upload Firmware MicroPython ke ESP32

Kode program MicroPython terbaru tersimpan di [`firmware/main_thonny_micropython.py`](./firmware/main_thonny_micropython.py).

### Melalui Skrip Otomatis:
Pastikan Thonny dan jembatan serial sedang ditutup, lalu jalankan:
```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File firmware\upload_to_esp32.ps1
```

### Melalui Thonny IDE:
1. Buka file `firmware/main_thonny_micropython.py` di Thonny IDE.
2. Pastikan file pustaka `lcd_api.py` dan `i2c_lcd.py` sudah tersimpan di dalam penyimpanan MicroPython device.
3. Simpan `main_thonny_micropython.py` ke dalam ESP32 dengan nama **`main.py`** agar otomatis berjalan saat ESP32 dinyalakan.

---

## 7. Troubleshooting & Solusi Cepat

1. **Port COM3 Sibuk / Access Denied**:
   - Hanya **satu** program yang boleh membuka port `COM3` pada satu waktu. Jika ingin menghubungkan ESP32 ke Dashboard Web (baik via `bridge_serial_to_dashboard.ps1` maupun tombol `Sambungkan USB` di browser), **tutup aplikasi Thonny IDE** terlebih dahulu.
2. **LCD 16x2 Tidak Menampilkan Teks**:
   - Firmware sudah dilengkapi fitur auto-scan `SoftI2C` pada pasangan pin `(22, 21)`, `(21, 22)`, dan `(19, 18)`. Periksa log serial saat boot: pastikan muncul pesan `[I2C OK] Terdeteksi pada SCL=..., SDA=...`. Jika kontras layar terlalu redup, putar potensiometer biru di belakang modul I2C LCD.
