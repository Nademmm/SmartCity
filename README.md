# 🏙️ UrbanPulse - Smart City Command Center & IoT Mesh

Sistem Pusat Kendali Kota Pintar (*Autonomous Smart City Dashboard*) yang terintegrasi dengan perangkat keras IoT (ESP32, Sensor Polusi MQ-135/DHT22, Sensor Lampu PJU PIR/LDR, serta Lampu Lalu Lintas Adaptif ATSC).

---

## ⚡ Akses Cepat & Integrasi IoT

- 📖 **[Panduan Lengkap Integrasi Hardware IoT (IOT_INTEGRATION_GUIDE.md)](./IOT_INTEGRATION_GUIDE.md)**
- 💻 **[Folder Firmware ESP32 Arduino (.ino)](./firmware/)**

---

## 🚀 Memulai Dashboard (Development)

1. Jalankan aplikasi Next.js:
   ```bash
   npm run dev
   ```
2. Buka browser pada alamat:
   - **Local**: `http://localhost:3000`
   - **Network (untuk ESP32 di WiFi yang sama)**: `http://<IP_LAPTOP_ANDA>:3000`

---

## 📡 REST API Ingestion Endpoint

Dashboard UrbanPulse siap menerima data telemetri langsung dari mikrokontroler:

| Endpoint | Method | Fungsi |
| :--- | :--- | :--- |
| `/api/iot/telemetry` | `POST` | Ingestion data sensor fisik (Udara, PJU, Traffic, Pelican) |
| `/api/iot/telemetry` | `GET` | Membaca paket telemetri aktif terakhir |
| `/api/iot/control` | `POST` | Mengirim perintah aksi ke aktuator |
| `/api/iot/control?deviceId=...` | `GET` | Polling antrean perintah untuk ESP32 |
| `/api/iot/status` | `GET` | Health status gateway IoT |

### Contoh Kirim Data Sensor (cURL Test):
```bash
curl -X POST http://localhost:3000/api/iot/telemetry \
  -H "Content-Type: application/json" \
  -d '{"deviceId":"ESP32-AIR-01","type":"air-quality","payload":{"aqi":140,"pm25":65.2,"co":2.1,"co2":680,"temperature":32.0,"humidity":60.0}}'
```

---

## 📦 Sub-Sistem Smart City yang Tersedia

1. **Adaptive Traffic Signal Control (ATSC)**: Pengaturan siklus lampu lalu lintas cerdas berbasis kepadatan antrean.
2. **Smart Street Lighting (PJU)**: Lampu jalan otomatis hemat energi berbasis sensor gerak PIR dan cahaya LDR.
3. **Multi-Gas Air Quality & Weather Sensing**: Pemantauan indeks AQI, PM2.5, CO, CO2, suhu, dan kelembapan.
4. **Smart Pelican Crossing**: Sistem penyeberangan pejalan kaki cerdas dengan permintaan tombol dan buzzer.
5. **Autonomous Decision Engine**: Mesin otomasi respon darurat otomatis.
6. **Hardware Registry & Gateway**: Monitoring koneksi RSSI, IP, dan status online setiap node ESP32.
