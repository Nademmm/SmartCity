export type SubsystemType =
  | 'overview'
  | 'air-quality'
  | 'pedestrian'
  | 'lighting'
  | 'traffic'
  | 'alerts';

export type TrafficLightColor = 'green' | 'yellow' | 'red';

export type CrossingPhase = 'HIJAU' | 'KUNING' | 'MERAH' | 'TUNGGU_KOSONG';

export type BuzzerMode = 'none' | 'gas' | 'seberang' | 'both';

// Fitur Kamera AI YOLO11 / Browser Vision
export interface CameraTrafficData {
  id: string;
  name: string;
  density: number; // 0 - 100%
  vehicleCount: number;
  avgSpeedKmh: number;
  queueLengthMeters: number;
  currentLight: TrafficLightColor;
  countdownSeconds: number;
  isAutomatic: boolean;
  statusText: 'LANCAR' | 'SEDANG' | 'PADAT' | 'MACET TOTAL';
  vehicleCounts?: {
    motor?: number;
    mobil?: number;
    bus?: number;
    truk?: number;
  };
  streamUrl: string;
}

// Fitur 5: Smart PJU (Otomatis LDR Pin 36 / Kontrol Web Manual ON, OFF, AUTO)
export interface SmartPJUData {
  ldrValue: number; // ADC Pin 36 (0 - 4095)
  thresholdLdr: number; // Default 2000
  kondisi: 'GELAP' | 'TERANG' | 'MANUAL_ON' | 'MANUAL_OFF';
  pjuStatus: 'MENYALA' | 'MATI';
  pjuMode: 'AUTO' | 'ON' | 'OFF';
  ledMerah: boolean; // Pin 25
  ledPutih: boolean; // Pin 26
  pinLdr: number; // 36
  pinLedMerah: number; // 25
  pinLedPutih: number; // 26
  jamTerakhirBeralih?: string;
  siklusWaktu?: 'SIANG' | 'MALAM';
}

// Fitur 2, 3, 4: Smart Penyeberangan (2 Ultrasonik, 4 Fase Lampu, Buzzer Pin 4)
export interface SmartCrossingData {
  jarakKanan: number | null; // cm (TRIG 32, ECHO 34)
  jarakKiri: number | null; // cm (TRIG 33, ECHO 35)
  batasKanan: number; // 17 cm
  batasKiri: number; // 25 cm
  waktuKuning: number; // 1 detik (1000 ms)
  waktuMenyeberang: number; // 5 detik (5000 ms)
  siapMenyeberang: boolean;
  orangKanan: boolean;
  orangKiri: boolean;
  lampu: CrossingPhase; // HIJAU | KUNING | MERAH | TUNGGU_KOSONG
  buzzer: boolean; // Pin 4
  countdownSeconds: number;
  statusRingkasan: 'AMAN' | 'ORANG TERDETEKSI' | 'ORANG MENYEBRANG' | 'MENUNGGU KOSONG';
  pinTrigKanan: number; // 32
  pinEchoKanan: number; // 34
  pinTrigKiri: number; // 33
  pinEchoKiri: number; // 35
  pinLedHijau: number; // 12
  pinLedKuning: number; // 14
  pinLedMerah: number; // 27
  pinBuzzer: number; // 4
}

// Fitur 1: Monitoring Polusi MQ (ADC Pin 39) + LCD SoftI2C 16x2
export interface GasAirQualityData {
  gasValue: number; // ADC Pin 39 (0 - 4095)
  statusPolusi: 'UDARA BERSIH' | 'POLUSI SEDANG' | 'POLUSI TINGGI';
  pinGas: number; // 39
  thresholdBersih: number; // 1000
  thresholdSedang: number; // 1500 (BATAS_GAS)
  gasMode: 'AUTO' | 'MANUAL';
  isAlarmActive: boolean;
  isAlarmMuted?: boolean;
  lastAlarmTime?: string;
  lcdBaris1: string; // "Nilai MQ: {:4d}  "
  lcdBaris2: string; // "{:<16}" (UDARA BERSIH / POLUSI SEDANG / POLUSI TINGGI)
  lcdTersedia: boolean;
}

export type DeviceType =
  | 'ESP32 Miniatur IoT'
  | 'Traffic AI Camera'
  | 'Sensor Polusi Gas MQ'
  | 'Sensor Ultrasonik Penyeberangan'
  | 'Sensor Cahaya LDR PJU';

export type DeviceStatus = 'Online' | 'Offline' | 'Warning';

export interface IoTDevice {
  id: string;
  name: string;
  type: DeviceType;
  pinout: string;
  status: DeviceStatus;
  lastPing: string;
  connectionType: 'WiFi HTTP/MQTT' | 'Python MJPEG Stream' | 'GPIO Internal';
  description: string;
}

export interface AutomationRule {
  id: string;
  title: string;
  feature: 'polusi' | 'penyeberangan' | 'pju' | 'traffic';
  conditionText: string;
  actionText: string;
  isEnabled: boolean;
  triggerCount: number;
  lastTriggered?: string;
}

export type AlertSeverity = 'CRITICAL' | 'WARNING' | 'INFO';

export interface SystemAlert {
  id: string;
  timestamp: string;
  severity: AlertSeverity;
  subsystem: string;
  title: string;
  description: string;
  isRead: boolean;
  isResolved: boolean;
}

export interface SystemEventLog {
  id: string;
  timestamp: string;
  subsystem: string;
  event: string;
  details: string;
  type: 'AUTO' | 'HARDWARE' | 'MANUAL';
}
