# PANDUAN INTEGRASI HARDWARE ESP32 KE DASHBOARD SMARTCITY

Dokumen ini menjelaskan skema pinout perangkat keras ESP32 (MicroPython), protokol komunikasi serial dua arah (`COM3` / Web Serial), serta spesifikasi REST API pada sistem **SmartCity**.

---

## 1. Skema Pinout Lengkap ESP32 (MicroPython)

Seluruh fitur dijalankan secara serentak (non-blocking) oleh satu board **ESP32** menggunakan file [`firmware/main_thonny_micropython.py`](./firmware/main_thonny_micropython.py):

### A. Layar LCD I2C 16x2 (`SoftI2C` Auto-Scan)
| Pin LCD I2C | Pin ESP32 | Keterangan |
| :--- | :--- | :--- |
| **GND** | `GND` | Ground |
| **VCC** | `VIN` / `5V` | Tegangan kerja 5V |
| **SCL** | `GPIO 22` (atau `21` / `19`) | Dideteksi otomatis saat startup (`freq=100000`) |
| **SDA** | `GPIO 21` (atau `22` / `18`) | Dideteksi otomatis saat startup (`freq=100000`) |

### B. Sensor Gas MQ (Monitoring Polusi Udara)
| Pin Sensor MQ | Pin ESP32 | Keterangan |
| :--- | :--- | :--- |
| **VCC & GND** | `5V` & `GND` | Catu daya sensor |
| **AO (Analog Out)** | `GPIO 39` (`VN`) | Input ADC 12-bit (`0 - 4095`), `ADC.ATTN_11DB`, `BATAS_GAS = 1500` |

### C. Dua Sensor Ultrasonik HC-SR04 (Deteksi Penyeberang)
| Sensor | Pin Komponen | Pin ESP32 | Ambang Deteksi |
| :--- | :--- | :--- | :--- |
| **Ultrasonik Kanan** | `TRIG` / `ECHO` | `GPIO 32` (OUT) / `GPIO 34` (IN) | `BATAS_KANAN = 17 cm` |
| **Ultrasonik Kiri** | `TRIG` / `ECHO` | `GPIO 33` (OUT) / `GPIO 35` (IN) | `BATAS_KIRI = 25 cm` |

### D. Lampu Penyeberangan & Buzzer Dua Fungsi
| Komponen | Pin ESP32 | Fungsi |
| :--- | :--- | :--- |
| **LED Hijau Penyeberangan** | `GPIO 12` | Menyala saat fase `HIJAU` dan `TUNGGU_KOSONG` |
| **LED Kuning Penyeberangan** | `GPIO 14` | Menyala selama `1000 ms` saat transisi `KUNING` |
| **LED Merah Penyeberangan** | `GPIO 27` | Menyala selama `5000 ms` saat fase `MERAH` (orang menyeberang) |
| **Buzzer Aktif** | `GPIO 4` | Berbunyi untuk Alarm Gas (`INTERVAL_GAS = 800ms`) dan Pola Seberang (`POLA_SEBERANG`) |

### E. Sensor Cahaya LDR & Lampu Smart PJU
| Komponen | Pin ESP32 | Fungsi |
| :--- | :--- | :--- |
| **Sensor LDR (AO)** | `GPIO 36` (`VP`) | Input ADC 12-bit (`THRESHOLD_LDR = 2000`: `> 2000` Gelap, `<= 2000` Terang) |
| **LED Merah PJU** | `GPIO 25` | Menyala saat kondisi `GELAP` (mode `AUTO`) atau saat `CMD:PJU_ON` |
| **LED Putih PJU** | `GPIO 26` | Menyala saat kondisi `GELAP` (mode `AUTO`) atau saat `CMD:PJU_ON` |

---

## 2. Protokol Komunikasi Serial Dua Arah (`115200` Baud)

### A. Output Telemetri dari ESP32 ke Dashboard (`[JSON]`)
Pada akhir setiap siklus pembacaan, ESP32 mencetak satu baris JSON dengan awalan `[JSON]` melalui port serial USB:
```text
[JSON] {"gas": 650, "gasMode": "AUTO", "statusPolusi": "UDARA BERSIH", "jarakKanan": 35.0, "jarakKiri": 42.0, "orangKanan": false, "orangKiri": false, "lampu": "HIJAU", "ldr": 1200, "kondisi": "TERANG", "pjuStatus": "MATI", "pjuMode": "AUTO"}
```
Baris ini dibaca secara otomatis oleh `firmware/bridge_serial_to_dashboard.ps1` ataupun fitur **Web Serial API** di browser dan dikirimkan ke `/api/iot/telemetry`.

### B. Input Perintah dari Dashboard ke ESP32 (`CMD:*`)
ESP32 memeriksa perintah masuk tanpa menghentikan pembacaan sensor menggunakan `uselect.poll()` pada `sys.stdin`:

| Perintah | Aksi pada Firmware ESP32 |
| :--- | :--- |
| `CMD:PJU_ON` | Mengatur `pju_manual_mode = "ON"`, menyalakan `led_merah` (`Pin 25`) dan `led_putih` (`Pin 26`) |
| `CMD:PJU_OFF` | Mengatur `pju_manual_mode = "OFF"`, mematikan `led_merah` (`Pin 25`) dan `led_putih` (`Pin 26`) |
| `CMD:PJU_AUTO` | Mengatur `pju_manual_mode = "AUTO"`, kontrol kembali mengikuti sensor LDR (`Pin 36`) |
| `CMD:FORCE_CROSSING` | Memicu siklus penyeberangan (`fase_penyeberangan = "KUNING"`, lalu `"MERAH"`) |
| `CMD:CROSSING_RESET` | Mengembalikan `fase_penyeberangan = "HIJAU"` dan `siap_menyeberang = True` |
| `CMD:BUZZER_TEST` | Menyalakan buzzer (`Pin 4`) selama `300 ms` lalu mematikannya kembali |
| `CMD:BUZZER_MUTE` | Mematikan bunyi buzzer dan mereset alarm penyeberangan |
| `CMD:GAS_AUTO` | Mengembalikan pembacaan gas ke sensor fisik `ADC Pin 39` |
| `CMD:GAS_SET:<nilai>` | Mengatur nilai simulasi gas manual pada variabel `nilai_gas_manual` |

---

## 3. Spesifikasi Endpoint REST API SmartCity

### A. Kirim Telemetri (`POST /api/iot/telemetry`)
Contoh pengiriman paket gabungan (`miniature-all`):
```json
{
  "deviceId": "ESP32-MINIATURE",
  "type": "miniature-all",
  "payload": {
    "gas": {
      "gasValue": 650,
      "gasMode": "AUTO",
      "statusPolusi": "UDARA BERSIH"
    },
    "crossing": {
      "jarakKanan": 35.0,
      "jarakKiri": 42.0,
      "orangKanan": false,
      "orangKiri": false,
      "lampu": "HIJAU",
      "buzzer": false,
      "siapMenyeberang": true
    },
    "pju": {
      "ldrValue": 1200,
      "kondisi": "TERANG",
      "pjuStatus": "MATI",
      "pjuMode": "AUTO",
      "ledMerah": false,
      "ledPutih": false
    }
  }
}
```

### B. Kirim Perintah Kontrol (`POST /api/iot/control`)
```json
{
  "targetDeviceId": "ESP32-MINIATURE",
  "action": "CMD:FORCE_CROSSING"
}
```

### C. Polling Antrean Perintah (`GET /api/iot/control?deviceId=ESP32-MINIATURE`)
Mengembalikan daftar perintah berstatus `PENDING` untuk dieksekusi oleh jembatan serial ke port `COM3`, lalu menandainya sebagai `DISPATCHED`.
