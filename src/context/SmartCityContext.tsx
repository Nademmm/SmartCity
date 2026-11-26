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
  SignalLampState,
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

function normalizeCrossingPhase(raw: unknown): CrossingPhase {
  const val = String(raw || '').toUpperCase().trim();
  if (
    val === 'NORMAL' ||
    val === 'KUNING_KENDARAAN' ||
    val === 'KUNING_PEJALAN' ||
    val === 'MENYEBRANG' ||
    val === 'KUNING_PENUTUP'
  ) {
    return val;
  }
  if (val === 'KUNING') return 'KUNING_KENDARAAN';
  if (val === 'MERAH') return 'MENYEBRANG';
  return 'NORMAL';
}

function deriveCrossingVisuals(phase: CrossingPhase): {
  lampuKendaraan: SignalLampState;
  lampuPejalan: SignalLampState;
  statusRingkasan: SmartCrossingData['statusRingkasan'];
  defaultDuration: number;
} {
  switch (phase) {
    case 'KUNING_KENDARAAN':
      return {
        lampuKendaraan: 'KUNING',
        lampuPejalan: 'MERAH',
        statusRingkasan: 'KENDARAAN BERSIAP',
        defaultDuration: 3,
      };
    case 'KUNING_PEJALAN':
      return {
        lampuKendaraan: 'MERAH',
        lampuPejalan: 'KUNING',
        statusRingkasan: 'PEJALAN BERSIAP',
        defaultDuration: 2,
      };
    case 'MENYEBRANG':
      return {
        lampuKendaraan: 'MERAH',
        lampuPejalan: 'HIJAU',
        statusRingkasan: 'SILAKAN MENYEBRANG',
        defaultDuration: 10,
      };
    case 'KUNING_PENUTUP':
      return {
        lampuKendaraan: 'MERAH',
        lampuPejalan: 'KUNING',
        statusRingkasan: 'WAKTU HABIS',
        defaultDuration: 2,
      };
    case 'NORMAL':
    default:
      return {
        lampuKendaraan: 'HIJAU',
        lampuPejalan: 'MERAH',
        statusRingkasan: 'NORMAL',
        defaultDuration: 0,
      };
  }
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
  isWebSerialSupported: boolean;
  isSerialConnected: boolean;
  isConnectingSerial: boolean;
  serialError: string | null;
  clearSerialError: () => void;
  serialLogs: string[];
  clearSerialLogs: () => void;
  connectSerial: () => Promise<void>;
  disconnectSerial: () => Promise<void>;

  isCameraConnected: boolean;
  setIsCameraConnected: (connected: boolean) => void;
  updateTrafficCameraData: (data: Partial<CameraTrafficData>) => void;

  sendCommand: (action: string, value?: unknown) => Promise<void>;
  controlPjuManual: (mode: 'ON' | 'OFF' | 'AUTO') => void;
  testBuzzerAlarm: () => void;

  setLdrValue: (value: number) => void;
  togglePjuDayNight: () => void;

  triggerCrossingDetection: (source: 'kanan' | 'kiri' | 'force') => void;
  resetCrossingToSafe: () => void;

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

  // Web Serial API persistent state
  const [isWebSerialSupported, setIsWebSerialSupported] = useState<boolean>(false);
  const [isSerialConnected, setIsSerialConnected] = useState<boolean>(false);
  const [isConnectingSerial, setIsConnectingSerial] = useState<boolean>(false);
  const [serialError, setSerialError] = useState<string | null>(null);
  const [serialLogs, setSerialLogs] = useState<string[]>([]);

  const portRef = useRef<any>(null);
  const writerRef = useRef<any>(null);
  const keepReadingRef = useRef<boolean>(false);
  const lastSerialCloudSyncRef = useRef<number>(0);

  // Command lock timestamps
  const lastGasCmdTimeRef = useRef<number>(0);
  const lastPjuCmdTimeRef = useRef<number>(0);
  const lastCrossingCmdTimeRef = useRef<number>(0);

  // Track processed telemetry packet timestamps
  const lastTrafficTsRef = useRef<string>('');
  const lastPjuTsRef = useRef<string>('');
  const lastPedTsRef = useRef<string>('');
  const lastGasTsRef = useRef<string>('');

  const touchPulseTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'serial' in navigator) {
      setIsWebSerialSupported(true);
    }
  }, []);

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

  const clearSerialError = useCallback(() => {
    setSerialError(null);
  }, []);

  const clearSerialLogs = useCallback(() => {
    setSerialLogs([]);
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

  const writeToSerialPort = useCallback(async (cmdString: string) => {
    if (writerRef.current) {
      try {
        const enc = new TextEncoder();
        await writerRef.current.write(enc.encode(cmdString.trim() + '\n'));
        return true;
      } catch (e) {
        console.warn('[WEB SERIAL] Gagal menulis perintah ke COM port:', e);
      }
    }
    return false;
  }, []);

  const sendCommand = useCallback(
    async (action: string, value?: unknown) => {
      const formatted = action.trim().startsWith('CMD:') ? action.trim() : `CMD:${action.trim()}`;
      setSerialLogs((prev) => [...prev.slice(-140), `>>> PERINTAH DIKIRIM: ${formatted}`]);

      await writeToSerialPort(formatted);

      try {
        await Promise.allSettled([
          fetch('/api/iot/telemetry', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              targetDeviceId: 'ESP32-MINIATURE',
              action: formatted,
              value,
            }),
          }),
          fetch('/api/iot/control', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              targetDeviceId: 'ESP32-MINIATURE',
              action: formatted,
              value,
            }),
          }),
        ]);
      } catch (err) {
        console.error('Gagal mengirim perintah ke antrean kontrol:', err);
      }
    },
    [writeToSerialPort]
  );

  // ==========================================================
  // PEMROSESAN PAKET JSON DAN BARIS SERIAL DARI ESP32
  // ==========================================================
  const applyIncomingEspJson = useCallback(
    (parsed: any) => {
      const now = Date.now();
      const nowTime = new Date().toLocaleTimeString('id-ID', { hour12: false });

      // 1. Update Gas MQ
      if (parsed.gas !== undefined && now - lastGasCmdTimeRef.current > 2000) {
        const val = Number(parsed.gas);
        const mode: 'AUTO' | 'MANUAL' = parsed.gasMode === 'MANUAL' ? 'MANUAL' : 'AUTO';
        const statusPolusi: GasAirQualityData['statusPolusi'] =
          parsed.statusPolusi || (val < 1000 ? 'UDARA BERSIH' : val < 1500 ? 'POLUSI SEDANG' : 'POLUSI TINGGI');
        const isHigh = val >= 1500;

        setGas((prev) => ({
          ...prev,
          gasValue: val,
          gasMode: mode,
          statusPolusi,
          isAlarmActive: isHigh,
          lastAlarmTime: isHigh ? prev.lastAlarmTime || nowTime : prev.lastAlarmTime,
          lcdBaris1: formatLcdLine1(val),
          lcdBaris2: formatLcdLine2(statusPolusi),
          lcdTersedia: true,
        }));

        if (isHigh) {
          if (Date.now() > alarmSnoozeUntil) {
            setIsPollutionAlarmActive(true);
            sounds.startPollutionAlarm();
          }
        } else {
          sounds.stopPollutionAlarm();
          setIsPollutionAlarmActive(false);
        }
      }

      // 2. Update Penyeberangan Sensor Touch + Dual Traffic Light
      if (parsed.lampu !== undefined || parsed.touchKanan !== undefined || parsed.touchKiri !== undefined) {
        const touchKanan = Boolean(parsed.touchKanan ?? parsed.orangKanan ?? false);
        const touchKiri = Boolean(parsed.touchKiri ?? parsed.orangKiri ?? false);
        const lampu = normalizeCrossingPhase(parsed.lampu);
        const visuals = deriveCrossingVisuals(lampu);
        const isCrossingBuzzer =
          parsed.buzzerSeberang !== undefined ? Boolean(parsed.buzzerSeberang) : lampu === 'MENYEBRANG';

        setCrossing((prev) => {
          const nextCountdown =
            parsed.countdown !== undefined
              ? Number(parsed.countdown)
              : lampu !== prev.lampu
              ? visuals.defaultDuration
              : prev.countdownSeconds;

          return {
            ...prev,
            touchKanan,
            touchKiri,
            siapMenyeberang: lampu === 'NORMAL',
            lampu,
            lampuKendaraan: visuals.lampuKendaraan,
            lampuPejalan: visuals.lampuPejalan,
            buzzer: isCrossingBuzzer,
            countdownSeconds: lampu === 'NORMAL' ? 0 : nextCountdown,
            statusRingkasan: visuals.statusRingkasan,
            sumberTerakhir: touchKanan
              ? 'TOUCH KANAN (PIN 17)'
              : touchKiri
              ? 'TOUCH KIRI (PIN 16)'
              : prev.sumberTerakhir,
          };
        });
      }

      // 3. Update Smart PJU
      if (parsed.ldr !== undefined && now - lastPjuCmdTimeRef.current > 2000) {
        const ldr = Number(parsed.ldr);
        const mode: 'AUTO' | 'ON' | 'OFF' = parsed.pjuMode || 'AUTO';
        const isDark = ldr > 2000;
        const kondisi: SmartPJUData['kondisi'] =
          parsed.kondisi || (mode === 'ON' ? 'MANUAL_ON' : mode === 'OFF' ? 'MANUAL_OFF' : isDark ? 'GELAP' : 'TERANG');
        const pjuStatus: SmartPJUData['pjuStatus'] =
          parsed.pjuStatus || (kondisi === 'MANUAL_ON' || kondisi === 'GELAP' ? 'MENYALA' : 'MATI');
        const ledsOn = pjuStatus === 'MENYALA';

        setPju((prev) => ({
          ...prev,
          ldrValue: ldr,
          pjuMode: mode,
          kondisi,
          pjuStatus,
          ledMerah: ledsOn,
          ledPutih: ledsOn,
        }));
      }

      setIsHardwareConnected(true);
      setLastTelemetryTimestamp(nowTime);
    },
    [alarmSnoozeUntil]
  );

  // Parsing baris teks biasa dari Thonny/ESP32
  const applyIncomingPlainLine = useCallback((line: string) => {
    const nowTime = new Date().toLocaleTimeString('id-ID', { hour12: false });
    setIsHardwareConnected(true);
    setLastTelemetryTimestamp(nowTime);

    const gasMatch = line.match(/^Nilai gas:\s*(\d+)/i);
    if (gasMatch) {
      const val = parseInt(gasMatch[1], 10);
      const statusPolusi: GasAirQualityData['statusPolusi'] =
        val < 1000 ? 'UDARA BERSIH' : val < 1500 ? 'POLUSI SEDANG' : 'POLUSI TINGGI';
      setGas((prev) => ({
        ...prev,
        gasValue: val,
        statusPolusi,
        isAlarmActive: val >= 1500,
        lcdBaris1: formatLcdLine1(val),
        lcdBaris2: formatLcdLine2(statusPolusi),
      }));
      return;
    }

    const touchKananMatch = line.match(/^Touch kanan:\s*(True|False)/i);
    if (touchKananMatch) {
      const active = touchKananMatch[1].toLowerCase() === 'true';
      setCrossing((prev) => ({ ...prev, touchKanan: active }));
      return;
    }

    const touchKiriMatch = line.match(/^Touch kiri:\s*(True|False)/i);
    if (touchKiriMatch) {
      const active = touchKiriMatch[1].toLowerCase() === 'true';
      setCrossing((prev) => ({ ...prev, touchKiri: active }));
      return;
    }

    if (line.includes('>>> TOUCH KANAN TERDETEKSI')) {
      setCrossing((prev) => ({ ...prev, touchKanan: true, sumberTerakhir: 'TOUCH KANAN (PIN 17)' }));
      return;
    }

    if (line.includes('>>> TOUCH KIRI TERDETEKSI')) {
      setCrossing((prev) => ({ ...prev, touchKiri: true, sumberTerakhir: 'TOUCH KIRI (PIN 16)' }));
      return;
    }

    if (line.includes('PERMINTAAN PENYEBERANGAN DITERIMA')) {
      const v = deriveCrossingVisuals('KUNING_KENDARAAN');
      setCrossing((prev) => ({
        ...prev,
        lampu: 'KUNING_KENDARAAN',
        lampuKendaraan: v.lampuKendaraan,
        lampuPejalan: v.lampuPejalan,
        siapMenyeberang: false,
        buzzer: false,
        countdownSeconds: v.defaultDuration,
        statusRingkasan: v.statusRingkasan,
      }));
      return;
    }

    if (line.includes('KENDARAAN MERAH, PEJALAN KAKI KUNING')) {
      const v = deriveCrossingVisuals('KUNING_PEJALAN');
      setCrossing((prev) => ({
        ...prev,
        lampu: 'KUNING_PEJALAN',
        lampuKendaraan: v.lampuKendaraan,
        lampuPejalan: v.lampuPejalan,
        siapMenyeberang: false,
        buzzer: false,
        countdownSeconds: v.defaultDuration,
        statusRingkasan: v.statusRingkasan,
      }));
      return;
    }

    if (line.includes('PEJALAN KAKI HIJAU')) {
      const v = deriveCrossingVisuals('MENYEBRANG');
      setCrossing((prev) => ({
        ...prev,
        lampu: 'MENYEBRANG',
        lampuKendaraan: v.lampuKendaraan,
        lampuPejalan: v.lampuPejalan,
        siapMenyeberang: false,
        buzzer: true,
        countdownSeconds: v.defaultDuration,
        statusRingkasan: v.statusRingkasan,
      }));
      return;
    }

    if (line.includes('WAKTU MENYEBRANG SELESAI')) {
      const v = deriveCrossingVisuals('KUNING_PENUTUP');
      setCrossing((prev) => ({
        ...prev,
        lampu: 'KUNING_PENUTUP',
        lampuKendaraan: v.lampuKendaraan,
        lampuPejalan: v.lampuPejalan,
        siapMenyeberang: false,
        buzzer: false,
        countdownSeconds: v.defaultDuration,
        statusRingkasan: v.statusRingkasan,
      }));
      return;
    }

    if (line.includes('KEMBALI KE KONDISI NORMAL') || line.includes('DIRESET KE NORMAL')) {
      const v = deriveCrossingVisuals('NORMAL');
      setCrossing((prev) => ({
        ...prev,
        lampu: 'NORMAL',
        lampuKendaraan: v.lampuKendaraan,
        lampuPejalan: v.lampuPejalan,
        siapMenyeberang: true,
        buzzer: false,
        countdownSeconds: 0,
        statusRingkasan: v.statusRingkasan,
      }));
      return;
    }

    const faseMatch = line.match(/^Fase traffic light:\s*(\S+)/i);
    if (faseMatch) {
      const phase = normalizeCrossingPhase(faseMatch[1]);
      const v = deriveCrossingVisuals(phase);
      setCrossing((prev) => ({
        ...prev,
        lampu: phase,
        lampuKendaraan: v.lampuKendaraan,
        lampuPejalan: v.lampuPejalan,
        siapMenyeberang: phase === 'NORMAL',
        buzzer: phase === 'MENYEBRANG',
        countdownSeconds: phase !== prev.lampu ? v.defaultDuration : prev.countdownSeconds,
        statusRingkasan: v.statusRingkasan,
      }));
      return;
    }

    const ldrMatch = line.match(/^Nilai LDR:\s*(\d+)/i);
    if (ldrMatch) {
      const ldrVal = parseInt(ldrMatch[1], 10);
      setPju((prev) => {
        const isDark = ldrVal > prev.thresholdLdr;
        const kondisi =
          prev.pjuMode === 'ON'
            ? 'MANUAL_ON'
            : prev.pjuMode === 'OFF'
            ? 'MANUAL_OFF'
            : isDark
            ? 'GELAP'
            : 'TERANG';
        const pjuStatus = kondisi === 'MANUAL_ON' || kondisi === 'GELAP' ? 'MENYALA' : 'MATI';
        const ledsOn = pjuStatus === 'MENYALA';
        return {
          ...prev,
          ldrValue: ldrVal,
          kondisi,
          pjuStatus,
          ledMerah: ledsOn,
          ledPutih: ledsOn,
        };
      });
    }
  }, []);

  // ==========================================================
  // KONEKSI LANGSUNG WEB SERIAL API (CHROME / EDGE -> COM3)
  // ==========================================================
  const connectSerial = useCallback(async () => {
    if (typeof window === 'undefined' || !('serial' in navigator)) {
      setSerialError('Web Serial API memerlukan browser Google Chrome atau Microsoft Edge.');
      return;
    }

    try {
      setIsConnectingSerial(true);
      setSerialError(null);
      const navSerial = (navigator as unknown as { serial: { requestPort: () => Promise<any> } }).serial;
      const port = await navSerial.requestPort();
      await port.open({ baudRate: 115200 });
      portRef.current = port;

      if (port.writable) {
        writerRef.current = port.writable.getWriter();
      }

      setIsSerialConnected(true);
      setIsHardwareConnected(true);
      keepReadingRef.current = true;

      const ts = new Date().toLocaleTimeString('id-ID', { hour12: false });
      setSerialLogs((prev) => [...prev, `[${ts}] [USB SERIAL] Terhubung ke ESP32 (115200 baud).`]);
      addEventLog('Serial COM3', 'USB Terhubung', 'Koneksi langsung Web Serial 115200 baud aktif', 'HARDWARE');

      const textDecoder = new TextDecoderStream();
      port.readable.pipeTo(textDecoder.writable).catch(() => {});
      const reader = textDecoder.readable.getReader();

      let lineBuffer = '';
      while (keepReadingRef.current) {
        const { value, done } = await reader.read();
        if (done) break;
        if (value) {
          lineBuffer += value;
          const lines = lineBuffer.split('\n');
          lineBuffer = lines.pop() || '';

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed) continue;

            setSerialLogs((prev) => [...prev.slice(-140), trimmed]);

            if (trimmed.startsWith('[JSON]')) {
              try {
                const parsed = JSON.parse(trimmed.substring(6));
                applyIncomingEspJson(parsed);

                const nowMs = Date.now();
                if (nowMs - lastSerialCloudSyncRef.current >= 450) {
                  lastSerialCloudSyncRef.current = nowMs;
                  const isPjuOn = parsed.pjuStatus === 'MENYALA';
                  const phase = normalizeCrossingPhase(parsed.lampu);
                  const visuals = deriveCrossingVisuals(phase);

                  fetch('/api/iot/telemetry', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      deviceId: 'ESP32-MINIATURE',
                      type: 'miniature-all',
                      payload: {
                        gas: {
                          gasValue: parsed.gas,
                          gasMode: parsed.gasMode || 'AUTO',
                          statusPolusi: parsed.statusPolusi,
                        },
                        crossing: {
                          touchKanan: Boolean(parsed.touchKanan ?? parsed.orangKanan ?? false),
                          touchKiri: Boolean(parsed.touchKiri ?? parsed.orangKiri ?? false),
                          lampu: phase,
                          countdown: parsed.countdown ?? visuals.defaultDuration,
                          buzzer: parsed.buzzerSeberang ?? phase === 'MENYEBRANG',
                          siapMenyeberang: phase === 'NORMAL',
                          statusRingkasan: visuals.statusRingkasan,
                        },
                        pju: {
                          ldrValue: parsed.ldr,
                          kondisi: parsed.kondisi,
                          pjuStatus: parsed.pjuStatus,
                          pjuMode: parsed.pjuMode || 'AUTO',
                          ledMerah: isPjuOn,
                          ledPutih: isPjuOn,
                        },
                      },
                    }),
                  })
                    .then((r) => r.json())
                    .then((resData) => {
                      if (resData?.commands && Array.isArray(resData.commands)) {
                        resData.commands.forEach((cmdObj: { action?: string }) => {
                          if (cmdObj.action) {
                            writeToSerialPort(cmdObj.action);
                          }
                        });
                      }
                    })
                    .catch(() => {});
                }
              } catch {}
            } else {
              applyIncomingPlainLine(trimmed);
            }
          }
        }
      }

      reader.releaseLock();
    } catch (err: unknown) {
      const errorObj = err as { name?: string; message?: string };
      if (errorObj.name !== 'NotFoundError') {
        setSerialError(
          `Gagal membuka COM3: ${errorObj.message || 'Pastikan Thonny sudah ditutup agar port COM3 tidak terkunci.'}`
        );
      }
    } finally {
      setIsConnectingSerial(false);
    }
  }, [addEventLog, applyIncomingEspJson, applyIncomingPlainLine, writeToSerialPort]);

  const disconnectSerial = useCallback(async () => {
    keepReadingRef.current = false;
    if (writerRef.current) {
      try {
        await writerRef.current.close();
      } catch {}
      writerRef.current = null;
    }
    if (portRef.current) {
      try {
        await portRef.current.close();
      } catch {}
      portRef.current = null;
    }
    setIsSerialConnected(false);
    setIsHardwareConnected(false);
    const ts = new Date().toLocaleTimeString('id-ID', { hour12: false });
    setSerialLogs((prev) => [...prev, `[${ts}] [USB SERIAL] Koneksi USB diputus.`]);
  }, []);

  // ==========================================================
  // FITUR 5: SMART PJU LOGIC (AUTO LDR & MANUAL ON/OFF)
  // ==========================================================
  const controlPjuManual = useCallback(
    (mode: 'ON' | 'OFF' | 'AUTO') => {
      sounds.playClick();
      lastPjuCmdTimeRef.current = Date.now();
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

  const setLdrValue = useCallback(
    (value: number) => {
      lastPjuCmdTimeRef.current = Date.now();
      const clamped = Math.max(0, Math.min(4095, Math.round(value)));
      sendCommand(`CMD:LDR_SET:${clamped}`, clamped);

      const nowTime = new Date().toLocaleTimeString('id-ID', { hour12: false });
      setPju((prev) => {
        if (prev.pjuMode === 'ON' || prev.pjuMode === 'OFF') {
          return { ...prev, ldrValue: clamped };
        }
        const isDark = clamped > prev.thresholdLdr;
        const nextKondisi = isDark ? 'GELAP' : 'TERANG';
        const conditionChanged = nextKondisi !== prev.kondisi;
        return {
          ...prev,
          ldrValue: clamped,
          kondisi: nextKondisi,
          pjuStatus: isDark ? 'MENYALA' : 'MATI',
          ledMerah: isDark,
          ledPutih: isDark,
          jamTerakhirBeralih: conditionChanged ? nowTime : prev.jamTerakhirBeralih,
          siklusWaktu: isDark ? 'MALAM' : 'SIANG',
        };
      });
    },
    [sendCommand]
  );

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
  // FITUR 2 & 3: SMART PENYEBERANGAN SENSOR TOUCH + DUAL TRAFFIC LIGHT
  // Urutan: NORMAL -> KUNING_KENDARAAN (3s) -> KUNING_PEJALAN (2s)
  //         -> MENYEBRANG (10s) -> KUNING_PENUTUP (2s) -> NORMAL
  // ==========================================================
  const triggerCrossingDetection = useCallback(
    (source: 'kanan' | 'kiri' | 'force') => {
      sounds.playSuccess();
      lastCrossingCmdTimeRef.current = Date.now();

      const cmd =
        source === 'kanan'
          ? 'CMD:TOUCH_KANAN'
          : source === 'kiri'
          ? 'CMD:TOUCH_KIRI'
          : 'CMD:FORCE_CROSSING';
      const label =
        source === 'kanan'
          ? 'TOUCH KANAN (PIN 17)'
          : source === 'kiri'
          ? 'TOUCH KIRI (PIN 16)'
          : 'WEB DASHBOARD';

      sendCommand(cmd);

      const v = deriveCrossingVisuals('KUNING_KENDARAAN');
      setCrossing((prev) => {
        if (prev.lampu !== 'NORMAL') {
          return {
            ...prev,
            touchKanan: source === 'kanan' ? true : prev.touchKanan,
            touchKiri: source === 'kiri' ? true : prev.touchKiri,
          };
        }
        return {
          ...prev,
          touchKanan: source === 'kanan',
          touchKiri: source === 'kiri',
          siapMenyeberang: false,
          lampu: 'KUNING_KENDARAAN',
          lampuKendaraan: v.lampuKendaraan,
          lampuPejalan: v.lampuPejalan,
          buzzer: false,
          countdownSeconds: v.defaultDuration,
          statusRingkasan: v.statusRingkasan,
          sumberTerakhir: label,
        };
      });

      if (source === 'kanan' || source === 'kiri') {
        if (touchPulseTimerRef.current) clearTimeout(touchPulseTimerRef.current);
        touchPulseTimerRef.current = setTimeout(() => {
          setCrossing((prev) => ({
            ...prev,
            touchKanan: false,
            touchKiri: false,
          }));
        }, 700);
      }

      addEventLog(
        'Penyeberangan Touch',
        cmd,
        `Pemicu: ${label}. Urutan: Kuning Kendaraan (3s) -> Kuning Pejalan (2s) -> Menyebrang (10s) -> Kuning Penutup (2s)`,
        'MANUAL'
      );
    },
    [sendCommand, addEventLog]
  );

  const resetCrossingToSafe = useCallback(() => {
    if (touchPulseTimerRef.current) clearTimeout(touchPulseTimerRef.current);
    sounds.playClick();
    lastCrossingCmdTimeRef.current = Date.now();
    sendCommand('CMD:CROSSING_RESET');

    const v = deriveCrossingVisuals('NORMAL');
    setCrossing((prev) => ({
      ...prev,
      touchKanan: false,
      touchKiri: false,
      siapMenyeberang: true,
      lampu: 'NORMAL',
      lampuKendaraan: v.lampuKendaraan,
      lampuPejalan: v.lampuPejalan,
      buzzer: false,
      countdownSeconds: 0,
      statusRingkasan: v.statusRingkasan,
    }));
    addEventLog(
      'Penyeberangan Touch',
      'CMD:CROSSING_RESET',
      'Reset ke NORMAL (Kendaraan Hijau Pin 12, Pejalan Merah Pin 27)',
      'MANUAL'
    );
  }, [sendCommand, addEventLog]);

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
      lastGasCmdTimeRef.current = Date.now();
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

      sendCommand(cmd, val);

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
  // TRAFFIC CONTROLLER (Kamera AI HotWheels / Browser)
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
  // SIKLUS DETIK: 5-FASE PENYEBERANGAN (SIMULASI) & TRAFFIC
  // ==========================================================
  useEffect(() => {
    if (!isSimulating) return;

    const timer = setInterval(() => {
      // Saat hardware fisik tidak sedang streaming langsung, jalankan state machine 5-fase di browser
      if (!isHardwareConnected && !isSerialConnected) {
        setCrossing((prev) => {
          if (prev.lampu === 'NORMAL') return prev;

          const nextCountdown = prev.countdownSeconds - 1;
          if (nextCountdown > 0) {
            return {
              ...prev,
              countdownSeconds: nextCountdown,
            };
          }

          let nextPhase: CrossingPhase = 'NORMAL';
          if (prev.lampu === 'KUNING_KENDARAAN') nextPhase = 'KUNING_PEJALAN';
          else if (prev.lampu === 'KUNING_PEJALAN') nextPhase = 'MENYEBRANG';
          else if (prev.lampu === 'MENYEBRANG') nextPhase = 'KUNING_PENUTUP';
          else if (prev.lampu === 'KUNING_PENUTUP') nextPhase = 'NORMAL';

          const v = deriveCrossingVisuals(nextPhase);
          return {
            ...prev,
            lampu: nextPhase,
            lampuKendaraan: v.lampuKendaraan,
            lampuPejalan: v.lampuPejalan,
            buzzer: nextPhase === 'MENYEBRANG',
            countdownSeconds: v.defaultDuration,
            siapMenyeberang: nextPhase === 'NORMAL',
            statusRingkasan: v.statusRingkasan,
          };
        });
      }

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
  }, [isSimulating, isHardwareConnected, isSerialConnected]);

  // ==========================================================
  // POLLING TELEMETRI DARI /api/iot/telemetry
  // ==========================================================
  useEffect(() => {
    if (!isLiveIoTMode) return;

    let isMounted = true;

    const syncTelemetry = async () => {
      try {
        const res = await fetch('/api/iot/telemetry', { cache: 'no-store' });
        if (!res.ok) return;
        const data = await res.json();

        if (!isMounted || !data.latestBySubsystem) return;

        const now = Date.now();
        let espDataFresh = isSerialConnected;
        let camDataFresh = false;

        // 1. Traffic Data
        if (data.latestBySubsystem['traffic']) {
          const t = data.latestBySubsystem['traffic'];
          const packetAge = now - new Date(t.timestamp).getTime();
          if (packetAge < 10000) {
            camDataFresh = true;
            if (t.timestamp !== lastTrafficTsRef.current) {
              lastTrafficTsRef.current = t.timestamp;
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
        }

        // Jika tidak sedang terhubung langsung lewat USB Web Serial, ambil paket baru dari Cloud Bridge
        if (!isSerialConnected) {
          // 2. Smart PJU Data (ESP32)
          if (data.latestBySubsystem['pju']) {
            const pjuPacket = data.latestBySubsystem['pju'];
            const packetAge = now - new Date(pjuPacket.timestamp).getTime();
            if (packetAge < 8000) {
              espDataFresh = true;
              if (
                pjuPacket.timestamp !== lastPjuTsRef.current &&
                now - lastPjuCmdTimeRef.current > 2000
              ) {
                lastPjuTsRef.current = pjuPacket.timestamp;
                const p = pjuPacket.payload;
                setPju((prev) => {
                  const ldr = p.ldrValue ?? p.ldr ?? prev.ldrValue;
                  const mode: 'AUTO' | 'ON' | 'OFF' = p.pjuMode ?? prev.pjuMode;
                  const isDark = ldr > prev.thresholdLdr;
                  const kondisi: SmartPJUData['kondisi'] =
                    p.kondisi ??
                    (mode === 'ON' ? 'MANUAL_ON' : mode === 'OFF' ? 'MANUAL_OFF' : isDark ? 'GELAP' : 'TERANG');
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
            }
          }

          // 3. Smart Penyeberangan Sensor Touch + Dual Traffic Light (ESP32)
          if (data.latestBySubsystem['pedestrian']) {
            const pedPacket = data.latestBySubsystem['pedestrian'];
            const packetAge = now - new Date(pedPacket.timestamp).getTime();
            if (packetAge < 8000) {
              espDataFresh = true;
              if (
                pedPacket.timestamp !== lastPedTsRef.current &&
                now - lastCrossingCmdTimeRef.current > 1200
              ) {
                lastPedTsRef.current = pedPacket.timestamp;
                const c = pedPacket.payload;
                setCrossing((prev) => {
                  const touchKanan = Boolean(c.touchKanan ?? c.orangKanan ?? false);
                  const touchKiri = Boolean(c.touchKiri ?? c.orangKiri ?? false);
                  const lampu = normalizeCrossingPhase(c.lampu ?? prev.lampu);
                  const visuals = deriveCrossingVisuals(lampu);
                  const isCrossingBuzzer =
                    c.buzzer !== undefined ? Boolean(c.buzzer) : lampu === 'MENYEBRANG';

                  return {
                    ...prev,
                    touchKanan,
                    touchKiri,
                    siapMenyeberang: lampu === 'NORMAL',
                    lampu,
                    lampuKendaraan: visuals.lampuKendaraan,
                    lampuPejalan: visuals.lampuPejalan,
                    buzzer: isCrossingBuzzer,
                    countdownSeconds:
                      c.countdown !== undefined
                        ? Number(c.countdown)
                        : lampu !== prev.lampu
                        ? visuals.defaultDuration
                        : prev.countdownSeconds,
                    statusRingkasan: visuals.statusRingkasan,
                  };
                });
              }
            }
          }

          // 4. Sensor Gas MQ + LCD 16x2 Data (ESP32)
          if (data.latestBySubsystem['air-quality']) {
            const gasPacket = data.latestBySubsystem['air-quality'];
            const packetAge = now - new Date(gasPacket.timestamp).getTime();
            if (packetAge < 8000) {
              espDataFresh = true;
              if (
                gasPacket.timestamp !== lastGasTsRef.current &&
                now - lastGasCmdTimeRef.current > 2000
              ) {
                lastGasTsRef.current = gasPacket.timestamp;
                const g = gasPacket.payload;
                setGas((prev) => {
                  const incomingMode: 'AUTO' | 'MANUAL' = g.gasMode === 'MANUAL' ? 'MANUAL' : 'AUTO';
                  const val = g.gasValue ?? g.gas ?? prev.gasValue;

                  const statusPolusi: GasAirQualityData['statusPolusi'] =
                    g.statusPolusi ??
                    (val < 1000 ? 'UDARA BERSIH' : val < 1500 ? 'POLUSI SEDANG' : 'POLUSI TINGGI');
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
                    gasMode: incomingMode,
                    statusPolusi,
                    isAlarmActive: isHigh,
                    lastAlarmTime: isHigh ? prev.lastAlarmTime || nowTime : prev.lastAlarmTime,
                    lcdBaris1: formatLcdLine1(val),
                    lcdBaris2: formatLcdLine2(statusPolusi),
                    lcdTersedia: true,
                  };
                });
              }
            }
          }
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

    const interval = setInterval(syncTelemetry, 900);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [isLiveIoTMode, isSerialConnected, alarmSnoozeUntil]);

  const alarmGas = gas.gasValue >= 1500;
  const alarmSeberang = crossing.lampu === 'MENYEBRANG';
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
        isWebSerialSupported,
        isSerialConnected,
        isConnectingSerial,
        serialError,
        clearSerialError,
        serialLogs,
        clearSerialLogs,
        connectSerial,
        disconnectSerial,
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
