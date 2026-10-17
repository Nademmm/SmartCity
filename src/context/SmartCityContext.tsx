'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import {
  SubsystemType,
  CameraTrafficData,
  SmartPJUData,
  SmartCrossingData,
  GasAirQualityData,
  IoTDevice,
  AutomationRule,
  SystemAlert,
  SystemEventLog,
} from '@/types/iot';
import {
  INITIAL_TRAFFIC,
  INITIAL_PJU,
  INITIAL_CROSSING,
  INITIAL_GAS,
  INITIAL_DEVICES,
  INITIAL_RULES,
  INITIAL_ALERTS,
  INITIAL_LOGS,
} from '@/services/iotSimulationEngine';
import { sounds } from '@/services/soundEffects';

interface SmartCityContextType {
  activeSubsystem: SubsystemType;
  setActiveSubsystem: (subsystem: SubsystemType) => void;

  // 4 Core Subsystems
  traffic: CameraTrafficData;
  pju: SmartPJUData;
  crossing: SmartCrossingData;
  gas: GasAirQualityData;

  devices: IoTDevice[];
  rules: AutomationRule[];
  alerts: SystemAlert[];
  eventLogs: SystemEventLog[];

  isSimulating: boolean;
  setIsSimulating: (simulating: boolean) => void;

  isAudioMuted: boolean;
  toggleAudioMute: () => void;

  isLiveIoTMode: boolean;
  toggleLiveIoTMode: () => void;
  lastTelemetryTimestamp: string | null;

  // Real Hardware Connection Status
  isHardwareConnected: boolean;
  isCameraConnected: boolean;
  setIsCameraConnected: (connected: boolean) => void;
  updateTrafficCameraData: (data: Partial<CameraTrafficData>) => void;

  // Hardware Commands & Controls
  sendCommand: (action: string, value?: any) => Promise<void>;
  controlPjuManual: (mode: 'ON' | 'OFF' | 'AUTO') => void;
  testBuzzerAlarm: () => void;

  // PJU Action Handlers
  setLdrValue: (value: number) => void;
  togglePjuDayNight: () => void;

  // Crossing Action Handlers
  triggerCrossingDetection: (side: 'kanan' | 'kiri' | 'kedua') => void;
  resetCrossingToSafe: () => void;
  updateUltrasonicDistances: (kanan: number, kiri: number) => void;

  // Gas Action Handlers
  setGasSensorValue: (value: number) => void;
  isPollutionAlarmActive: boolean;
  dismissPollutionAlarm: () => void;
  snoozePollutionAlarm: () => void;

  // Traffic Action Handlers
  triggerTrafficEmergency: () => void;
  setTrafficModeAuto: (isAuto: boolean) => void;

  // Alerts & Rules
  toggleRule: (id: string) => void;
  markAlertAsRead: (id: string) => void;
  resolveAlert: (id: string) => void;
}

const SmartCityContext = createContext<SmartCityContextType | undefined>(undefined);

export const SmartCityProvider = ({ children }: { children: ReactNode }) => {
  const [activeSubsystem, setActiveSubsystem] = useState<SubsystemType>('overview');

  const [traffic, setTraffic] = useState<CameraTrafficData>(INITIAL_TRAFFIC);
  const [pju, setPju] = useState<SmartPJUData>(INITIAL_PJU);
  const [crossing, setCrossing] = useState<SmartCrossingData>(INITIAL_CROSSING);
  const [gas, setGas] = useState<GasAirQualityData>(INITIAL_GAS);
  const [isPollutionAlarmActive, setIsPollutionAlarmActive] = useState<boolean>(false);
  const [alarmSnoozeUntil, setAlarmSnoozeUntil] = useState<number>(0);

  const [devices, setDevices] = useState<IoTDevice[]>(INITIAL_DEVICES);
  const [rules, setRules] = useState<AutomationRule[]>(INITIAL_RULES);
  const [alerts, setAlerts] = useState<SystemAlert[]>(INITIAL_ALERTS);
  const [eventLogs, setEventLogs] = useState<SystemEventLog[]>(INITIAL_LOGS);

  const [isSimulating, setIsSimulating] = useState<boolean>(true);
  const [isAudioMuted, setIsAudioMuted] = useState<boolean>(false);
  const [isLiveIoTMode, setIsLiveIoTMode] = useState<boolean>(true);
  const [lastTelemetryTimestamp, setLastTelemetryTimestamp] = useState<string | null>(null);

  const [isHardwareConnected, setIsHardwareConnected] = useState<boolean>(false);
  const [isCameraConnected, setIsCameraConnected] = useState<boolean>(false);

  const toggleLiveIoTMode = useCallback(() => {
    setIsLiveIoTMode((prev) => !prev);
    sounds.playClick();
  }, []);

  const toggleAudioMute = useCallback(() => {
    setIsAudioMuted((prev) => {
      const next = !prev;
      sounds.setMuted(next);
      return next;
    });
  }, []);

  const addEventLog = useCallback(
    (subsystem: string, event: string, details: string, type: 'AUTO' | 'HARDWARE' | 'MANUAL' = 'AUTO') => {
      const newLog: SystemEventLog = {
        id: `LOG-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        timestamp: new Date().toLocaleTimeString('id-ID', { hour12: false }),
        subsystem,
        event,
        details,
        type,
      };
      setEventLogs((prev) => [newLog, ...prev.slice(0, 49)]);
    },
    []
  );

  const addAlert = useCallback(
    (severity: 'CRITICAL' | 'WARNING' | 'INFO', subsystem: string, title: string, description: string) => {
      const newAlert: SystemAlert = {
        id: `ALT-${Date.now()}`,
        timestamp: new Date().toLocaleTimeString('id-ID', { hour12: false }),
        severity,
        subsystem,
        title,
        description,
        isRead: false,
        isResolved: false,
      };
      setAlerts((prev) => [newAlert, ...prev]);
      if (severity === 'CRITICAL') {
        sounds.playCritical();
      } else if (severity === 'WARNING') {
        sounds.playAlert();
      }
    },
    []
  );

  // ==========================================================
  // PENGIRIMAN PERINTAH KE HARDWARE ESP32 (DUA ARAH)
  // ==========================================================
  const sendCommand = useCallback(async (action: string, value?: any) => {
    try {
      // 1. Direct Web Serial jika port USB sedang aktif di browser
      if (typeof window !== 'undefined' && (window as any).__urbanpulse_send_serial) {
        try {
          await (window as any).__urbanpulse_send_serial(action);
          console.log('[SERIAL DIRECT] Mengirim perintah:', action);
        } catch (e) {
          console.warn('[SERIAL DIRECT] Gagal kirim serial langsung:', e);
        }
      }

      // 2. Queue backend /api/iot/control agar bridge PowerShell juga bisa membaca
      await fetch('/api/iot/control', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetDeviceId: 'ESP32-MINIATURE',
          action,
          value,
        }),
      });
    } catch (err) {
      console.error('Gagal mengirim perintah ke antrean kontrol:', err);
    }
  }, []);

  // ==========================================================
  // FITUR 3: SMART PJU LOGIC (AUTO LDR & MANUAL CONTROL)
  // ==========================================================
  const controlPjuManual = useCallback(
    (mode: 'ON' | 'OFF' | 'AUTO') => {
      sounds.playClick();
      const nowTime = new Date().toLocaleTimeString('id-ID', { hour12: false }) + ' WIB';

      if (mode === 'ON') {
        sendCommand('CMD:PJU_ON');
        setPju((prev) => ({
          ...prev,
          pjuMode: 'ON',
          kondisi: 'MANUAL_ON',
          pjuStatus: 'MENYALA',
          ledMerah: true,
          ledPutih: true,
          jamTerakhirBeralih: nowTime,
          siklusWaktu: 'MALAM',
        }));
        addEventLog('Smart PJU', 'Kontrol Manual: ON', 'Perintah CMD:PJU_ON dikirim (LED 25 & 26 Menyala)', 'MANUAL');
      } else if (mode === 'OFF') {
        sendCommand('CMD:PJU_OFF');
        setPju((prev) => ({
          ...prev,
          pjuMode: 'OFF',
          kondisi: 'MANUAL_OFF',
          pjuStatus: 'MATI',
          ledMerah: false,
          ledPutih: false,
          jamTerakhirBeralih: nowTime,
          siklusWaktu: 'SIANG',
        }));
        addEventLog('Smart PJU', 'Kontrol Manual: OFF', 'Perintah CMD:PJU_OFF dikirim (LED 25 & 26 Padam)', 'MANUAL');
      } else {
        sendCommand('CMD:PJU_AUTO');
        setPju((prev) => {
          const isDark = prev.ldrValue > prev.thresholdLdr;
          return {
            ...prev,
            pjuMode: 'AUTO',
            kondisi: isDark ? 'GELAP' : 'TERANG',
            pjuStatus: isDark ? 'MENYALA' : 'MATI',
            ledMerah: isDark,
            ledPutih: isDark,
            jamTerakhirBeralih: nowTime,
            siklusWaktu: isDark ? 'MALAM' : 'SIANG',
          };
        });
        addEventLog('Smart PJU', 'Mode Otomatis LDR Aktif', 'Perintah CMD:PJU_AUTO dikirim (Kembali ke Sensor LDR)', 'MANUAL');
      }
    },
    [sendCommand, addEventLog]
  );

  const setLdrValue = useCallback((value: number) => {
    const isDark = value > 2000;
    const nowTime = new Date().toLocaleTimeString('id-ID', { hour12: false }) + ' WIB';
    setPju((prev) => {
      const conditionChanged = (isDark ? 'GELAP' : 'TERANG') !== prev.kondisi;
      return {
        ...prev,
        ldrValue: value,
        kondisi: isDark ? 'GELAP' : 'TERANG',
        pjuStatus: isDark ? 'MENYALA' : 'MATI',
        ledMerah: isDark,
        ledPutih: isDark,
        jamTerakhirBeralih: conditionChanged ? nowTime : prev.jamTerakhirBeralih,
        siklusWaktu: isDark ? 'MALAM' : 'SIANG',
      };
    });
  }, []);

  const togglePjuDayNight = useCallback(() => {
    sounds.playClick();
    setPju((prev) => {
      const isCurrentlyDark = prev.kondisi === 'GELAP' || prev.kondisi === 'MANUAL_ON';
      if (isCurrentlyDark) {
        controlPjuManual('OFF');
      } else {
        controlPjuManual('ON');
      }
      return prev;
    });
  }, [controlPjuManual]);

  // ==========================================================
  // FITUR 2: SMART PENYEBERANGAN (Ultrasonik Kanan 17cm, Kiri 25cm, 5s)
  // ==========================================================
  const triggerCrossingDetection = useCallback(
    (side: 'kanan' | 'kiri' | 'kedua') => {
      sounds.playSuccess();
      const jarakKanan = side === 'kiri' ? 35 : 12; // 12 cm <= BATAS_KANAN (17 cm)
      const jarakKiri = side === 'kanan' ? 42 : 18;  // 18 cm <= BATAS_KIRI (25 cm)

      const orangKanan = jarakKanan <= 17;
      const orangKiri = jarakKiri <= 25;

      // Kirim perintah picu penyeberangan fisik ke ESP32
      sendCommand('CMD:CROSSING_TRIGGER');

      // Lampu Kuning 1 detik -> Lampu Merah 5 detik + Buzzer
      setCrossing((prev) => ({
        ...prev,
        jarakKanan,
        jarakKiri,
        orangKanan,
        orangKiri,
        siapMenyeberang: false,
        lampu: 'KUNING',
        buzzer: false,
        countdownSeconds: 1,
        statusRingkasan: 'ORANG TERDETEKSI',
      }));

      addEventLog(
        'Penyeberangan',
        `Objek Terdeteksi (${side.toUpperCase()})`,
        `Jarak Kanan: ${jarakKanan}cm (Batas: 17cm), Kiri: ${jarakKiri}cm (Batas: 25cm). Lampu Kuning 1 detik.`,
        'MANUAL'
      );

      // Setelah 1 detik Kuning, masuk fase Merah 5s
      setTimeout(() => {
        setCrossing((prev) => ({
          ...prev,
          lampu: 'MERAH',
          buzzer: true,
          countdownSeconds: 5,
          statusRingkasan: 'ORANG MENYEBRANG',
        }));
      }, 1000);
    },
    [sendCommand, addEventLog]
  );

  const resetCrossingToSafe = useCallback(() => {
    sounds.playClick();
    sendCommand('CMD:CROSSING_RESET');
    setCrossing((prev) => ({
      ...prev,
      jarakKanan: 35.0,
      jarakKiri: 42.0,
      orangKanan: false,
      orangKiri: false,
      siapMenyeberang: true,
      lampu: 'HIJAU',
      buzzer: false,
      countdownSeconds: 0,
      statusRingkasan: 'AMAN',
    }));
    addEventLog('Penyeberangan', 'Reset Aman', 'Perintah CMD:CROSSING_RESET dikirim, Lampu Hijau aktif', 'MANUAL');
  }, [sendCommand, addEventLog]);

  const testBuzzerAlarm = useCallback(() => {
    sounds.startPollutionAlarm();
    setTimeout(() => {
      if (!isPollutionAlarmActive) {
        sounds.stopPollutionAlarm();
      }
    }, 4000);
    sendCommand('CMD:ALARM_TEST');
    addEventLog('Buzzer & Alarm', 'Uji Alarm Ninu-Ninu', 'Audio ninuninu.ogg diputar & CMD:ALARM_TEST dikirim ke ESP32 Pin 13', 'MANUAL');
  }, [sendCommand, addEventLog, isPollutionAlarmActive]);

  const updateUltrasonicDistances = useCallback(
    (kanan: number, kiri: number) => {
      const orangKanan = kanan <= 17;
      const orangKiri = kiri <= 25;
      const adaOrang = orangKanan || orangKiri;

      setCrossing((prev) => {
        let statusRingkasan: 'AMAN' | 'ORANG TERDETEKSI' | 'ORANG MENYEBRANG' | 'MENUNGGU KOSONG' = 'AMAN';
        if (prev.lampu === 'MERAH') {
          statusRingkasan = 'ORANG MENYEBRANG';
        } else if (!prev.siapMenyeberang && adaOrang) {
          statusRingkasan = 'MENUNGGU KOSONG';
        } else if (adaOrang) {
          statusRingkasan = 'ORANG TERDETEKSI';
        }

        return {
          ...prev,
          jarakKanan: kanan,
          jarakKiri: kiri,
          orangKanan,
          orangKiri,
          siapMenyeberang: !adaOrang ? true : prev.siapMenyeberang,
          statusRingkasan,
        };
      });
    },
    []
  );

  // ==========================================================
  // FITUR 1: MONITORING POLUSI UDARA (Sensor Gas / MQ ADC Pin 39)
  // ==========================================================
  const dismissPollutionAlarm = useCallback(() => {
    sounds.stopPollutionAlarm();
    setIsPollutionAlarmActive(false);
  }, []);

  const snoozePollutionAlarm = useCallback(() => {
    sounds.stopPollutionAlarm();
    setIsPollutionAlarmActive(false);
    setAlarmSnoozeUntil(Date.now() + 30000); // Tunda selama 30 detik
  }, []);

  const setGasSensorValue = useCallback(
    (value: number) => {
      let statusPolusi: 'UDARA BERSIH' | 'POLUSI SEDANG' | 'POLUSI TINGGI' = 'UDARA BERSIH';
      if (value < 1000) {
        statusPolusi = 'UDARA BERSIH';
      } else if (value < 1500) {
        statusPolusi = 'POLUSI SEDANG';
      } else {
        statusPolusi = 'POLUSI TINGGI';
      }

      const nowTime = new Date().toLocaleTimeString('id-ID', { hour12: false }) + ' WIB';
      const isHigh = value >= 1500;
      const isMed = value >= 1000 && value < 1500;

      setGas((prev) => ({
        ...prev,
        gasValue: value,
        statusPolusi,
        isAlarmActive: statusPolusi === 'POLUSI TINGGI',
        lastAlarmTime: statusPolusi === 'POLUSI TINGGI' ? nowTime : prev.lastAlarmTime,
        ledPolusi: isHigh || isMed,
        ledBersih: !isHigh,
        lcdBaris1: isHigh ? 'STATUS: BAHAYA!' : isMed ? 'STATUS: WASPADA' : 'Selamat Datang',
        lcdBaris2: isHigh ? 'Polusi: TINGGI' : isMed ? `Gas: ${value} Sedang` : 'Di Kota Pintar',
        lcdTersedia: true,
      }));

      if (value >= 1500) {
        addAlert('CRITICAL', 'Sensor Gas MQ', 'Peringatan Polusi Udara Tinggi!', `Nilai Gas ADC mencapai ${value}. Protokol alarm darurat aktif.`);
        if (Date.now() > alarmSnoozeUntil) {
          setIsPollutionAlarmActive(true);
          sounds.startPollutionAlarm();
        }
      } else if (value >= 1000) {
        sounds.stopPollutionAlarm();
        setIsPollutionAlarmActive(false);
        addAlert('WARNING', 'Sensor Gas MQ', 'Polusi Udara Sedang', `Nilai Gas ADC mencapai ${value}. Terdeteksi peningkatan asap/emisi.`);
        sounds.playAlert();
      } else {
        sounds.stopPollutionAlarm();
        setIsPollutionAlarmActive(false);
      }
    },
    [addAlert, alarmSnoozeUntil]
  );

  // ==========================================================
  // FITUR 4: TRAFFIC CONTROLLER (Kamera AI YOLO11)
  // ==========================================================
  const triggerTrafficEmergency = useCallback(() => {
    sounds.playAlert();
    setTraffic((prev) => ({
      ...prev,
      currentLight: 'green',
      countdownSeconds: 45,
    }));
    addEventLog('Kamera AI', 'Prioritas Jalur Kendaraan Diaktifkan', 'Lampu Hijau dipaksakan untuk kelancaran arus', 'MANUAL');
  }, [addEventLog]);

  const setTrafficModeAuto = useCallback((isAuto: boolean) => {
    sounds.playClick();
    setTraffic((prev) => ({ ...prev, isAutomatic: isAuto }));
  }, []);

  const updateTrafficCameraData = useCallback((data: Partial<CameraTrafficData>) => {
    setTraffic((prev) => ({
      ...prev,
      ...data,
      vehicleCounts: data.vehicleCounts
        ? { ...prev.vehicleCounts, ...data.vehicleCounts }
        : prev.vehicleCounts,
    }));
  }, []);

  // Update devices table when camera connected state changes
  useEffect(() => {
    setDevices((prev) =>
      prev.map((d) => {
        if (d.id === 'YOLO-CV-TRAFFIC-01') {
          return {
            ...d,
            status: isCameraConnected ? 'Online' : 'Offline',
            lastPing: isCameraConnected ? 'Webcam Aktif (Direct Browser)' : 'Menunggu Kamera',
          };
        }
        return d;
      })
    );
  }, [isCameraConnected]);

  // Rules & Alerts Handlers
  const toggleRule = useCallback((id: string) => {
    sounds.playClick();
    setRules((prev) =>
      prev.map((r) => (r.id === id ? { ...r, isEnabled: !r.isEnabled } : r))
    );
  }, []);

  const markAlertAsRead = useCallback((id: string) => {
    sounds.playClick();
    setAlerts((prev) => prev.map((a) => (a.id === id ? { ...a, isRead: true } : a)));
  }, []);

  const resolveAlert = useCallback((id: string) => {
    sounds.playSuccess();
    setAlerts((prev) => prev.map((a) => (a.id === id ? { ...a, isResolved: true, isRead: true } : a)));
  }, []);

  // Countdown tick loop only for active crossing sequence and traffic
  useEffect(() => {
    if (!isSimulating) return;

    const timer = setInterval(() => {
      // 1. Tick crossing countdown if currently red (menyeberang)
      setCrossing((prev) => {
        if (prev.lampu === 'MERAH' && prev.countdownSeconds > 0) {
          const nextCountdown = prev.countdownSeconds - 1;
          if (nextCountdown === 0) {
            return {
              ...prev,
              lampu: 'HIJAU',
              buzzer: false,
              countdownSeconds: 0,
              orangKanan: false,
              orangKiri: false,
              siapMenyeberang: true,
              jarakKanan: 35.0,
              jarakKiri: 42.0,
              statusRingkasan: 'AMAN',
            };
          }
          return {
            ...prev,
            countdownSeconds: nextCountdown,
          };
        }
        return prev;
      });

      // 2. Tick traffic light countdown
      setTraffic((prev) => {
        if (!prev.isAutomatic) return prev;
        const nextSeconds = prev.countdownSeconds - 1;
        if (nextSeconds <= 0) {
          let nextLight: 'green' | 'yellow' | 'red' = 'green';
          let duration = 30;
          if (prev.currentLight === 'green') {
            nextLight = 'yellow';
            duration = 4;
          } else if (prev.currentLight === 'yellow') {
            nextLight = 'red';
            duration = 35;
          } else {
            nextLight = 'green';
            duration = prev.density > 70 ? 45 : 30;
          }
          return {
            ...prev,
            currentLight: nextLight,
            countdownSeconds: duration,
          };
        }
        return {
          ...prev,
          countdownSeconds: nextSeconds,
        };
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isSimulating]);

  // Telemetry Polling Effect (Mengambil data live dari /api/iot/telemetry)
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

        const now = Date.now();
        let espDataFresh = false;
        let camDataFresh = false;

        // 1. Ingest Traffic Data (YOLO11)
        if (data.latestBySubsystem['traffic']) {
          const t = data.latestBySubsystem['traffic'];
          const packetAge = now - new Date(t.timestamp).getTime();
          if (packetAge < 15000) {
            camDataFresh = true;
          }

          if (t.timestamp !== lastProcessedTimestamp) {
            const p = t.payload;
            setTraffic((prev) => ({
              ...prev,
              density: p.density ?? prev.density,
              vehicleCount: p.vehicleCount ?? prev.vehicleCount,
              statusText: p.statusText ?? prev.statusText,
              avgSpeedKmh: p.avgSpeedKmh ?? prev.avgSpeedKmh,
              queueLengthMeters: p.queueLengthMeters ?? prev.queueLengthMeters,
              vehicleCounts: p.counts ?? prev.vehicleCounts,
              currentLight: p.currentLight ?? prev.currentLight,
            }));
          }
        }

        // 2. Ingest PJU Data (ESP32 Miniatur)
        if (data.latestBySubsystem['pju']) {
          const pjuPacket = data.latestBySubsystem['pju'];
          const packetAge = now - new Date(pjuPacket.timestamp).getTime();
          if (packetAge < 15000) {
            espDataFresh = true;
          }

          const p = pjuPacket.payload;
          const ldr = p.ldrValue ?? p.ldr ?? pju.ldrValue;
          const isDark = ldr > 2000;
          setPju((prev) => ({
            ...prev,
            ldrValue: ldr,
            thresholdLdr: p.thresholdLdr ?? prev.thresholdLdr,
            kondisi: p.kondisi ?? (isDark ? 'GELAP' : 'TERANG'),
            pjuStatus: p.pjuStatus ?? (isDark ? 'MENYALA' : 'MATI'),
            ledMerah: p.ledMerah !== undefined ? p.ledMerah : isDark,
            ledPutih: p.ledPutih !== undefined ? p.ledPutih : isDark,
          }));
        }

        // 3. Ingest Crossing Data (ESP32 Miniatur)
        if (data.latestBySubsystem['pedestrian']) {
          const pedPacket = data.latestBySubsystem['pedestrian'];
          const packetAge = now - new Date(pedPacket.timestamp).getTime();
          if (packetAge < 15000) {
            espDataFresh = true;
          }

          const c = pedPacket.payload;
          const jKanan = c.jarakKanan ?? c.jarak_kanan ?? crossing.jarakKanan;
          const jKiri = c.jarakKiri ?? c.jarak_kiri ?? crossing.jarakKiri;
          const oKanan = c.orangKanan ?? (jKanan !== null && jKanan <= (c.batasKanan ?? 17));
          const oKiri = c.orangKiri ?? (jKiri !== null && jKiri <= (c.batasKiri ?? 25));
          const siapMenyeberang = c.siapMenyeberang ?? c.siap_menyeberang ?? crossing.siapMenyeberang;

          setCrossing((prev) => ({
            ...prev,
            jarakKanan: jKanan,
            jarakKiri: jKiri,
            orangKanan: oKanan,
            orangKiri: oKiri,
            siapMenyeberang,
            lampu: c.lampu ?? prev.lampu,
            buzzer: c.buzzer ?? prev.buzzer,
            countdownSeconds: c.countdownSeconds ?? prev.countdownSeconds,
            statusRingkasan:
              c.statusRingkasan ?? (oKanan || oKiri ? (prev.lampu === 'MERAH' ? 'ORANG MENYEBRANG' : 'ORANG TERDETEKSI') : 'AMAN'),
          }));
        }

        // 4. Ingest Gas Data (ESP32 Miniatur)
        if (data.latestBySubsystem['air-quality']) {
          const gasPacket = data.latestBySubsystem['air-quality'];
          const packetAge = now - new Date(gasPacket.timestamp).getTime();
          if (packetAge < 15000) {
            espDataFresh = true;
          }

          const g = gasPacket.payload;
          const val = g.gasValue ?? g.nilai_gas ?? g.gas ?? gas.gasValue;
          let statusPolusi: 'UDARA BERSIH' | 'POLUSI SEDANG' | 'POLUSI TINGGI' = 'UDARA BERSIH';
          if (val < 1000) statusPolusi = 'UDARA BERSIH';
          else if (val < 1500) statusPolusi = 'POLUSI SEDANG';
          else statusPolusi = 'POLUSI TINGGI';

          const nowTime = new Date().toLocaleTimeString('id-ID', { hour12: false }) + ' WIB';

          const isHigh = statusPolusi === 'POLUSI TINGGI';
          const isMed = statusPolusi === 'POLUSI SEDANG';

          setGas((prev) => ({
            ...prev,
            gasValue: val,
            statusPolusi: g.statusPolusi ?? g.status ?? statusPolusi,
            isAlarmActive: statusPolusi === 'POLUSI TINGGI',
            lastAlarmTime: statusPolusi === 'POLUSI TINGGI' ? nowTime : prev.lastAlarmTime,
            ledPolusi: g.ledPolusi !== undefined ? g.ledPolusi : (isHigh || isMed),
            ledBersih: g.ledBersih !== undefined ? g.ledBersih : !isHigh,
            lcdBaris1: g.lcdBaris1 ?? (isHigh ? 'STATUS: BAHAYA!' : isMed ? 'STATUS: WASPADA' : 'Selamat Datang'),
            lcdBaris2: g.lcdBaris2 ?? (isHigh ? 'Polusi: TINGGI' : isMed ? `Gas: ${val} Sedang` : 'Di Kota Pintar'),
            lcdTersedia: g.lcdTersedia ?? true,
          }));

          if (statusPolusi === 'POLUSI TINGGI') {
            if (Date.now() > alarmSnoozeUntil) {
              setIsPollutionAlarmActive(true);
              sounds.startPollutionAlarm();
            }
          } else if (statusPolusi === 'POLUSI SEDANG') {
            sounds.stopPollutionAlarm();
            setIsPollutionAlarmActive(false);
            sounds.playAlert();
          } else {
            sounds.stopPollutionAlarm();
            setIsPollutionAlarmActive(false);
          }
        }

        setIsHardwareConnected(espDataFresh);
        setIsCameraConnected(camDataFresh);

        if (espDataFresh || camDataFresh) {
          setLastTelemetryTimestamp(new Date().toLocaleTimeString('id-ID'));
        }

        // Update Devices status
        setDevices((prev) =>
          prev.map((d) => {
            if (d.id === 'ESP32-MINIATURE' || d.type.includes('Sensor')) {
              return {
                ...d,
                status: espDataFresh ? 'Online' : 'Offline',
                lastPing: espDataFresh ? 'Live Telemetri' : 'Belum Terhubung',
              };
            }
            if (d.id === 'YOLO-CV-TRAFFIC-01') {
              return {
                ...d,
                status: camDataFresh ? 'Online' : 'Offline',
                lastPing: camDataFresh ? 'Live Stream Active' : 'Menunggu Feed',
              };
            }
            return d;
          })
        );
      } catch (err) {
        // Silently handled
      }
    };

    const interval = setInterval(syncTelemetry, 2000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [isLiveIoTMode, alarmSnoozeUntil]);

  return (
    <SmartCityContext.Provider
      value={{
        activeSubsystem,
        setActiveSubsystem,
        traffic,
        pju,
        crossing,
        gas,
        devices,
        rules,
        alerts,
        eventLogs,
        isSimulating,
        setIsSimulating,
        isAudioMuted,
        toggleAudioMute,
        isLiveIoTMode,
        toggleLiveIoTMode,
        lastTelemetryTimestamp,
        isHardwareConnected,
        isCameraConnected,
        setIsCameraConnected,
        updateTrafficCameraData,
        sendCommand,
        controlPjuManual,
        testBuzzerAlarm,
        setLdrValue,
        togglePjuDayNight,
        triggerCrossingDetection,
        resetCrossingToSafe,
        updateUltrasonicDistances,
        setGasSensorValue,
        isPollutionAlarmActive,
        dismissPollutionAlarm,
        snoozePollutionAlarm,
        triggerTrafficEmergency,
        setTrafficModeAuto,
        toggleRule,
        markAlertAsRead,
        resolveAlert,
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
