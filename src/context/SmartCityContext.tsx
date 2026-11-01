'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react';
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
  BuzzerMode,
  CrossingPhase,
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

function formatLcdLine1(gasVal: number): string {
  return `Nilai MQ: ${String(gasVal).padStart(4, ' ')}  `;
}

function formatLcdLine2(status: string): string {
  return status.slice(0, 16).padEnd(16, ' ');
}

interface SmartCityContextType {
  activeSubsystem: SubsystemType;
  setActiveSubsystem: (subsystem: SubsystemType) => void;

  theme: 'light' | 'dark';
  toggleTheme: () => void;

  traffic: CameraTrafficData;
  pju: SmartPJUData;
  crossing: SmartCrossingData;
  gas: GasAirQualityData;
  buzzerMode: BuzzerMode;

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

  isHardwareConnected: boolean;
  isCameraConnected: boolean;
  setIsCameraConnected: (connected: boolean) => void;
  updateTrafficCameraData: (data: Partial<CameraTrafficData>) => void;

  sendCommand: (action: string, value?: unknown) => Promise<void>;
  controlPjuManual: (mode: 'ON' | 'OFF' | 'AUTO') => void;
  testBuzzerAlarm: () => void;

  setLdrValue: (value: number) => void;
  togglePjuDayNight: () => void;

  triggerCrossingDetection: (side: 'kanan' | 'kiri' | 'kedua' | 'force') => void;
  resetCrossingToSafe: () => void;
  updateUltrasonicDistances: (kanan: number | null, kiri: number | null) => void;

  controlGasManual: (mode: 'AUTO' | 'BERSIH' | 'SEDANG' | 'BAHAYA' | number) => void;
  setGasSensorValue: (value: number) => void;
  isPollutionAlarmActive: boolean;
  dismissPollutionAlarm: () => void;
  snoozePollutionAlarm: () => void;

  triggerTrafficEmergency: () => void;
  setTrafficModeAuto: (isAuto: boolean) => void;
  setTrafficLightManual: (color: 'green' | 'yellow' | 'red') => void;

  toggleRule: (id: string) => void;
  markAlertAsRead: (id: string) => void;
  resolveAlert: (id: string) => void;
  clearEventLogs: () => void;
}

const SmartCityContext = createContext<SmartCityContextType | undefined>(undefined);

export const SmartCityProvider = ({ children }: { children: ReactNode }) => {
  const [activeSubsystem, setActiveSubsystem] = useState<SubsystemType>('overview');
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

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

  const crossingTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.dataset.theme = theme;
    }
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
    sounds.playClick();
  }, []);

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
      setEventLogs((prev) => [newLog, ...prev.slice(0, 59)]);
    },
    []
  );

  const clearEventLogs = useCallback(() => {
    setEventLogs([]);
  }, []);

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
      setAlerts((prev) => [newAlert, ...prev.slice(0, 29)]);
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
  const sendCommand = useCallback(async (action: string, value?: unknown) => {
    try {
      const win = typeof window !== 'undefined' ? (window as unknown as { __smartcity_send_serial?: (cmd: string) => Promise<void> }) : null;
      if (win && win.__smartcity_send_serial) {
        try {
          await win.__smartcity_send_serial(action);
        } catch (e) {
          console.warn('[SERIAL DIRECT] Gagal kirim serial langsung:', e);
        }
      }

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
  // FITUR 5: SMART PJU LOGIC (AUTO LDR & MANUAL ON/OFF)
  // ==========================================================
  const controlPjuManual = useCallback(
    (mode: 'ON' | 'OFF' | 'AUTO') => {
      sounds.playClick();
      const nowTime = new Date().toLocaleTimeString('id-ID', { hour12: false });

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
        addEventLog('Smart PJU', 'CMD:PJU_ON', 'PJU disetel MANUAL ON (LED Pin 25 & 26 menyala)', 'MANUAL');
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
        addEventLog('Smart PJU', 'CMD:PJU_OFF', 'PJU disetel MANUAL OFF (LED Pin 25 & 26 mati)', 'MANUAL');
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
        addEventLog('Smart PJU', 'CMD:PJU_AUTO', 'PJU kembali mengikuti sensor LDR Pin 36 (> 2000 = Menyala)', 'MANUAL');
      }
    },
    [sendCommand, addEventLog]
  );

  const setLdrValue = useCallback((value: number) => {
    const nowTime = new Date().toLocaleTimeString('id-ID', { hour12: false });
    setPju((prev) => {
      if (prev.pjuMode === 'ON') {
        return { ...prev, ldrValue: value };
      }
      if (prev.pjuMode === 'OFF') {
        return { ...prev, ldrValue: value };
      }
      const isDark = value > prev.thresholdLdr;
      const nextKondisi = isDark ? 'GELAP' : 'TERANG';
      const conditionChanged = nextKondisi !== prev.kondisi;
      return {
        ...prev,
        ldrValue: value,
        kondisi: nextKondisi,
        pjuStatus: isDark ? 'MENYALA' : 'MATI',
        ledMerah: isDark,
        ledPutih: isDark,
        jamTerakhirBeralih: conditionChanged ? nowTime : prev.jamTerakhirBeralih,
        siklusWaktu: isDark ? 'MALAM' : 'SIANG',
      };
    });
  }, []);

  const togglePjuDayNight = useCallback(() => {
    setPju((prev) => {
      const isCurrentlyOn = prev.pjuStatus === 'MENYALA';
      if (isCurrentlyOn) {
        controlPjuManual('OFF');
      } else {
        controlPjuManual('ON');
      }
      return prev;
    });
  }, [controlPjuManual]);

  // ==========================================================
  // FITUR 2 & 3: SMART PENYEBERANGAN (HIJAU -> KUNING 1s -> MERAH 5s -> TUNGGU_KOSONG)
  // ==========================================================
  const startCrossingSequence = useCallback(
    (jKanan: number | null, jKiri: number | null, label: string, sendHwCommand: boolean) => {
      if (crossingTimerRef.current) {
        clearTimeout(crossingTimerRef.current);
      }

      const oKanan = jKanan !== null && jKanan > 0 && jKanan <= 17;
      const oKiri = jKiri !== null && jKiri > 0 && jKiri <= 25;

      if (sendHwCommand) {
        sendCommand('CMD:FORCE_CROSSING');
      }

      setCrossing((prev) => ({
        ...prev,
        jarakKanan: jKanan,
        jarakKiri: jKiri,
        orangKanan: oKanan,
        orangKiri: oKiri,
        siapMenyeberang: false,
        lampu: 'KUNING',
        buzzer: false,
        countdownSeconds: 1,
        statusRingkasan: 'ORANG TERDETEKSI',
      }));

      addEventLog(
        'Penyeberangan',
        label,
        `Fase KUNING (1 detik) -> MERAH (5 detik). Kanan: ${jKanan ?? '-'}cm, Kiri: ${jKiri ?? '-'}cm`,
        'MANUAL'
      );

      crossingTimerRef.current = setTimeout(() => {
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

  const triggerCrossingDetection = useCallback(
    (side: 'kanan' | 'kiri' | 'kedua' | 'force') => {
      sounds.playSuccess();
      const jarakKanan = side === 'kiri' ? 35 : side === 'force' ? crossing.jarakKanan : 12;
      const jarakKiri = side === 'kanan' ? 42 : side === 'force' ? crossing.jarakKiri : 18;
      startCrossingSequence(jarakKanan, jarakKiri, `CMD:FORCE_CROSSING (${side.toUpperCase()})`, true);
    },
    [crossing.jarakKanan, crossing.jarakKiri, startCrossingSequence]
  );

  const resetCrossingToSafe = useCallback(() => {
    if (crossingTimerRef.current) {
      clearTimeout(crossingTimerRef.current);
    }
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
    addEventLog('Penyeberangan', 'Reset ke HIJAU', 'Area kosong (Kanan 35cm, Kiri 42cm), siap mendeteksi ulang', 'MANUAL');
  }, [sendCommand, addEventLog]);

  const updateUltrasonicDistances = useCallback(
    (kanan: number | null, kiri: number | null) => {
      const orangKanan = kanan !== null && kanan > 0 && kanan <= 17;
      const orangKiri = kiri !== null && kiri > 0 && kiri <= 25;
      const adaOrang = orangKanan || orangKiri;

      setCrossing((prev) => {
        // Jika fase HIJAU dan siap_menyeberang dan ada_orang -> masuk KUNING
        if (prev.lampu === 'HIJAU' && prev.siapMenyeberang && adaOrang) {
          setTimeout(() => {
            startCrossingSequence(kanan, kiri, 'Deteksi Ultrasonik', true);
          }, 0);
          return {
            ...prev,
            jarakKanan: kanan,
            jarakKiri: kiri,
            orangKanan,
            orangKiri,
          };
        }

        // Jika fase TUNGGU_KOSONG dan objek sudah menjauh (!adaOrang) -> kembali HIJAU
        if (prev.lampu === 'TUNGGU_KOSONG' && !adaOrang) {
          return {
            ...prev,
            jarakKanan: kanan,
            jarakKiri: kiri,
            orangKanan: false,
            orangKiri: false,
            siapMenyeberang: true,
            lampu: 'HIJAU',
            buzzer: false,
            countdownSeconds: 0,
            statusRingkasan: 'AMAN',
          };
        }

        let statusRingkasan: SmartCrossingData['statusRingkasan'] = 'AMAN';
        if (prev.lampu === 'MERAH') {
          statusRingkasan = 'ORANG MENYEBRANG';
        } else if (prev.lampu === 'TUNGGU_KOSONG') {
          statusRingkasan = 'MENUNGGU KOSONG';
        } else if (adaOrang || prev.lampu === 'KUNING') {
          statusRingkasan = 'ORANG TERDETEKSI';
        }

        return {
          ...prev,
          jarakKanan: kanan,
          jarakKiri: kiri,
          orangKanan,
          orangKiri,
          statusRingkasan,
        };
      });
    },
    [startCrossingSequence]
  );

  // ==========================================================
  // FITUR 4: BUZZER DUA FUNGSI (Pin 4)
  // ==========================================================
  const testBuzzerAlarm = useCallback(() => {
    sounds.playAlert();
    sendCommand('CMD:BUZZER_TEST');
    addEventLog('Buzzer Pin 4', 'CMD:BUZZER_TEST', 'Uji bunyi buzzer 300ms dikirim ke ESP32 Pin 4', 'MANUAL');
  }, [sendCommand, addEventLog]);

  // ==========================================================
  // FITUR 1: MONITORING POLUSI MQ (Pin 39) + LCD SoftI2C
  // ==========================================================
  const dismissPollutionAlarm = useCallback(() => {
    sounds.stopPollutionAlarm();
    setIsPollutionAlarmActive(false);
    setAlarmSnoozeUntil(Date.now() + 300000);
    sendCommand('CMD:BUZZER_MUTE');
    addEventLog('Sensor Gas MQ', 'Alarm Dibisukan', 'Operator membisukan alarm polusi tinggi', 'MANUAL');
  }, [sendCommand, addEventLog]);

  const snoozePollutionAlarm = useCallback(() => {
    sounds.stopPollutionAlarm();
    setIsPollutionAlarmActive(false);
    setAlarmSnoozeUntil(Date.now() + 60000);
    sendCommand('CMD:BUZZER_MUTE');
    addEventLog('Sensor Gas MQ', 'Alarm Ditunda 1m', 'Alarm polusi ditunda selama 60 detik', 'MANUAL');
  }, [sendCommand, addEventLog]);

  const controlGasManual = useCallback(
    (mode: 'AUTO' | 'BERSIH' | 'SEDANG' | 'BAHAYA' | number) => {
      sounds.playClick();
      const nowTime = new Date().toLocaleTimeString('id-ID', { hour12: false });

      if (mode === 'AUTO') {
        sendCommand('CMD:GAS_AUTO');
        setGas((prev) => ({
          ...prev,
          gasMode: 'AUTO',
        }));
        sounds.stopPollutionAlarm();
        setIsPollutionAlarmActive(false);
        addEventLog('Sensor Gas MQ', 'CMD:GAS_AUTO', 'Pembacaan kembali ke sensor fisik ADC Pin 39', 'MANUAL');
        return;
      }

      let val = 650;
      let cmd = 'CMD:GAS_BERSIH';
      if (mode === 'BERSIH') {
        val = 650;
        cmd = 'CMD:GAS_BERSIH';
      } else if (mode === 'SEDANG') {
        val = 1250;
        cmd = 'CMD:GAS_SEDANG';
      } else if (mode === 'BAHAYA') {
        val = 2100;
        cmd = 'CMD:GAS_BAHAYA';
      } else if (typeof mode === 'number') {
        val = Math.max(0, Math.min(4095, Math.round(mode)));
        cmd = `CMD:GAS_SET:${val}`;
      }

      sendCommand(cmd);

      const statusPolusi: GasAirQualityData['statusPolusi'] =
        val < 1000 ? 'UDARA BERSIH' : val < 1500 ? 'POLUSI SEDANG' : 'POLUSI TINGGI';
      const isHigh = val >= 1500;

      setGas((prev) => ({
        ...prev,
        gasValue: val,
        gasMode: 'MANUAL',
        statusPolusi,
        isAlarmActive: isHigh,
        lastAlarmTime: isHigh ? nowTime : prev.lastAlarmTime,
        lcdBaris1: formatLcdLine1(val),
        lcdBaris2: formatLcdLine2(statusPolusi),
        lcdTersedia: true,
      }));

      addEventLog('Sensor Gas MQ', `${cmd}`, `Nilai MQ: ${val} ADC (${statusPolusi})`, 'MANUAL');

      if (isHigh) {
        addAlert('CRITICAL', 'Sensor Gas MQ', `Polusi Tinggi (${val} ADC)`, 'Melebihi BATAS_GAS 1500 ADC. Buzzer Pin 4 aktif.');
        if (Date.now() > alarmSnoozeUntil) {
          setIsPollutionAlarmActive(true);
          sounds.startPollutionAlarm();
        }
      } else {
        sounds.stopPollutionAlarm();
        setIsPollutionAlarmActive(false);
      }
    },
    [sendCommand, addEventLog, addAlert, alarmSnoozeUntil]
  );

  const setGasSensorValue = useCallback(
    (value: number) => {
      controlGasManual(value);
    },
    [controlGasManual]
  );

  // ==========================================================
  // TRAFFIC CONTROLLER (Kamera AI YOLO11 / Browser)
  // ==========================================================
  const triggerTrafficEmergency = useCallback(() => {
    sounds.playAlert();
    setTraffic((prev) => ({
      ...prev,
      currentLight: 'green',
      countdownSeconds: 45,
    }));
    addEventLog('Kamera Simpang', 'Prioritas Hijau', 'Lampu hijau simpang diaktifkan 45 detik', 'MANUAL');
  }, [addEventLog]);

  const setTrafficModeAuto = useCallback((isAuto: boolean) => {
    sounds.playClick();
    setTraffic((prev) => ({ ...prev, isAutomatic: isAuto }));
  }, []);

  const setTrafficLightManual = useCallback((color: 'green' | 'yellow' | 'red') => {
    sounds.playClick();
    setTraffic((prev) => ({
      ...prev,
      isAutomatic: false,
      currentLight: color,
      countdownSeconds: color === 'green' ? 30 : color === 'yellow' ? 4 : 35,
    }));
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

  const toggleRule = useCallback((id: string) => {
    sounds.playClick();
    setRules((prev) => prev.map((r) => (r.id === id ? { ...r, isEnabled: !r.isEnabled } : r)));
  }, []);

  const markAlertAsRead = useCallback((id: string) => {
    sounds.playClick();
    setAlerts((prev) => prev.map((a) => (a.id === id ? { ...a, isRead: true } : a)));
  }, []);

  const resolveAlert = useCallback((id: string) => {
    sounds.playSuccess();
    setAlerts((prev) => prev.map((a) => (a.id === id ? { ...a, isResolved: true, isRead: true } : a)));
  }, []);

  // ==========================================================
  // SIKLUS DETIK: PENYEBERANGAN (MERAH 5s -> TUNGGU_KOSONG / HIJAU) & TRAFFIC
  // ==========================================================
  useEffect(() => {
    if (!isSimulating) return;

    const timer = setInterval(() => {
      setCrossing((prev) => {
        if (prev.lampu === 'MERAH' && prev.countdownSeconds > 0) {
          const nextCountdown = prev.countdownSeconds - 1;
          if (nextCountdown <= 0) {
            const adaOrang = prev.orangKanan || prev.orangKiri;
            if (adaOrang) {
              return {
                ...prev,
                lampu: 'TUNGGU_KOSONG',
                buzzer: false,
                countdownSeconds: 0,
                siapMenyeberang: false,
                statusRingkasan: 'MENUNGGU KOSONG',
              };
            }
            return {
              ...prev,
              lampu: 'HIJAU',
              buzzer: false,
              countdownSeconds: 0,
              siapMenyeberang: true,
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

  // ==========================================================
  // POLLING TELEMETRI DARI /api/iot/telemetry
  // ==========================================================
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

        // 1. Traffic Data
        if (data.latestBySubsystem['traffic']) {
          const t = data.latestBySubsystem['traffic'];
          const packetAge = now - new Date(t.timestamp).getTime();
          if (packetAge < 15000) camDataFresh = true;

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

        // 2. Smart PJU Data (ESP32)
        if (data.latestBySubsystem['pju']) {
          const pjuPacket = data.latestBySubsystem['pju'];
          const packetAge = now - new Date(pjuPacket.timestamp).getTime();
          if (packetAge < 15000) espDataFresh = true;

          const p = pjuPacket.payload;
          setPju((prev) => {
            const ldr = p.ldrValue ?? p.ldr ?? prev.ldrValue;
            const mode: 'AUTO' | 'ON' | 'OFF' = p.pjuMode ?? prev.pjuMode;
            const isDark = ldr > prev.thresholdLdr;
            const kondisi: SmartPJUData['kondisi'] =
              p.kondisi ?? (mode === 'ON' ? 'MANUAL_ON' : mode === 'OFF' ? 'MANUAL_OFF' : isDark ? 'GELAP' : 'TERANG');
            const pjuStatus: SmartPJUData['pjuStatus'] =
              p.pjuStatus ?? (kondisi === 'MANUAL_ON' || kondisi === 'GELAP' ? 'MENYALA' : 'MATI');
            const ledsOn = pjuStatus === 'MENYALA';

            return {
              ...prev,
              ldrValue: ldr,
              pjuMode: mode,
              kondisi,
              pjuStatus,
              ledMerah: p.ledMerah !== undefined ? p.ledMerah : ledsOn,
              ledPutih: p.ledPutih !== undefined ? p.ledPutih : ledsOn,
            };
          });
        }

        // 3. Smart Penyeberangan Data (ESP32)
        if (data.latestBySubsystem['pedestrian']) {
          const pedPacket = data.latestBySubsystem['pedestrian'];
          const packetAge = now - new Date(pedPacket.timestamp).getTime();
          if (packetAge < 15000) espDataFresh = true;

          const c = pedPacket.payload;
          setCrossing((prev) => {
            const jKanan = c.jarakKanan !== undefined ? c.jarakKanan : prev.jarakKanan;
            const jKiri = c.jarakKiri !== undefined ? c.jarakKiri : prev.jarakKiri;
            const oKanan = c.orangKanan ?? (jKanan !== null && jKanan > 0 && jKanan <= 17);
            const oKiri = c.orangKiri ?? (jKiri !== null && jKiri > 0 && jKiri <= 25);
            const lampu: CrossingPhase = c.lampu ?? prev.lampu;
            const siapMenyeberang = lampu === 'HIJAU';

            let statusRingkasan: SmartCrossingData['statusRingkasan'] = 'AMAN';
            if (lampu === 'MERAH') statusRingkasan = 'ORANG MENYEBRANG';
            else if (lampu === 'TUNGGU_KOSONG') statusRingkasan = 'MENUNGGU KOSONG';
            else if (lampu === 'KUNING' || oKanan || oKiri) statusRingkasan = 'ORANG TERDETEKSI';

            return {
              ...prev,
              jarakKanan: jKanan,
              jarakKiri: jKiri,
              orangKanan: oKanan,
              orangKiri: oKiri,
              siapMenyeberang,
              lampu,
              buzzer: lampu === 'MERAH',
              countdownSeconds: lampu === 'MERAH' ? (prev.countdownSeconds || 5) : lampu === 'KUNING' ? 1 : 0,
              statusRingkasan,
            };
          });
        }

        // 4. Sensor Gas MQ + LCD 16x2 Data (ESP32)
        if (data.latestBySubsystem['air-quality']) {
          const gasPacket = data.latestBySubsystem['air-quality'];
          const packetAge = now - new Date(gasPacket.timestamp).getTime();
          if (packetAge < 15000) espDataFresh = true;

          const g = gasPacket.payload;
          setGas((prev) => {
            const incomingMode = g.gasMode || 'AUTO';
            const isManual = prev.gasMode === 'MANUAL' || incomingMode === 'MANUAL';
            const val = isManual
              ? prev.gasMode === 'MANUAL'
                ? prev.gasValue
                : (g.gasValue ?? g.gas ?? prev.gasValue)
              : (g.gasValue ?? g.gas ?? prev.gasValue);

            const statusPolusi: GasAirQualityData['statusPolusi'] =
              g.statusPolusi ?? (val < 1000 ? 'UDARA BERSIH' : val < 1500 ? 'POLUSI SEDANG' : 'POLUSI TINGGI');
            const isHigh = val >= 1500;
            const nowTime = new Date().toLocaleTimeString('id-ID', { hour12: false });

            if (isHigh) {
              if (Date.now() > alarmSnoozeUntil) {
                setIsPollutionAlarmActive(true);
                sounds.startPollutionAlarm();
              }
            } else {
              sounds.stopPollutionAlarm();
              setIsPollutionAlarmActive(false);
            }

            return {
              ...prev,
              gasValue: val,
              gasMode: isManual ? 'MANUAL' : 'AUTO',
              statusPolusi,
              isAlarmActive: isHigh,
              lastAlarmTime: isHigh ? prev.lastAlarmTime || nowTime : prev.lastAlarmTime,
              lcdBaris1: formatLcdLine1(val),
              lcdBaris2: formatLcdLine2(statusPolusi),
              lcdTersedia: true,
            };
          });
        }

        setIsHardwareConnected(espDataFresh);
        if (camDataFresh) setIsCameraConnected(true);

        if (espDataFresh || camDataFresh) {
          setLastTelemetryTimestamp(new Date().toLocaleTimeString('id-ID', { hour12: false }));
        }

        setDevices((prev) =>
          prev.map((d) => {
            if (d.id === 'ESP32-MINIATURE') {
              return {
                ...d,
                status: espDataFresh ? 'Online' : 'Offline',
                lastPing: espDataFresh ? 'Aktif (COM3)' : 'Siaga',
              };
            }
            return d;
          })
        );
      } catch {
        // Ignore network polling errors
      }
    };

    const interval = setInterval(syncTelemetry, 1200);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [isLiveIoTMode, alarmSnoozeUntil]);

  // Dual-Function Buzzer Mode (update_buzzer(alarm_gas, alarm_seberang))
  const alarmGas = gas.gasValue >= 1500;
  const alarmSeberang = crossing.lampu === 'MERAH';
  const buzzerMode: BuzzerMode =
    alarmGas && alarmSeberang ? 'both' : alarmGas ? 'gas' : alarmSeberang ? 'seberang' : 'none';

  return (
    <SmartCityContext.Provider
      value={{
        activeSubsystem,
        setActiveSubsystem,
        theme,
        toggleTheme,
        traffic,
        pju,
        crossing,
        gas,
        buzzerMode,
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
        controlGasManual,
        setGasSensorValue,
        isPollutionAlarmActive,
        dismissPollutionAlarm,
        snoozePollutionAlarm,
        triggerTrafficEmergency,
        setTrafficModeAuto,
        setTrafficLightManual,
        toggleRule,
        markAlertAsRead,
        resolveAlert,
        clearEventLogs,
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
