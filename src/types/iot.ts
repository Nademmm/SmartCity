export type SubsystemType = 
  | 'overview' 
  | 'traffic' 
  | 'lighting' 
  | 'pedestrian' 
  | 'air-quality' 
  | 'iot-devices' 
  | 'automation' 
  | 'alerts' 
  | 'analytics' 
  | 'settings';

export type TrafficLightState = 'red' | 'yellow' | 'green';

export interface TrafficIntersection {
  id: string;
  name: string;
  density: number; // 0 - 100%
  vehicleCount: number;
  avgSpeedKmh: number;
  queueLengthMeters: number;
  currentLight: TrafficLightState;
  countdownSeconds: number;
  isAutomatic: boolean;
  greenExtensionSeconds: number;
  manualPhases: {
    red: number;
    yellow: number;
    green: number;
  };
  emergencyPriorityActive: boolean;
  statusText: 'LANCAR' | 'SEDANG' | 'PADAT' | 'MACET TOTAL';
}

export interface PJUNode {
  id: string;
  name: string;
  location: string;
  brightness: number; // 0 - 100%
  powerWatts: number;
  status: 'optimal' | 'energy_saving' | 'standby' | 'fault';
  motionDetected: boolean;
  isAutomatic: boolean;
  coordinates: { x: number; y: number };
  lastMotionTime?: string;
}

export interface PedestrianCrossing {
  id: string;
  location: string;
  pedestrianCount: number;
  waitingCount: number;
  status: 'NORMAL' | 'MODERATE' | 'HIGH ACTIVITY';
  pelicanState: 'WALK' | 'WAIT';
  countdownSeconds: number;
  autoTriggerThreshold: number;
  isTriggered: boolean;
}

export interface AirQualityData {
  id: string;
  zone: string;
  aqi: number;
  pm25: number; // ug/m3
  co: number; // ppm
  co2: number; // ppm
  no2: number; // ppb
  temperature: number; // Celsius
  humidity: number; // %
  status: 'Good' | 'Moderate' | 'Unhealthy' | 'Very Unhealthy' | 'Hazardous';
  mitigationActive: boolean;
  mistingCannonsActive: boolean;
  trafficDiversionRecommended: boolean;
}

export type DeviceType = 'Traffic Sensor' | 'PJU Sensor' | 'Air Sensor' | 'Pedestrian Radar' | 'IoT Gateway';
export type DeviceStatus = 'Online' | 'Offline' | 'Warning' | 'Maintenance';

export interface IoTDevice {
  id: string;
  name: string;
  type: DeviceType;
  location: string;
  status: DeviceStatus;
  signalRssi: number; // 0 - 100%
  batteryLevel?: number; // 0 - 100% or mains
  isMainsPowered: boolean;
  lastPing: string;
  ipAddress: string;
  mqttTopic: string;
  firmwareVersion: string;
  coordinates: { x: number; y: number };
}

export interface AutomationRule {
  id: string;
  title: string;
  description: string;
  triggerCategory: 'traffic' | 'lighting' | 'pedestrian' | 'air';
  ifConditionText: string;
  thenActionText: string;
  isEnabled: boolean;
  thresholdValue: number;
  thresholdUnit: string;
  lastTriggered?: string;
  triggerCount: number;
}

export type AlertSeverity = 'CRITICAL' | 'WARNING' | 'INFO' | 'RESOLVED';

export interface SystemAlert {
  id: string;
  timestamp: string;
  severity: AlertSeverity;
  subsystem: string;
  location: string;
  sensor: string;
  title: string;
  description: string;
  systemResponse: string;
  isRead: boolean;
  isAcknowledged: boolean;
  isResolved: boolean;
}

export interface SystemEventLog {
  id: string;
  timestamp: string;
  subsystem: string;
  event: string;
  details: string;
  type: 'AUTO' | 'MANUAL' | 'SYSTEM';
}

export type SimulationScenario = 'NORMAL' | 'RUSH_HOUR' | 'NIGHT_PATROL' | 'SMOG_CRISIS' | 'RAIN_STORM';
