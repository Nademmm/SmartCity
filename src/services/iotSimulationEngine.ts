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
  name: 'Simpang Utama (HotWheels AI)',
  density: 0,
  vehicleCount: 0,
  avgSpeedKmh: 0,
  queueLengthMeters: 0,
  currentLight: 'green',
  countdownSeconds: 30,
  isAutomatic: true,
  statusText: 'LANCAR',
  vehicleCounts: {
    motor: 0,
    mobil: 0,
    bus: 0,
    truk: 0,
  },
  streamUrl: 'http://localhost:8088/video_feed',
};

export const INITIAL_PJU: SmartPJUData = {
  ldrValue: 1250,
  thresholdLdr: 2000,
  kondisi: 'TERANG',
  pjuStatus: 'MATI',
  pjuMode: 'AUTO',
  ledMerah: false,
  ledPutih: false,
  pinLdr: 36,
  pinLedMerah: 25,
  pinLedPutih: 26,
  jamTerakhirBeralih: '06:00:00',
  siklusWaktu: 'SIANG',
};

export const INITIAL_CROSSING: SmartCrossingData = {
  touchKanan: false,
  touchKiri: false,
  pinTouchKanan: 17,
  pinTouchKiri: 16,
  waktuKuningKendaraan: 3,
  waktuKuningPejalan: 2,
  waktuMenyeberang: 10,
  siapMenyeberang: true,
  lampu: 'NORMAL',
  lampuKendaraan: 'HIJAU',
  lampuPejalan: 'MERAH',
  buzzer: false,
  countdownSeconds: 0,
  statusRingkasan: 'NORMAL',
  sumberTerakhir: undefined,
  pinKendaraanHijau: 12,
  pinKendaraanKuning: 14,
  pinKendaraanMerah: 32,
  pinPejalanMerah: 27,
  pinPejalanKuning: 33,
  pinPejalanHijau: 23,
  pinBuzzer: 4,
};

export const INITIAL_GAS: GasAirQualityData = {
  gasValue: 650,
  statusPolusi: 'UDARA BERSIH',
  pinGas: 39,
  thresholdBersih: 1000,
  thresholdSedang: 1500,
  gasMode: 'AUTO',
  isAlarmActive: false,
  isAlarmMuted: false,
  lastAlarmTime: undefined,
  lcdBaris1: 'Nilai MQ:  650  ',
  lcdBaris2: 'UDARA BERSIH    ',
  lcdTersedia: true,
};

export const INITIAL_DEVICES: IoTDevice[] = [
  {
    id: 'ESP32-MINIATURE',
    name: 'ESP32 Smart City Controller',
    type: 'ESP32 Miniatur IoT',
    pinout: 'ADC: 36 (LDR), 39 (Gas) | Touch: 16, 17 | TL Kendaraan: 12, 14, 32 | TL Pejalan: 27, 33, 23 | PJU: 25, 26 | Buzzer: 4 | SoftI2C LCD',
    status: 'Offline',
    lastPing: 'Siaga',
    connectionType: 'WiFi HTTP/MQTT',
    description: 'Unit mikrokontroler ESP32 MicroPython dengan Sensor Touch dan Dual Traffic Light.',
  },
  {
    id: 'YOLO-CV-TRAFFIC-01',
    name: 'Kamera Lalu Lintas',
    type: 'Traffic AI Camera',
    pinout: 'Webcam / Port 8088',
    status: 'Offline',
    lastPing: 'Siaga',
    connectionType: 'Python MJPEG Stream',
    description: 'Detektor kemacetan mobil miniatur.',
  },
];

export const INITIAL_RULES: AutomationRule[] = [
  {
    id: 'RULE-01',
    title: 'Smart PJU LDR',
    feature: 'pju',
    conditionText: 'LDR > 2000 (Mode AUTO)',
    actionText: 'LED Pin 25 & Pin 26 ON',
    isEnabled: true,
    triggerCount: 0,
  },
  {
    id: 'RULE-02',
    title: 'Penyeberangan Sensor Touch',
    feature: 'penyeberangan',
    conditionText: 'Touch Kanan (Pin 17) atau Kiri (Pin 16) HIGH',
    actionText: 'Kuning Kendaraan 3s -> Kuning Pejalan 2s -> Menyebrang 10s + Buzzer Pin 4 -> Kuning Penutup 2s -> Normal',
    isEnabled: true,
    triggerCount: 0,
  },
  {
    id: 'RULE-03',
    title: 'Alarm Gas MQ',
    feature: 'polusi',
    conditionText: 'Nilai Gas >= 1500 ADC',
    actionText: 'Buzzer Pin 4 Interval 800ms + LCD POLUSI TINGGI',
    isEnabled: true,
    triggerCount: 0,
  },
];

export const INITIAL_ALERTS: SystemAlert[] = [];

export const INITIAL_LOGS: SystemEventLog[] = [];
