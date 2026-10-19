export type SubsystemType = 
  | 'overview' 
  | 'traffic' 
  | 'lighting' 
  | 'pedestrian' 
  | 'air-quality' 
  | 'iot-devices' 
  | 'automation' 
  | 'alerts';

export type TrafficLightColor = 'green' | 'yellow' | 'red';

// Fitur 4: Smart Traffic dari Kamera AI YOLO11
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

// Fitur 3: Smart PJU Otomatis (Sensor LDR & LED Merah + LED Putih)
export interface SmartPJUData {
  ldrValue: number; // ADC Pin 36 (0 - 4095)
  thresholdLdr: number; // Default 2000
  kondisi: 'GELAP' | 'TERANG' | 'MANUAL_ON' | 'MANUAL_OFF';
  pjuStatus: 'MENYALA' | 'MATI';
  pjuMode?: 'AUTO' | 'ON' | 'OFF';
  ledMerah: boolean; // Pin 25
  ledPutih: boolean; // Pin 26
  pinLdr: number; // 36
  pinLedMerah: number; // 25
  pinLedPutih: number; // 26
  jamTerakhirBeralih?: string; // Waktu terakhir beralih kondisi
  siklusWaktu?: 'SIANG' | 'MALAM';
}

// Fitur 2: Smart Penyeberangan (2 Ultrasonik, LED Hijau/Kuning/Merah, Buzzer)
export interface SmartCrossingData {
  jarakKanan: number | null; // cm (TRIG 32, ECHO 34)
  jarakKiri: number | null; // cm (TRIG 33, ECHO 35)
  batasKanan: number; // Default 17 cm
  batasKiri: number; // Default 25 cm
  waktuKuning: number; // Default 1 detik
  waktuMenyeberang: number; // Default 5 detik
  siapMenyeberang: boolean; // Lock: mencegah pemicuan ulang sampai area kosong
  orangKanan: boolean;
  orangKiri: boolean;
  lampu: 'HIJAU' | 'KUNING' | 'MERAH'; // LED Pin 12 (Hijau), Pin 14 (Kuning), Pin 27 (Merah)
  buzzer: boolean; // Pin 13
  countdownSeconds: number; // Sisa waktu menyeberang (5s saat merah)
  statusRingkasan: 'AMAN' | 'ORANG TERDETEKSI' | 'ORANG MENYEBRANG' | 'MENUNGGU KOSONG';
  pinTrigKanan: number; // 32
  pinEchoKanan: number; // 34
  pinTrigKiri: number; // 33
  pinEchoKiri: number; // 35
  pinLedHijau: number; // 12
  pinLedKuning: number; // 14
  pinLedMerah: number; // 27
  pinBuzzer: number; // 13
}

// Fitur 1: Monitoring Polusi Udara (Sensor Gas/MQ ADC Pin 39)
export interface GasAirQualityData {
  gasValue: number; // ADC Pin 39 (0 - 4095)
  statusPolusi: 'UDARA BERSIH' | 'POLUSI SEDANG' | 'POLUSI TINGGI';
  pinGas: number; // 39
  thresholdBersih: number; // 1000
  thresholdSedang: number; // 1500
  gasMode?: 'AUTO' | 'MANUAL';
  isAlarmActive?: boolean;
  isAlarmMuted?: boolean;
  lastAlarmTime?: string;
  ledPolusi?: boolean; // Pin 18 (Peringatan Polusi)
  ledBersih?: boolean; // Pin 19 (Udara Bersih)
  lcdBaris1?: string;  // Teks baris 1 monitor hijau LCD 16x2
  lcdBaris2?: string;  // Teks baris 2 monitor hijau LCD 16x2
  lcdTersedia?: boolean;
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
