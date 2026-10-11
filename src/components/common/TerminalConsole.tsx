'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useSmartCity } from '@/context/SmartCityContext';
import { Terminal, Copy, Check, Trash2, ArrowDownCircle, Usb, Unplug, Send } from 'lucide-react';

interface TerminalConsoleProps {
  filterFeature?: 'all' | 'polusi' | 'penyeberangan' | 'pju';
  title?: string;
  maxHeight?: string;
}

export const TerminalConsole: React.FC<TerminalConsoleProps> = ({
  filterFeature = 'all',
  title = 'Serial Output Console',
  maxHeight = 'max-h-80',
}) => {
  const { gas, crossing, pju, isHardwareConnected, sendCommand } = useSmartCity();
  const [logs, setLogs] = useState<string[]>([]);
  const [copied, setCopied] = useState(false);
  const [autoScroll, setAutoScroll] = useState(true);
  const [isWebSerialSupported, setIsWebSerialSupported] = useState(false);
  const [isSerialConnected, setIsSerialConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [customCommand, setCustomCommand] = useState('');

  const bottomRef = useRef<HTMLDivElement>(null);
  const portRef = useRef<any>(null);
  const writerRef = useRef<any>(null);
  const keepReadingRef = useRef<boolean>(true);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'serial' in navigator) {
      setIsWebSerialSupported(true);
    }
  }, []);

  const sendSerialDirect = async (cmdText: string) => {
    if (writerRef.current) {
      try {
        const encoder = new TextEncoder();
        await writerRef.current.write(encoder.encode(cmdText + '\n'));
        return true;
      } catch (err) {
        console.error('Gagal menulis langsung ke USB:', err);
      }
    }
    return false;
  };

  const connectSerial = async () => {
    if (!('serial' in navigator)) {
      alert('Browser ini belum mendukung Web Serial API. Silakan gunakan Google Chrome atau Microsoft Edge.');
      return;
    }

    try {
      setIsConnecting(true);
      const port = await (navigator as any).serial.requestPort();
      await port.open({ baudRate: 115200 });
      portRef.current = port;

      // Inisialisasi Writable Stream untuk mengirim perintah balik ke ESP32
      if (port.writable) {
        const writer = port.writable.getWriter();
        writerRef.current = writer;
        (window as any).__urbanpulse_send_serial = async (cmd: string) => {
          const enc = new TextEncoder();
          await writer.write(enc.encode(cmd + '\n'));
        };
      }

      setIsSerialConnected(true);
      keepReadingRef.current = true;

      setLogs((prev) => [
        ...prev,
        `[${new Date().toLocaleTimeString('id-ID')}] [USB SERIAL] Terhubung ke ESP32 (115200 baud). Kontrol dua arah aktif!`,
      ]);

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

            // Masukkan ke log tampilan konsol
            setLogs((prev) => [...prev.slice(-150), trimmed]);

            // Parsing data telemetri jika ada format JSON
            if (trimmed.startsWith('[JSON]')) {
              try {
                const parsed = JSON.parse(trimmed.substring(6));
                fetch('/api/iot/telemetry', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    deviceId: 'ESP32-MINIATURE',
                    type: 'miniature-all',
                    payload: {
                      gas: { gasValue: parsed.gas, statusPolusi: parsed.statusPolusi },
                      crossing: {
                        jarakKanan: parsed.jarakKanan,
                        jarakKiri: parsed.jarakKiri,
                        orangKanan: parsed.orangKanan,
                        orangKiri: parsed.orangKiri,
                        lampu: parsed.lampu,
                        siapMenyeberang: parsed.siapMenyeberang,
                        statusRingkasan: parsed.orangKanan || parsed.orangKiri ? 'OBJEK TERDETEKSI' : 'AMAN',
                      },
                      pju: {
                        ldrValue: parsed.ldr,
                        kondisi: parsed.kondisi,
                        pjuStatus: parsed.pjuStatus,
                        pjuMode: parsed.pjuMode,
                        ledMerah: parsed.ldr > 2000 || parsed.kondisi === 'MANUAL_ON',
                        ledPutih: parsed.ldr > 2000 || parsed.kondisi === 'MANUAL_ON',
                      },
                    },
                  }),
                }).catch(() => {});
              } catch {}
            }
          }
        }
      }

      reader.releaseLock();
    } catch (err: any) {
      if (err.name !== 'NotFoundError') {
        console.error('Serial connection error:', err);
        setLogs((prev) => [...prev, `[ERROR] Gagal membuka port serial: ${err.message}`]);
      }
    } finally {
      setIsConnecting(false);
    }
  };

  const disconnectSerial = async () => {
    keepReadingRef.current = false;
    delete (window as any).__urbanpulse_send_serial;
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
    setLogs((prev) => [
      ...prev,
      `[${new Date().toLocaleTimeString('id-ID')}] [USB SERIAL] Koneksi serial diputuskan.`,
    ]);
  };

  const handleDispatchCommand = async (cmdString: string) => {
    if (!cmdString.trim()) return;
    const formatted = cmdString.trim().startsWith('CMD:') ? cmdString.trim() : `CMD:${cmdString.trim()}`;
    await sendCommand(formatted);
    setLogs((prev) => [
      ...prev,
      `[${new Date().toLocaleTimeString('id-ID')}] [TRANSMIT] Perintah Terkirim >> ${formatted}`,
    ]);
  };

  useEffect(() => {
    if (!isHardwareConnected && !isSerialConnected) {
      setLogs([
        `[STATUS] ESP32 TERHUBUNG VIA USB (CH340 COM3)`,
        `[FIRMWARE] Firmware MicroPython main.py telah terpasang di memori flash ESP32.`,
        `--------------------------------------------------------------------------------`,
        `Petunjuk Koneksi ke Dashboard:`,
        `1. Klik tombol hijau [Sambungkan USB] di pojok kanan atas konsol ini.`,
        `2. Pilih perangkat "USB-SERIAL CH340 (COM3)" dan klik Sambungkan.`,
        `3. Data sensor Gas MQ, Ultrasonik, dan LDR akan otomatis mengalir real-time!`,
        `--------------------------------------------------------------------------------`,
        `Alternatif Background Bridge:`,
        `Jalankan skrip: powershell firmware/bridge_serial_to_dashboard.ps1`,
        `--------------------------------------------------------------------------------`,
      ]);
    } else if (isHardwareConnected) {
      const timestamp = new Date().toLocaleTimeString('id-ID', { hour12: false });
      setLogs((prev) => {
        if (prev.some((l) => l.includes('[CONNECTED]'))) return prev;
        return [
          ...prev,
          `[${timestamp}] [CONNECTED] ESP32 aktif. Menerima telemetri real-time...`,
        ];
      });
    }
  }, [isHardwareConnected, isSerialConnected]);

  useEffect(() => {
    if (!isHardwareConnected && !isSerialConnected) return;

    const lines: string[] = [];

    if (filterFeature === 'all') {
      lines.push(`================================`);
      lines.push(`     SMART CITY TELEMETRY`);
      lines.push(`================================`);
      lines.push(`MONITORING POLUSI:`);
      lines.push(`Nilai gas: ${gas.gasValue} ADC | Status: ${gas.statusPolusi}`);
      lines.push(``);
      lines.push(`MONITORING PENYEBERANGAN:`);
      lines.push(`Jarak kanan: ${crossing.jarakKanan !== null ? (Math.round(crossing.jarakKanan * 10) / 10) + ' cm' : '-'}`);
      lines.push(`Jarak kiri: ${crossing.jarakKiri !== null ? (Math.round(crossing.jarakKiri * 10) / 10) + ' cm' : '-'}`);
      lines.push(`Lampu: ${crossing.lampu} | Sisa: ${crossing.countdownSeconds}s`);
      lines.push(``);
      lines.push(`SMART PJU:`);
      lines.push(`Nilai LDR: ${pju.ldrValue} | Kondisi: ${pju.kondisi} | PJU: ${pju.pjuStatus}`);
      lines.push(`================================`);
    } else if (filterFeature === 'polusi') {
      lines.push(`POLUSI: Nilai ${gas.gasValue} ADC | Status: ${gas.statusPolusi}`);
    } else if (filterFeature === 'penyeberangan') {
      lines.push(`PENYEBERANGAN: Kanan ${crossing.jarakKanan !== null ? Math.round(crossing.jarakKanan) + 'cm' : '-'} | Kiri ${crossing.jarakKiri !== null ? Math.round(crossing.jarakKiri) + 'cm' : '-'} | Lampu ${crossing.lampu}`);
    } else if (filterFeature === 'pju') {
      lines.push(`PJU: LDR ${pju.ldrValue} | Kondisi: ${pju.kondisi} | Status: ${pju.pjuStatus}`);
    }

    setLogs((prev) => [...prev.slice(-120), ...lines]);
  }, [isHardwareConnected, isSerialConnected, gas.gasValue, crossing.lampu, crossing.countdownSeconds, pju.ldrValue, filterFeature]);

  useEffect(() => {
    if (autoScroll && bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, autoScroll]);

  const handleCopy = () => {
    navigator.clipboard.writeText(logs.join('\n'));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleClear = () => {
    setLogs([]);
  };

  return (
    <div className="rounded-xl bg-[#080D18] border border-slate-800/80 overflow-hidden flex flex-col">
      {/* Console Header */}
      <div className="px-3.5 py-2.5 bg-slate-950/80 border-b border-slate-800/80 flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Terminal className="w-3.5 h-3.5 text-slate-400" />
          <h4 className="text-xs font-mono font-medium text-slate-200">{title}</h4>
          <div
            className={`px-2 py-0.5 rounded text-[10px] font-mono font-medium border ${
              isHardwareConnected || isSerialConnected
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25'
                : 'bg-slate-800/40 text-slate-400 border-slate-700/50'
            }`}
          >
            {isHardwareConnected || isSerialConnected ? 'Online (115200)' : 'Standby (COM3)'}
          </div>
        </div>

        <div className="flex items-center gap-1.5 text-xs flex-wrap">
          {/* Web Serial Direct USB Connect Button */}
          {isWebSerialSupported && (
            <button
              onClick={isSerialConnected ? disconnectSerial : connectSerial}
              disabled={isConnecting}
              className={`px-2.5 py-1 rounded text-[11px] font-mono font-medium transition-colors flex items-center gap-1.5 border cursor-pointer ${
                isSerialConnected
                  ? 'bg-rose-500/10 text-rose-300 border-rose-500/30 hover:bg-rose-500/20'
                  : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/30'
              }`}
              title={isSerialConnected ? 'Putuskan koneksi USB serial' : 'Buka dialog sambung USB ESP32'}
            >
              {isSerialConnected ? <Unplug className="w-3 h-3" /> : <Usb className="w-3 h-3" />}
              <span>{isConnecting ? 'Menghubungkan...' : isSerialConnected ? 'Putuskan USB' : 'Sambungkan USB'}</span>
            </button>
          )}

          <button
            onClick={() => setAutoScroll(!autoScroll)}
            className={`px-2 py-1 rounded text-[11px] font-mono transition-colors flex items-center gap-1 cursor-pointer ${
              autoScroll ? 'bg-slate-800 text-cyan-300' : 'text-slate-400 hover:text-white'
            }`}
            title="Auto scroll"
          >
            <ArrowDownCircle className="w-3 h-3" />
            <span className="hidden sm:inline">Scroll</span>
          </button>

          <button
            onClick={handleCopy}
            className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            title="Salin Log"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          </button>

          <button
            onClick={handleClear}
            className="p-1 rounded text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors cursor-pointer"
            title="Bersihkan"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Terminal Content */}
      <div className={`p-3.5 font-mono text-[11px] leading-relaxed overflow-y-auto select-text ${maxHeight} text-slate-300 space-y-0.5`}>
        {logs.length === 0 ? (
          <p className="text-slate-500 italic py-2">Tidak ada log.</p>
        ) : (
          logs.map((line, idx) => {
            const isHeader = line.includes('===') || line.includes('SMART CITY');
            const isOffline = line.includes('[STATUS] ESP32') || line.includes('STANDBY');
            const isAlert = line.includes('POLUSI TINGGI') || line.includes('MERAH');
            const isGood = line.includes('BERSIH') || line.includes('HIJAU') || line.includes('[CONNECTED]');
            const isWarning = line.includes('POLUSI SEDANG') || line.includes('KUNING') || line.includes('GELAP');

            return (
              <div
                key={idx}
                className={
                  isOffline
                    ? 'text-slate-400'
                    : isHeader
                    ? 'text-cyan-400 font-semibold'
                    : isAlert
                    ? 'text-rose-400 font-medium'
                    : isWarning
                    ? 'text-amber-300 font-medium'
                    : isGood
                    ? 'text-emerald-400'
                    : 'text-slate-300'
                }
              >
                {line}
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* Interactive Command Bar */}
      <div className="px-3.5 py-2 bg-slate-950/90 border-t border-slate-900/90 flex flex-col gap-2">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[10px] font-mono font-semibold text-slate-400 uppercase">Kontrol Cepat:</span>
          <button
            onClick={() => handleDispatchCommand('CMD:PJU_ON')}
            className="px-2 py-0.5 rounded bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 text-[10px] font-mono cursor-pointer transition-colors"
          >
            PJU ON
          </button>
          <button
            onClick={() => handleDispatchCommand('CMD:PJU_OFF')}
            className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-[10px] font-mono cursor-pointer transition-colors"
          >
            PJU OFF
          </button>
          <button
            onClick={() => handleDispatchCommand('CMD:PJU_AUTO')}
            className="px-2 py-0.5 rounded bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-[10px] font-mono cursor-pointer transition-colors"
          >
            PJU Auto
          </button>
          <button
            onClick={() => handleDispatchCommand('CMD:CROSSING_TRIGGER')}
            className="px-2 py-0.5 rounded bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-mono cursor-pointer transition-colors"
          >
            Picu Zebra Cross
          </button>
          <button
            onClick={() => handleDispatchCommand('CMD:CROSSING_RESET')}
            className="px-2 py-0.5 rounded bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-mono cursor-pointer transition-colors"
          >
            Reset Aman
          </button>
          <button
            onClick={() => handleDispatchCommand('CMD:ALARM_TEST')}
            className="px-2 py-0.5 rounded bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-[10px] font-mono cursor-pointer transition-colors"
          >
            Uji Buzzer
          </button>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (customCommand.trim()) {
              handleDispatchCommand(customCommand);
              setCustomCommand('');
            }
          }}
          className="flex items-center gap-1.5"
        >
          <input
            type="text"
            placeholder="Ketik perintah (contoh: CMD:PJU_ON, CMD:CROSSING_TRIGGER)..."
            value={customCommand}
            onChange={(e) => setCustomCommand(e.target.value)}
            className="flex-1 bg-slate-900 border border-slate-800 rounded px-2.5 py-1 text-[11px] font-mono text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50"
          />
          <button
            type="submit"
            className="px-2.5 py-1 rounded bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 text-[10px] font-mono font-medium flex items-center gap-1 cursor-pointer transition-colors"
          >
            <Send className="w-3 h-3" />
            <span>Kirim</span>
          </button>
        </form>
      </div>

      {/* Console Footer */}
      <div className="px-3.5 py-1.5 bg-slate-950/60 border-t border-slate-900 text-[10px] font-mono text-slate-500 flex items-center justify-between">
        <p>{isHardwareConnected ? 'Serial Aktif (Thonny)' : 'Port TTY Menunggu Koneksi'}</p>
        <p>{logs.length} Baris</p>
      </div>
    </div>
  );
};
