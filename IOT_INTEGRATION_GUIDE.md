# 🚀 PANDUAN LENGKAP INTEGRASI HARDWARE IoT KE DASHBOARD URBANPULSE

Dokumen ini menjelaskan langkah demi langkah cara menghubungkan perangkat keras fisik (seperti **ESP32, NodeMCU, Arduino, Sensor Kualitas Udara, Sensor Gerak PJU, dan Lampu Lalu Lintas**) langsung ke sistem **UrbanPulse Smart City**.

---

## 📑 DAFTAR ISI
1. [Ringkasan Arsitektur](#1-ringkasan-arsitektur)
2. [Peralatan Hardware yang Dibutuhkan](#2-peralatan-hardware-yang-dibutuhkan)
3. [Dua Jalur Komunikasi (Pilih Salah Satu)](#3-dua-jalur-komunikasi-pilih-salah-satu)
4. [Endpoint REST API UrbanPulse (Tersedia Bawaan)](#4-endpoint-rest-api-urbanpulse)
5. [Skema Wiring & Pinout Sensor ESP32](#5-skema-wiring--pinout-sensor-esp32)
6. [Firmware Arduino/ESP32 Siap Pakai](#6-firmware-arduinoesp32-siap-pakai)
7. [Uji Coba Pengiriman Data Tanpa Alat (Simulasi via cURL / Postman)](#7-uji-coba-pengiriman-data-tanpa-alat)
8. [Troubleshooting & Checklist](#8-troubleshooting--checklist)

---

## 1. Ringkasan Arsitektur

UrbanPulse dirancang dengan sistem **Plug and Play**. Data dapat dikirimkan dari mikrokontroler melalui jaringan WiFi lokal ataupun internet:

```
[ Sensor Fisik ] 
       │
       ▼
 [ ESP32 Microcontroller ]
       │
       ├──► (Jalur 1: HTTP POST via WiFi) ──► Next.js API [/api/iot/telemetry] ──► Dashboard UI
       │
       └──► (Jalur 2: MQTT Publish)      ──► Broker (EMQX/HiveMQ)             ──► Dashboard UI
```

---

## 2. Peralatan Hardware yang Dibutuhkan

Untuk membuat prototipe sistem Smart City lengkap (tingkat SMK / Proyek IoT):

| Sub-Sistem | Komponen Utama | Sensor & Aktuator |
| :--- | :--- | :--- |
| **Node 1: Kualitas Udara** | ESP32 Dev Module | Sensor Debu/Gas MQ-135, Sensor Suhu/Kelembaban DHT22 |
| **Node 2: Lampu Jalan Pintar (PJU)** | ESP32 Dev Module | Sensor Gerak PIR (HC-SR501), Sensor Cahaya LDR, LED / Relay Dimmer |
| **Node 3: Lampu Lalu Lintas Pintar (ATSC)** | ESP32 Dev Module | Sensor Jarak Ultrasonic (HC-SR04) atau Radar, Modul LED Traffic (Merah, Kuning, Hijau) |
| **Node 4: Penyeberangan Pintar (Pelican)** | ESP32 / Arduino Nano | Push Button Fisik, Buzzer Peringatan, LED Walk/Wait |

---

## 3. Dua Jalur Komunikasi (Pilih Salah Satu)

### Jalur A: HTTP REST API (Paling Mudah, Tanpa Perlu Broker Tambahan)
- ESP32 terkoneksi ke WiFi yang sama dengan laptop/server dashboard.
- ESP32 mengirim data dengan metode `HTTP POST` berformat JSON ke alamat IP laptop Anda (misal `http://192.168.1.50:3000/api/iot/telemetry`).
- **Kelebihan**: Sangat mudah diprogram pada Arduino IDE, tidak membutuhkan server MQTT eksternal.

### Jalur B: MQTT Broker (Kecepatan Tinggi & Realtime Dua Arah)
- ESP32 dan Dashboard terhubung ke broker MQTT publik (seperti `broker.emqx.io` port `1883` atau `broker.hivemq.com`).
- ESP32 menerbitkan (publish) data sensor ke topik: `urbanpulse/telemetry/<jenis_sensor>`.
- ESP32 mendengarkan (subscribe) perintah kontrol dari dashboard pada topik: `urbanpulse/control/<device_id>`.
- **Kelebihan**: Respon instan (sub-detik), sangat hemat bandwidth, mendukung kendali balik aktuator.

---

## 4. Endpoint REST API UrbanPulse

Sistem Next.js UrbanPulse telah dilengkapi dengan API Ingestion siap pakai:

### A. Kirim Data Sensor (Telemetry Ingestion)
- **URL**: `http://<IP_SERVER>:3000/api/iot/telemetry`
- **Metode**: `POST`
- **Headers**: `Content-Type: application/json`

#### Contoh Payload 1: Kualitas Udara
```json
{
  "deviceId": "ESP32-AIR-01",
  "type": "air-quality",
  "zone": "Kawasan Industri & Sudirman",
  "payload": {
    "aqi": 84,
    "pm25": 38.5,
    "co": 1.4,
    "co2": 520,
    "temperature": 31.2,
    "humidity": 68.0
  }
}
```

#### Contoh Payload 2: Lampu Jalan PJU
```json
{
  "deviceId": "ESP32-PJU-01",
  "type": "pju",
  "nodeId": "pju-1",
  "payload": {
    "brightness": 90,
    "powerWatts": 120,
    "motionDetected": true,
    "status": "optimal"
  }
}
```

#### Contoh Payload 3: Kepadatan Lalu Lintas
```json
{
  "deviceId": "ESP32-TRAFFIC-01",
  "type": "traffic",
  "intersectionId": "int-1",
  "payload": {
    "density": 78,
    "vehicleCount": 1450,
    "avgSpeedKmh": 24,
    "queueLengthMeters": 140,
    "currentLight": "green"
  }
}
```

---

### B. Kirim Perintah Kontrol / Aksi Aktuator
- **URL**: `http://<IP_SERVER>:3000/api/iot/control`
- **Metode**: `POST`
- **Format Body**:
```json
{
  "targetDeviceId": "ESP32-PJU-01",
  "action": "SET_BRIGHTNESS",
  "value": 100,
  "timestamp": "2026-09-20T14:30:00Z"
}
```

---

## 5. Skema Wiring & Pinout Sensor ESP32

### A. Node Sensor Kualitas Udara (MQ-135 + DHT22)
| Pin ESP32 | Pin Komponen | Keterangan |
| :--- | :--- | :--- |
| **VIN / 5V** | VCC Sensor MQ-135 & DHT22 | Sumber daya sensor |
| **GND** | GND MQ-135 & DHT22 | Ground |
| **GPIO 34 (Analog)** | Pin AO (Analog Out) MQ-135 | Pembacaan kadar gas |
| **GPIO 4 (Digital)** | Pin DATA DHT22 | Pembacaan Suhu & Kelembaban |

---

### B. Node Lampu Jalan Pintar (PIR Sensor + PWM LED)
| Pin ESP32 | Pin Komponen | Keterangan |
| :--- | :--- | :--- |
| **3V3 / 5V** | VCC Sensor PIR HC-SR501 | Daya sensor gerak |
| **GND** | GND PIR & Katoda LED (-) | Ground |
| **GPIO 13 (Input)** | Pin OUT Sensor PIR | Deteksi pejalan/kendaraan lewat |
| **GPIO 25 (PWM Output)** | Anoda LED (+) via resistor 220Ω | Kontrol kecerahan lampu PJU |

---

### C. Node Lampu Lalu Lintas Adaptif (Ultrasonic + Traffic LED)
| Pin ESP32 | Pin Komponen | Keterangan |
| :--- | :--- | :--- |
| **5V & GND** | VCC & GND HC-SR04 & LED Modul | Daya |
| **GPIO 5 (Output)** | Pin TRIG Ultrasonic | Trigger pulsa suara |
| **GPIO 18 (Input)** | Pin ECHO Ultrasonic | Penerima pantulan pulsa |
| **GPIO 19** | LED Merah | Lampu Berhenti |
| **GPIO 21** | LED Kuning | Lampu Hati-Hati |
| **GPIO 22** | LED Hijau | Lampu Jalan |

---

## 6. Firmware Arduino/ESP32 Siap Pakai

Semua kode program lengkap untuk di-upload melalui **Arduino IDE** telah kami sediakan di dalam folder:
`firmware/`

1. `firmware/esp32_air_quality.ino` : Node Sensor Udara & Emisi Gas.
2. `firmware/esp32_smart_pju.ino` : Node Lampu Jalan Otomatis Adaptif.
3. `firmware/esp32_traffic_light.ino` : Node Lampu Lalu Lintas Cerdas.
4. `firmware/esp32_pelican_crossing.ino` : Node Tombol Penyeberangan Pejalan Kaki.

### Langkah Upload ke ESP32:
1. Buka aplikasi **Arduino IDE**.
2. Masuk ke menu `File` > `Preferences`, tambahkan URL Board ESP32:
   `https://raw.githubusercontent.com/espressif/arduino-esp32/gh-pages/package_esp32_index.json`
3. Masuk ke `Tools` > `Manage Libraries`, pasang library berikut:
   - **ArduinoJson** (oleh Benoit Blanchon)
   - **DHT sensor library** (oleh Adafruit)
4. Buka salah satu file `.ino` di folder `firmware/`.
5. Sesuaikan nama WiFi (`ssid`), password WiFi, serta alamat IP Laptop Anda (`serverUrl`).
6. Sambungkan kabel USB ke ESP32 dan klik tombol **Upload**.

---

## 7. Uji Coba Pengiriman Data Tanpa Alat (Simulasi via cURL / Postman)

Anda dapat menguji apakah sistem UrbanPulse berhasil menerima data dengan menjalankan perintah berikut di terminal (PowerShell atau Command Prompt):

```powershell
curl -X POST http://localhost:3000/api/iot/telemetry `
  -H "Content-Type: application/json" `
  -d '{
    "deviceId": "TEST-NODE-01",
    "type": "air-quality",
    "zone": "Kawasan Industri",
    "payload": {
      "aqi": 185,
      "pm25": 110.2,
      "co": 3.8,
      "co2": 890,
      "temperature": 34.5,
      "humidity": 55.0
    }
  }'
```

Setelah perintah tersebut dieksekusi, status kualitas udara pada dashboard UrbanPulse akan seketika berubah warna menjadi merah (Peringatan Kritis / Polusi Tinggi).

---

## 8. Troubleshooting & Checklist

- [ ] **Laptop dan ESP32 harus berada di jaringan WiFi yang sama**.
- [ ] **Cek IP Laptop**: Buka terminal dan ketik `ipconfig`, cari bagian *IPv4 Address* (contoh: `192.168.1.15`). Gunakan IP ini di kode ESP32, jangan gunakan `localhost` karena ESP32 tidak mengenali localhost laptop.
- [ ] **Pastikan port 3000 tidak terblokir Windows Firewall**: Jika ESP32 gagal mengirim HTTP (error code `-1`), berikan izin port 3000 pada Windows Defender Firewall.
- [ ] **Cek Serial Monitor Arduino IDE** pada kecepatan baud `115200` untuk melihat status koneksi WiFi dan status HTTP response code dari dashboard.
