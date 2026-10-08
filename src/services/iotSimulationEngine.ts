import {
  CameraTrafficData,
  SmartPJUData,
  SmartCrossingData,
  GasAirQualityData,
  IoTDevice,
  AutomationRule,
  SystemAlert,
  SystemEventLog,
} from '@/types/iot';

export const INITIAL_TRAFFIC: CameraTrafficData = {
  id: 'TRF-CAM-01',
  name: 'Simpang Utama (AI Camera YOLO11)',
  density: 35,
  vehicleCount: 6,
  avgSpeedKmh: 42,
  queueLengthMeters: 18,
  currentLight: 'green',
  countdownSeconds: 24,
  isAutomatic: true,
  statusText: 'LANCAR',
  vehicleCounts: {
    motor: 4,
    mobil: 2,
    bus: 0,
    truk: 0,
  },
  streamUrl: 'http://localhost:8088/video_feed',
};

export const INITIAL_PJU: SmartPJUData = {
  ldrValue: 1250, // Nilai ADC (0 - 4095)
  thresholdLdr: 2000,
  kondisi: 'TERANG',
  pjuStatus: 'MATI',
  ledMerah: false,
  ledPutih: false,
  pinLdr: 36,
  pinLedMerah: 25,
  pinLedPutih: 26,
};

export const INITIAL_CROSSING: SmartCrossingData = {
  jarakKanan: 32.4,
  jarakKiri: 41.2,
  batasKanan: 17,
  batasKiri: 25,
  waktuKuning: 1,
  waktuMenyeberang: 5,
  siapMenyeberang: true,
  orangKanan: false,
  orangKiri: false,
  lampu: 'HIJAU',
  buzzer: false,
  countdownSeconds: 0,
  statusRingkasan: 'AMAN',
  pinTrigKanan: 32,
  pinEchoKanan: 34,
  pinTrigKiri: 33,
  pinEchoKiri: 35,
  pinLedHijau: 12,
  pinLedKuning: 14,
  pinLedMerah: 27,
  pinBuzzer: 13,
};

export const INITIAL_GAS: GasAirQualityData = {
  gasValue: 680, // Nilai ADC
  statusPolusi: 'UDARA BERSIH',
  pinGas: 39,
  thresholdBersih: 1000,
  thresholdSedang: 1500,
};

export const INITIAL_DEVICES: IoTDevice[] = [
  {
    id: 'ESP32-MINIATURE',
    name: 'ESP32 Smart City Miniatur (Thonny)',
    type: 'ESP32 Miniatur IoT',
    pinout: 'ADC: 36 (LDR), 39 (Gas) | GPIO: 12, 14, 27, 25, 26, 13, 32, 34, 33, 35',
    status: 'Offline',
    lastPing: 'Belum Terhubung',
    connectionType: 'WiFi HTTP/MQTT',
    description: 'Controller utama miniatur IoT yang menjalankan MicroPython dengan 3 fitur terintegrasi.',
  },
  {
    id: 'YOLO-CV-TRAFFIC-01',
    name: 'AI Camera Traffic Monitor (OpenCV)',
    type: 'Traffic AI Camera',
    pinout: 'USB Webcam Laptop (Stream Port 8088)',
    status: 'Offline',
    lastPing: 'Menunggu Feed',
    connectionType: 'Python MJPEG Stream',
    description: 'Computer vision detector menggunakan YOLO11 untuk klasifikasi kendaraan pada maket dengan USB webcam laptop.',
  },
  {
    id: 'SENSOR-GAS-39',
    name: 'Sensor Gas / MQ (Polusi)',
    type: 'Sensor Polusi Gas MQ',
    pinout: 'ADC Pin 39 (ATTN 11dB)',
    status: 'Offline',
    lastPing: 'Menunggu ESP32',
    connectionType: 'GPIO Internal',
    description: 'Sensor analog gas untuk pemantauan kualitas udara perkotaan (Bersih, Sedang, Tinggi).',
  },
  {
    id: 'SENSOR-US-CROSSING',
    name: 'Dual Ultrasonik Penyeberangan',
    type: 'Sensor Ultrasonik Penyeberangan',
    pinout: 'Kanan: Pin 32/34 (Batas: 17 cm) | Kiri: Pin 33/35 (Batas: 25 cm)',
    status: 'Offline',
    lastPing: 'Menunggu ESP32',
    connectionType: 'GPIO Internal',
    description: '2 sensor ultrasonik pendeteksi pejalan kaki dengan batas deteksi kanan 17 cm dan kiri 25 cm.',
  },
  {
    id: 'SENSOR-LDR-PJU',
    name: 'Sensor Cahaya LDR & Smart PJU',
    type: 'Sensor Cahaya LDR PJU',
    pinout: 'LDR Pin 36 | LED Merah Pin 25 | LED Putih Pin 26',
    status: 'Offline',
    lastPing: 'Menunggu ESP32',
    connectionType: 'GPIO Internal',
    description: 'Otomatisasi lampu PJU menyalakan LED Merah & Putih saat kondisi gelap (LDR > 2000).',
  },
];

export const INITIAL_RULES: AutomationRule[] = [
  {
    id: 'RULE-01',
    title: 'Smart PJU Otomatis (Sensor Cahaya LDR)',
    feature: 'pju',
    conditionText: 'Nilai LDR > 2000 (Kondisi Gelap)',
    actionText: 'LED Merah (Pin 25) & LED Putih (Pin 26) MENYALA otomatis',
    isEnabled: true,
    triggerCount: 42,
    lastTriggered: 'Baru saja',
  },
  {
    id: 'RULE-02',
    title: 'Smart Penyeberangan (Sensor Ultrasonik Kanan / Kiri)',
    feature: 'penyeberangan',
    conditionText: 'Jarak Kanan <= 17 cm ATAU Jarak Kiri <= 25 cm',
    actionText: 'Lampu Kuning (1s) -> Lampu Merah (5s) + Buzzer Nada -> Kunci hingga area kosong',
    isEnabled: true,
    triggerCount: 18,
    lastTriggered: '10m lalu',
  },
  {
    id: 'RULE-03',
    title: 'Peringatan Polusi Udara (Sensor Gas / MQ)',
    feature: 'polusi',
    conditionText: 'Nilai Gas >= 1000 (Sedang) atau Nilai Gas >= 1500 (Tinggi)',
    actionText: 'Pemberitahuan darurat kualitas udara & status waspada perkotaan',
    isEnabled: true,
    triggerCount: 7,
    lastTriggered: '25m lalu',
  },
  {
    id: 'RULE-04',
    title: 'Adaptive Traffic Signal (Kamera AI YOLO11)',
    feature: 'traffic',
    conditionText: 'Kepadatan Lalu Lintas Kamera > 70%',
    actionText: 'Perpanjang durasi lampu hijau kendaraan untuk mengurai antrean',
    isEnabled: true,
    triggerCount: 29,
    lastTriggered: '5m lalu',
  },
];

export const INITIAL_ALERTS: SystemAlert[] = [];

export const INITIAL_LOGS: SystemEventLog[] = [];
