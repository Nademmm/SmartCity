'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import {
  SubsystemType,
  TrafficIntersection,
  PJUNode,
  PedestrianCrossing,
  AirQualityData,
  IoTDevice,
  AutomationRule,
  SystemAlert,
  SystemEventLog,
  SimulationScenario,
} from '@/types/iot';
import {
  INITIAL_INTERSECTIONS,
  INITIAL_PJU_NODES,
  INITIAL_PEDESTRIAN_CROSSINGS,
  INITIAL_AIR_QUALITY,
  INITIAL_IOT_DEVICES,
  INITIAL_AUTOMATION_RULES,
  INITIAL_ALERTS,
  INITIAL_EVENT_LOGS,
} from '@/services/iotSimulationEngine';
import { sounds } from '@/services/soundEffects';

interface SmartCityContextType {
  activeSubsystem: SubsystemType;
  setActiveSubsystem: (subsystem: SubsystemType) => void;
  
  intersections: TrafficIntersection[];
  pjuNodes: PJUNode[];
  pedestrians: PedestrianCrossing[];
  airQuality: AirQualityData;
  devices: IoTDevice[];
  rules: AutomationRule[];
  alerts: SystemAlert[];
  eventLogs: SystemEventLog[];
  
  selectedDeviceForInspection: IoTDevice | null;
  setSelectedDeviceForInspection: (device: IoTDevice | null) => void;
  
  scenario: SimulationScenario;
  setScenario: (scenario: SimulationScenario) => void;
  
  isSimulating: boolean;
  setIsSimulating: (simulating: boolean) => void;
  
  isAudioMuted: boolean;
  toggleAudioMute: () => void;
  
  // Action Handlers
  updateTrafficLightMode: (id: string, isAuto: boolean) => void;
  updateTrafficManualPhases: (id: string, phases: { red: number; yellow: number; green: number }) => void;
  triggerEmergencyCorridor: (id: string) => void;
  
  updatePJUBrightness: (id: string, brightness: number, isAuto?: boolean) => void;
  togglePJUPower: (id: string) => void;
  simulatePJUMotion: (id: string) => void;
  
  triggerPelicanCrossing: (id: string) => void;
  
  toggleAQIMitigation: () => void;
  toggleMistingCannons: () => void;
  
  toggleRule: (id: string) => void;
  updateRuleThreshold: (id: string, newThreshold: number) => void;
  testRule: (id: string) => void;
  
  markAlertAsRead: (id: string) => void;
  acknowledgeAlert: (id: string) => void;
  resolveAlert: (id: string) => void;
  clearResolvedAlerts: () => void;
  
  restartIoTDevice: (id: string) => void;
  pingIoTDevice: (id: string) => void;
  
  // Sustainability Score
  sustainabilityScore: number;
  
  // Real Hardware IoT Sync
  isLiveIoTMode: boolean;
  toggleLiveIoTMode: () => void;
  lastTelemetryTimestamp: string | null;
}

const SmartCityContext = createContext<SmartCityContextType | undefined>(undefined);

export const SmartCityProvider = ({ children }: { children: ReactNode }) => {
  const [activeSubsystem, setActiveSubsystem] = useState<SubsystemType>('overview');
  const [intersections, setIntersections] = useState<TrafficIntersection[]>(INITIAL_INTERSECTIONS);
  const [pjuNodes, setPjuNodes] = useState<PJUNode[]>(INITIAL_PJU_NODES);
  const [pedestrians, setPedestrians] = useState<PedestrianCrossing[]>(INITIAL_PEDESTRIAN_CROSSINGS);
  const [airQuality, setAirQuality] = useState<AirQualityData>(INITIAL_AIR_QUALITY);
  const [devices, setDevices] = useState<IoTDevice[]>(INITIAL_IOT_DEVICES);
  const [rules, setRules] = useState<AutomationRule[]>(INITIAL_AUTOMATION_RULES);
  const [alerts, setAlerts] = useState<SystemAlert[]>(INITIAL_ALERTS);
  const [eventLogs, setEventLogs] = useState<SystemEventLog[]>(INITIAL_EVENT_LOGS);
  
  const [selectedDeviceForInspection, setSelectedDeviceForInspection] = useState<IoTDevice | null>(null);
  const [scenario, setScenarioState] = useState<SimulationScenario>('NORMAL');
  const [isSimulating, setIsSimulating] = useState<boolean>(true);
  const [isAudioMuted, setIsAudioMuted] = useState<boolean>(false);
  const [isLiveIoTMode, setIsLiveIoTMode] = useState<boolean>(true);
  const [lastTelemetryTimestamp, setLastTelemetryTimestamp] = useState<string | null>(null);

  const toggleLiveIoTMode = useCallback(() => {
    setIsLiveIoTMode((prev) => !prev);
    sounds.playClick();
  }, []);

  // Sound muting synchronization
  const toggleAudioMute = useCallback(() => {
    setIsAudioMuted((prev) => {
      const next = !prev;
      sounds.setMuted(next);
      return next;
    });
  }, []);

  const addEventLog = useCallback((subsystem: string, event: string, details: string, type: 'AUTO' | 'MANUAL' | 'SYSTEM' = 'AUTO') => {
    const newLog: SystemEventLog = {
      id: `LOG-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      timestamp: new Date().toLocaleTimeString('id-ID', { hour12: false }),
      subsystem,
      event,
      details,
      type,
    };
    setEventLogs((prev) => [newLog, ...prev.slice(0, 49)]); // Keep latest 50
  }, []);

  const addAlert = useCallback((
    severity: 'CRITICAL' | 'WARNING' | 'INFO',
    subsystem: string,
    location: string,
    sensor: string,
    title: string,
    description: string,
    systemResponse: string
  ) => {
    const newAlert: SystemAlert = {
      id: `ALT-${Date.now()}`,
      timestamp: new Date().toLocaleTimeString('id-ID', { hour12: false }),
      severity,
      subsystem,
      location,
      sensor,
      title,
      description,
      systemResponse,
      isRead: false,
      isAcknowledged: false,
      isResolved: false,
    };
    setAlerts((prev) => [newAlert, ...prev]);
    if (severity === 'CRITICAL') {
      sounds.playCritical();
    } else if (severity === 'WARNING') {
      sounds.playAlert();
    }
  }, []);

  // Scenario switchers
  const setScenario = useCallback((newScenario: SimulationScenario) => {
    setScenarioState(newScenario);
    sounds.playClick();

    if (newScenario === 'RUSH_HOUR') {
      setIntersections((prev) =>
        prev.map((it) => ({
          ...it,
          density: Math.min(95, it.density + 25),
          statusText: 'MACET TOTAL',
          queueLengthMeters: it.queueLengthMeters + 50,
        }))
      );
      addEventLog('Scenario', 'Skenario RUSH HOUR diaktifkan', 'Kepadatan seluruh simpang meningkat drastis', 'MANUAL');
    } else if (newScenario === 'SMOG_CRISIS') {
      setAirQuality((prev) => ({
        ...prev,
        aqi: 145,
        pm25: 78.2,
        status: 'Unhealthy',
        trafficDiversionRecommended: true,
      }));
      addAlert(
        'CRITICAL',
        'Air Quality',
        'Kawasan Industri & Pusat Kota',
        'ESP32-003 Multi-Gas',
        'Polusi Udara Mencapai Level Kritis (AQI 145)',
        'Konsentrasi PM2.5 melampaui batas aman WHO.',
        'Sistem otomatis merekomendasikan aktivasi misting cannon dan pengalihan rute.'
      );
      addEventLog('Scenario', 'Skenario SMOG CRISIS diaktifkan', 'AQI melonjak ke 145, tindakan mitigasi diperlukan', 'MANUAL');
    } else if (newScenario === 'NIGHT_PATROL') {
      setPjuNodes((prev) =>
        prev.map((pju) => ({
          ...pju,
          brightness: pju.motionDetected ? 100 : 30,
          status: pju.motionDetected ? 'optimal' : 'energy_saving',
        }))
      );
      addEventLog('Scenario', 'Skenario NIGHT PATROL diaktifkan', 'PJU memasuki mode hemat daya adaptif 30%', 'MANUAL');
    } else {
      // Return to normal
      setAirQuality(INITIAL_AIR_QUALITY);
      addEventLog('Scenario', 'Skenario NORMAL diaktifkan', 'Kondisi telemetri kembali ke baseline standar', 'MANUAL');
    }
  }, [addEventLog, addAlert]);

  // Traffic Handlers
  const updateTrafficLightMode = useCallback((id: string, isAuto: boolean) => {
    sounds.playClick();
    setIntersections((prev) =>
      prev.map((it) => (it.id === id ? { ...it, isAutomatic: isAuto } : it))
    );
    addEventLog('Traffic ATSC', `Mode Simpang ${id} diubah ke ${isAuto ? 'OTOMATIS' : 'MANUAL'}`, `Kontrol operator diterapkan`, 'MANUAL');
  }, [addEventLog]);

  const updateTrafficManualPhases = useCallback((id: string, phases: { red: number; yellow: number; green: number }) => {
    sounds.playClick();
    setIntersections((prev) =>
      prev.map((it) => (it.id === id ? { ...it, manualPhases: phases } : it))
    );
    addEventLog('Traffic ATSC', `Durasi fase manual ${id} diperbarui`, `R: ${phases.red}s, Y: ${phases.yellow}s, G: ${phases.green}s`, 'MANUAL');
  }, [addEventLog]);

  const triggerEmergencyCorridor = useCallback((id: string) => {
    sounds.playSuccess();
    setIntersections((prev) =>
      prev.map((it) => {
        if (it.id === id) {
          const nextActive = !it.emergencyPriorityActive;
          return {
            ...it,
            emergencyPriorityActive: nextActive,
            currentLight: nextActive ? 'green' : it.currentLight,
            countdownSeconds: nextActive ? 45 : it.countdownSeconds,
          };
        }
        return it;
      })
    );
    addEventLog('Emergency', `Koridor Prioritas Darurat ${id} diaktifkan!`, 'Lampu hijau dipaksakan untuk kendaraan darurat / ambulans', 'MANUAL');
  }, [addEventLog]);

  // PJU Handlers
  const updatePJUBrightness = useCallback((id: string, brightness: number, isAuto?: boolean) => {
    sounds.playClick();
    setPjuNodes((prev) =>
      prev.map((pju) => {
        if (pju.id === id) {
          const autoState = isAuto !== undefined ? isAuto : pju.isAutomatic;
          return {
            ...pju,
            brightness,
            powerWatts: Math.round(60 * (brightness / 100)),
            status: brightness <= 30 ? 'energy_saving' : 'optimal',
            isAutomatic: autoState,
          };
        }
        return pju;
      })
    );
  }, []);

  const togglePJUPower = useCallback((id: string) => {
    sounds.playClick();
    setPjuNodes((prev) =>
      prev.map((pju) => {
        if (pju.id === id) {
          const isCurrentlyOff = pju.status === 'standby' || pju.brightness === 0;
          const nextBrightness = isCurrentlyOff ? 70 : 0;
          return {
            ...pju,
            brightness: nextBrightness,
            powerWatts: isCurrentlyOff ? 42 : 0,
            status: isCurrentlyOff ? 'optimal' : 'standby',
            isAutomatic: false,
          };
        }
        return pju;
      })
    );
    addEventLog('PJU Lighting', `Power status tiang ${id} diubah manual`, 'Perintah dikirim via MQTT', 'MANUAL');
  }, [addEventLog]);

  const simulatePJUMotion = useCallback((id: string) => {
    sounds.playClick();
    setPjuNodes((prev) =>
      prev.map((pju) => {
        if (pju.id === id) {
          return {
            ...pju,
            motionDetected: true,
            brightness: 100,
            powerWatts: 60,
            status: 'optimal',
            lastMotionTime: 'Baru saja',
          };
        }
        return pju;
      })
    );
    addEventLog('Smart PJU', `Sensor Gerak terdeteksi pada ${id}`, 'Otomasi Rule 02: Intensitas dinaikkan menjadi 100%', 'AUTO');
  }, [addEventLog]);

  // Pelican Crossing Handler
  const triggerPelicanCrossing = useCallback((id: string) => {
    sounds.playSuccess();
    setPedestrians((prev) =>
      prev.map((ped) => {
        if (ped.id === id) {
          return {
            ...ped,
            pelicanState: 'WALK',
            countdownSeconds: 15,
            isTriggered: true,
          };
        }
        return ped;
      })
    );
    addEventLog('Pedestrian', `Smart Pelican Crossing ${id} diaktifkan`, 'Sinyal WALK aktif, lalu lintas kendaraan dihentikan', 'MANUAL');
  }, [addEventLog]);

  // Air Quality Mitigation
  const toggleAQIMitigation = useCallback(() => {
    sounds.playClick();
    setAirQuality((prev) => {
      const nextState = !prev.mitigationActive;
      return {
        ...prev,
        mitigationActive: nextState,
        mistingCannonsActive: nextState,
        trafficDiversionRecommended: nextState,
        aqi: nextState ? Math.max(45, prev.aqi - 20) : prev.aqi,
      };
    });
    addEventLog('Air Quality', `Sistem Mitigasi Udara diubah ke status ${!airQuality.mitigationActive ? 'AKTIF' : 'NON-AKTIF'}`, 'Urban Misting Cannon & Reroute disesuaikan', 'MANUAL');
  }, [addEventLog, airQuality.mitigationActive]);

  const toggleMistingCannons = useCallback(() => {
    sounds.playClick();
    setAirQuality((prev) => ({
      ...prev,
      mistingCannonsActive: !prev.mistingCannonsActive,
    }));
  }, []);

  // Automation Rule Handlers
  const toggleRule = useCallback((id: string) => {
    sounds.playClick();
    setRules((prev) =>
      prev.map((rule) => {
        if (rule.id === id) {
          const nextState = !rule.isEnabled;
          return { ...rule, isEnabled: nextState };
        }
        return rule;
      })
    );
  }, []);

  const updateRuleThreshold = useCallback((id: string, newThreshold: number) => {
    sounds.playClick();
    setRules((prev) =>
      prev.map((rule) => (rule.id === id ? { ...rule, thresholdValue: newThreshold } : rule))
    );
  }, []);

  const testRule = useCallback((id: string) => {
    sounds.playSuccess();
    const rule = rules.find((r) => r.id === id);
    if (!rule) return;

    setRules((prev) =>
      prev.map((r) =>
        r.id === id
          ? {
              ...r,
              lastTriggered: new Date().toLocaleTimeString('id-ID', { hour12: false }),
              triggerCount: r.triggerCount + 1,
            }
          : r
      )
    );
    addEventLog('Automation', `Uji Eksekusi Otomasi ${rule.title}`, `Aksi simulasi berhasil dijalankan: ${rule.thenActionText}`, 'MANUAL');
  }, [rules, addEventLog]);

  // Alert Handlers
  const markAlertAsRead = useCallback((id: string) => {
    sounds.playClick();
    setAlerts((prev) => prev.map((a) => (a.id === id ? { ...a, isRead: true } : a)));
  }, []);

  const acknowledgeAlert = useCallback((id: string) => {
    sounds.playClick();
    setAlerts((prev) => prev.map((a) => (a.id === id ? { ...a, isAcknowledged: true, isRead: true } : a)));
  }, []);

  const resolveAlert = useCallback((id: string) => {
    sounds.playSuccess();
    setAlerts((prev) =>
      prev.map((a) => (a.id === id ? { ...a, isResolved: true, severity: 'RESOLVED', isRead: true } : a))
    );
    addEventLog('Alerts', `Alert ${id} telah ditandai selesai (Resolved)`, 'Status ditutup oleh operator', 'MANUAL');
  }, [addEventLog]);

  const clearResolvedAlerts = useCallback(() => {
    sounds.playClick();
    setAlerts((prev) => prev.filter((a) => !a.isResolved));
  }, []);

  // IoT Device Handlers
  const restartIoTDevice = useCallback((id: string) => {
    sounds.playClick();
    setDevices((prev) =>
      prev.map((d) => (d.id === id ? { ...d, status: 'Warning', lastPing: 'Rebooting...' } : d))
    );
    addEventLog('IoT Gateway', `Perintah Soft Reboot dikirim ke ${id}`, 'ESP32 sedang melakukan restart sequence', 'MANUAL');
    
    setTimeout(() => {
      setDevices((prev) =>
        prev.map((d) => (d.id === id ? { ...d, status: 'Online', lastPing: '1s lalu' } : d))
      );
      sounds.playSuccess();
      addEventLog('IoT Gateway', `Node ${id} berhasil reboot dan kembali ONLINE`, 'ESP32 MQTT handshake 100% OK', 'SYSTEM');
    }, 2500);
  }, [addEventLog]);

  const pingIoTDevice = useCallback((id: string) => {
    sounds.playClick();
    addEventLog('IoT Gateway', `Ping dikirim ke ${id}`, 'Round-trip latency 14ms (RSSI 98%)', 'MANUAL');
  }, [addEventLog]);

  // Master Simulation Loop (runs every 1 second for timers, every 3.5s for sensor shifts)
  useEffect(() => {
    if (!isSimulating) return;

    let secondCounter = 0;

    const timer = setInterval(() => {
      secondCounter += 1;

      // 1. Tick Countdown timers for traffic lights and pelican crossings every second
      setIntersections((prev) =>
        prev.map((it) => {
          if (it.emergencyPriorityActive) return it;

          let nextCountdown = it.countdownSeconds - 1;
          let nextLight = it.currentLight;
          let nextGreenExt = it.greenExtensionSeconds;

          if (nextCountdown <= 0) {
            if (it.currentLight === 'green') {
              nextLight = 'yellow';
              nextCountdown = it.isAutomatic ? 4 : it.manualPhases.yellow;
            } else if (it.currentLight === 'yellow') {
              nextLight = 'red';
              nextCountdown = it.isAutomatic ? 35 : it.manualPhases.red;
            } else {
              nextLight = 'green';
              const baseGreen = it.isAutomatic ? 30 : it.manualPhases.green;
              nextCountdown = baseGreen + nextGreenExt;
            }
          }
          return {
            ...it,
            countdownSeconds: Math.max(1, nextCountdown),
            currentLight: nextLight,
          };
        })
      );

      setPedestrians((prev) =>
        prev.map((ped) => {
          let nextCountdown = ped.countdownSeconds - 1;
          let nextState = ped.pelicanState;
          let nextIsTriggered = ped.isTriggered;

          if (nextCountdown <= 0) {
            if (ped.pelicanState === 'WALK') {
              nextState = 'WAIT';
              nextCountdown = 30;
              nextIsTriggered = false;
            } else {
              if (ped.waitingCount >= ped.autoTriggerThreshold) {
                nextState = 'WALK';
                nextCountdown = 15;
                nextIsTriggered = true;
              } else {
                nextCountdown = 25;
              }
            }
          }
          return {
            ...ped,
            countdownSeconds: Math.max(1, nextCountdown),
            pelicanState: nextState,
            isTriggered: nextIsTriggered,
          };
        })
      );

      // 2. Telemetry fluctuations & Rule evaluations every 3.5 seconds
      if (secondCounter % 3 === 0) {
        // Intersections density shift
        setIntersections((prev) =>
          prev.map((it) => {
            const delta = (Math.random() - 0.48) * 4;
            const newDensity = Math.min(98, Math.max(20, Math.round(it.density + delta)));
            
            let status: 'LANCAR' | 'SEDANG' | 'PADAT' | 'MACET TOTAL' = 'LANCAR';
            if (newDensity >= 75) status = 'MACET TOTAL';
            else if (newDensity >= 60) status = 'PADAT';
            else if (newDensity >= 40) status = 'SEDANG';

            // ATSC Autonomous Rule Check
            let ext = it.greenExtensionSeconds;
            if (it.isAutomatic && newDensity >= 70 && ext === 0) {
              ext = 20;
            } else if (newDensity < 65 && ext > 0) {
              ext = 0;
            }

            return {
              ...it,
              density: newDensity,
              statusText: status,
              vehicleCount: Math.round(it.vehicleCount + (Math.random() * 8 - 4)),
              avgSpeedKmh: Math.max(12, Math.min(60, Math.round(65 - (newDensity * 0.55)))),
              queueLengthMeters: Math.round(newDensity * 1.4),
              greenExtensionSeconds: ext,
            };
          })
        );

        // PJU soft decay / motion checks
        setPjuNodes((prev) =>
          prev.map((pju) => {
            if (!pju.isAutomatic) return pju;
            // If motion was true, have small chance to clear it and softly dim
            if (pju.motionDetected && Math.random() < 0.25) {
              return {
                ...pju,
                motionDetected: false,
                brightness: 30,
                powerWatts: 18,
                status: 'energy_saving',
                lastMotionTime: '30s lalu',
              };
            }
            return pju;
          })
        );

        // Air Quality drift
        setAirQuality((prev) => {
          const deltaAqi = (Math.random() - 0.5) * 3;
          const currentAqi = Math.max(30, Math.min(180, Math.round(prev.aqi + deltaAqi)));
          
          let status: 'Good' | 'Moderate' | 'Unhealthy' | 'Very Unhealthy' | 'Hazardous' = 'Good';
          if (currentAqi > 150) status = 'Very Unhealthy';
          else if (currentAqi > 100) status = 'Unhealthy';
          else if (currentAqi > 50) status = 'Moderate';

          return {
            ...prev,
            aqi: currentAqi,
            pm25: Number((currentAqi * 0.53 + (Math.random() * 2 - 1)).toFixed(1)),
            co2: Math.round(410 + currentAqi * 0.2),
            status,
          };
        });

        // Update Device lastPing timestamps
        setDevices((prev) =>
          prev.map((d) => ({
            ...d,
            lastPing: `${Math.floor(Math.random() * 4) + 1}s lalu`,
          }))
        );
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [isSimulating]);

  // Telemetry Ingestion Polling Effect (mendengarkan data real dari /api/iot/telemetry)
  useEffect(() => {
    if (!isLiveIoTMode) return;

    let isMounted = true;
    let lastProcessedTimestamp = '';

    const syncTelemetry = async () => {
      try {
        const res = await fetch('/api/iot/telemetry');
        if (!res.ok) return;
        const data = await res.json();
        
        if (!isMounted || !data.latestBySubsystem) return;

        // 1. Cek Kualitas Udara Real
        if (data.latestBySubsystem['air-quality']) {
          const air = data.latestBySubsystem['air-quality'];
          if (air.timestamp !== lastProcessedTimestamp) {
            lastProcessedTimestamp = air.timestamp;
            setLastTelemetryTimestamp(air.timestamp);
            
            const p = air.payload;
            let status: 'Good' | 'Moderate' | 'Unhealthy' | 'Very Unhealthy' | 'Hazardous' = 'Good';
            if (p.aqi > 150) status = 'Very Unhealthy';
            else if (p.aqi > 100) status = 'Unhealthy';
            else if (p.aqi > 50) status = 'Moderate';

            setAirQuality((prev) => ({
              ...prev,
              aqi: p.aqi ?? prev.aqi,
              pm25: p.pm25 ?? prev.pm25,
              co: p.co ?? prev.co,
              co2: p.co2 ?? prev.co2,
              temperature: p.temperature ?? prev.temperature,
              humidity: p.humidity ?? prev.humidity,
              status,
            }));

            // Mark device as online
            setDevices((prev) =>
              prev.map((d) =>
                d.id === air.deviceId || d.type === 'Air Sensor'
                  ? { ...d, status: 'Online', lastPing: 'Baru saja' }
                  : d
              )
            );
          }
        }

        // 2. Cek Lampu PJU Real
        if (data.latestBySubsystem['pju']) {
          const pju = data.latestBySubsystem['pju'];
          const targetId = pju.nodeId || 'pju-1';
          setPjuNodes((prev) =>
            prev.map((node) => {
              if (node.id === targetId) {
                return {
                  ...node,
                  brightness: pju.payload.brightness ?? node.brightness,
                  powerWatts: pju.payload.powerWatts ?? node.powerWatts,
                  motionDetected: pju.payload.motionDetected ?? node.motionDetected,
                  status: pju.payload.status ?? node.status,
                  lastMotionTime: pju.payload.motionDetected ? 'Baru saja (Hardware PIR)' : node.lastMotionTime,
                };
              }
              return node;
            })
          );
        }

        // 3. Cek Lalu Lintas Real
        if (data.latestBySubsystem['traffic']) {
          const traffic = data.latestBySubsystem['traffic'];
          const targetId = traffic.intersectionId || 'int-1';
          setIntersections((prev) =>
            prev.map((it) => {
              if (it.id === targetId) {
                return {
                  ...it,
                  density: traffic.payload.density ?? it.density,
                  vehicleCount: traffic.payload.vehicleCount ?? it.vehicleCount,
                  avgSpeedKmh: traffic.payload.avgSpeedKmh ?? it.avgSpeedKmh,
                  currentLight: traffic.payload.currentLight ?? it.currentLight,
                };
              }
              return it;
            })
          );
        }
      } catch (err) {
        // Silent catch for network hiccups
      }
    };

    const pollInterval = setInterval(syncTelemetry, 1500);
    return () => {
      isMounted = false;
      clearInterval(pollInterval);
    };
  }, [isLiveIoTMode]);

  // Sustainability score calculated dynamically based on energy, traffic, and air quality
  const avgPjuBrightness = Math.round(pjuNodes.reduce((acc, curr) => acc + curr.brightness, 0) / (pjuNodes.length || 1));
  const avgTrafficDensity = Math.round(intersections.reduce((acc, curr) => acc + curr.density, 0) / (intersections.length || 1));
  const energySavingsComponent = Math.round((100 - avgPjuBrightness) * 0.4);
  const trafficComponent = Math.round((100 - avgTrafficDensity) * 0.35);
  const airQualityComponent = Math.round((100 - Math.min(100, airQuality.aqi * 0.7)) * 0.25);
  const sustainabilityScore = Math.min(99, Math.max(50, 40 + energySavingsComponent + trafficComponent + airQualityComponent));

  return (
    <SmartCityContext.Provider
      value={{
        activeSubsystem,
        setActiveSubsystem,
        intersections,
        pjuNodes,
        pedestrians,
        airQuality,
        devices,
        rules,
        alerts,
        eventLogs,
        selectedDeviceForInspection,
        setSelectedDeviceForInspection,
        scenario,
        setScenario,
        isSimulating,
        setIsSimulating,
        isAudioMuted,
        toggleAudioMute,
        updateTrafficLightMode,
        updateTrafficManualPhases,
        triggerEmergencyCorridor,
        updatePJUBrightness,
        togglePJUPower,
        simulatePJUMotion,
        triggerPelicanCrossing,
        toggleAQIMitigation,
        toggleMistingCannons,
        toggleRule,
        updateRuleThreshold,
        testRule,
        markAlertAsRead,
        acknowledgeAlert,
        resolveAlert,
        clearResolvedAlerts,
        restartIoTDevice,
        pingIoTDevice,
        sustainabilityScore,
        isLiveIoTMode,
        toggleLiveIoTMode,
        lastTelemetryTimestamp,
      }}
    >
      {children}
    </SmartCityContext.Provider>
  );
};

export const useSmartCity = () => {
  const context = useContext(SmartCityContext);
  if (!context) {
    throw new Error('useSmartCity must be used within a SmartCityProvider');
  }
  return context;
};
