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
  name: 'Simpang Utama (YOLO11)',
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
  jarakKanan: 32.0,
  jarakKiri: 40.0,
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
    pinout: 'ADC: 36 (LDR), 39 (Gas) | GPIO: 4, 12, 14, 25, 26, 27, 32, 33, 34, 35 | SoftI2C LCD',
    status: 'Offline',
    lastPing: 'Siaga',
    connectionType: 'WiFi HTTP/MQTT',
    description: 'Unit mikrokontroler ESP32 MicroPython.',
  },
  {
    id: 'YOLO-CV-TRAFFIC-01',
    name: 'Kamera Lalu Lintas',
    type: 'Traffic AI Camera',
    pinout: 'Webcam / Port 8088',
    status: 'Offline',
    lastPing: 'Siaga',
    connectionType: 'Python MJPEG Stream',
    description: 'Detektor kendaraan simpang.',
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
    title: 'Siklus Penyeberangan',
    feature: 'penyeberangan',
    conditionText: 'Kanan <= 17cm | Kiri <= 25cm',
    actionText: 'Kuning 1s -> Merah 5s + Buzzer Pin 4 -> Tunggu Kosong',
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
