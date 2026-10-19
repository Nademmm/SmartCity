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
  const consoleContainerRef = useRef<HTMLDivElement>(null);
  const portRef = useRef<any>(null);
  const writerRef = useRef<any>(null);
  const keepReadingRef = useRef<boolean>(true);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'serial' in navigator) {
      setIsWebSerialSupported(true);
    }
  }, []);

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
        `[${new Date().toLocaleTimeString('id-ID')}] [USB SERIAL] Terhubung ke ESP32 (115200 baud). Kontrol dua arah aktif.`,
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
        `1. Klik tombol [Sambungkan USB] di pojok kanan atas konsol ini.`,
        `2. Pilih perangkat "USB-SERIAL CH340 (COM3)" dan klik Sambungkan.`,
        `3. Data sensor Gas MQ, Ultrasonik, dan LDR akan otomatis mengalir real-time.`,
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
          `[${timestamp}] [CONNECTED] ESP32 aktif. Menerima telemetri real-time.`,
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
    if (autoScroll && consoleContainerRef.current) {
      consoleContainerRef.current.scrollTop = consoleContainerRef.current.scrollHeight;
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
    <div className="neu-raised rounded-2xl border border-[#dfdbd2] p-5 flex flex-col gap-4">
      {/* Console Header */}
      <div className="flex items-center justify-between flex-wrap gap-3 pb-3 border-b border-[#dfdbd2]">
        <div className="flex items-center gap-2.5">
          <Terminal className="w-4 h-4 text-[#1d6a47]" />
          <h4 className="text-xs font-mono font-bold text-[#25282b]">{title}</h4>
          <span
            className={`px-2.5 py-0.5 rounded-md text-[10px] font-mono font-bold border ${
              isHardwareConnected || isSerialConnected
                ? 'bg-[#e4e9e4] text-[#1d6a47] border-[#cbd5cb]'
                : 'bg-[#dedad0] text-[#4c5156] border-[#cfcac0]'
            }`}
          >
            {isHardwareConnected || isSerialConnected ? 'Online (115200)' : 'Siaga (COM3)'}
          </span>
        </div>

        <div className="flex items-center gap-2 text-xs flex-wrap">
          {/* Web Serial Direct USB Connect Button */}
          {isWebSerialSupported && (
            <button
              type="button"
              onClick={isSerialConnected ? disconnectSerial : connectSerial}
              disabled={isConnecting}
              className={`neu-btn px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 min-h-[44px] focus-visible:outline-2 focus-visible:outline-[#1d6a47] ${
                isSerialConnected
                  ? 'text-[#a12d1f]'
                  : 'text-[#1d6a47]'
              }`}
              title={isSerialConnected ? 'Putuskan koneksi USB serial' : 'Buka dialog sambung USB ESP32'}
            >
              {isSerialConnected ? <Unplug className="w-4 h-4" /> : <Usb className="w-4 h-4" />}
              <span>{isConnecting ? 'Menghubungkan...' : isSerialConnected ? 'Putuskan USB' : 'Sambungkan USB'}</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setAutoScroll(!autoScroll)}
            className={`neu-btn px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 min-h-[44px] focus-visible:outline-2 focus-visible:outline-[#1d6a47] ${
              autoScroll ? 'neu-btn-active text-[#1d6a47]' : 'text-[#4c5156]'
            }`}
            title="Auto scroll"
          >
            <ArrowDownCircle className="w-4 h-4" />
            <span className="hidden sm:inline">Gulir</span>
          </button>

          <button
            type="button"
            onClick={handleCopy}
            className="neu-btn p-2 rounded-xl text-[#4c5156] hover:text-[#25282b] min-h-[44px] min-w-[44px] flex items-center justify-center focus-visible:outline-2 focus-visible:outline-[#1d6a47]"
            title="Salin Log"
          >
            {copied ? <Check className="w-4 h-4 text-[#1d6a47]" /> : <Copy className="w-4 h-4" />}
          </button>

          <button
            type="button"
            onClick={handleClear}
            className="neu-btn p-2 rounded-xl text-[#4c5156] hover:text-[#a12d1f] min-h-[44px] min-w-[44px] flex items-center justify-center focus-visible:outline-2 focus-visible:outline-[#1d6a47]"
            title="Bersihkan"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Terminal Content Screen */}
      <div 
        ref={consoleContainerRef}
        className={`neu-inset p-4 rounded-xl font-mono text-[11px] leading-relaxed overflow-y-auto select-text ${maxHeight} bg-[#1e2124] text-[#e8e4dc] space-y-1 border border-[#dfdbd2]`}
      >
        {logs.length === 0 ? (
          <p className="text-[#7a8188] italic py-2">Tidak ada log.</p>
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
                    ? 'text-[#9ea4aa]'
                    : isHeader
                    ? 'text-[#5ec293] font-bold'
                    : isAlert
                    ? 'text-[#f87171] font-semibold'
                    : isWarning
                    ? 'text-[#fbbf24] font-semibold'
                    : isGood
                    ? 'text-[#34d399]'
                    : 'text-[#e8e4dc]'
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
      <div className="flex flex-col gap-3 pt-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[10px] font-mono font-bold text-[#4c5156] uppercase">Kontrol Cepat:</span>
          <button
            type="button"
            onClick={() => handleDispatchCommand('CMD:PJU_ON')}
            className="neu-btn px-3 py-1.5 rounded-lg text-xs font-semibold text-[#a12d1f] min-h-[44px] focus-visible:outline-2 focus-visible:outline-[#1d6a47]"
          >
            PJU ON
          </button>
          <button
            type="button"
            onClick={() => handleDispatchCommand('CMD:PJU_OFF')}
            className="neu-btn px-3 py-1.5 rounded-lg text-xs font-semibold text-[#4c5156] min-h-[44px] focus-visible:outline-2 focus-visible:outline-[#1d6a47]"
          >
            PJU OFF
          </button>
          <button
            type="button"
            onClick={() => handleDispatchCommand('CMD:PJU_AUTO')}
            className="neu-btn px-3 py-1.5 rounded-lg text-xs font-semibold text-[#1d6a47] min-h-[44px] focus-visible:outline-2 focus-visible:outline-[#1d6a47]"
          >
            PJU Auto
          </button>
          <button
            type="button"
            onClick={() => handleDispatchCommand('CMD:CROSSING_TRIGGER')}
            className="neu-btn px-3 py-1.5 rounded-lg text-xs font-semibold text-[#9c4c1a] min-h-[44px] focus-visible:outline-2 focus-visible:outline-[#1d6a47]"
          >
            Picu Zebra Cross
          </button>
          <button
            type="button"
            onClick={() => handleDispatchCommand('CMD:CROSSING_RESET')}
            className="neu-btn px-3 py-1.5 rounded-lg text-xs font-semibold text-[#1d6a47] min-h-[44px] focus-visible:outline-2 focus-visible:outline-[#1d6a47]"
          >
            Reset Aman
          </button>
          <button
            type="button"
            onClick={() => handleDispatchCommand('CMD:ALARM_TEST')}
            className="neu-btn px-3 py-1.5 rounded-lg text-xs font-semibold text-[#25282b] min-h-[44px] focus-visible:outline-2 focus-visible:outline-[#1d6a47]"
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
          className="flex items-center gap-2"
        >
          <input
            type="text"
            placeholder="Ketik perintah (contoh: CMD:PJU_ON, CMD:CROSSING_TRIGGER)..."
            value={customCommand}
            onChange={(e) => setCustomCommand(e.target.value)}
            className="flex-1 neu-inset rounded-xl px-4 py-2.5 text-xs font-mono text-[#25282b] placeholder-[#7a8188] border border-[#dfdbd2] focus:outline-none focus:border-[#1d6a47] min-h-[44px]"
          />
          <button
            type="submit"
            className="neu-btn px-4 py-2.5 rounded-xl text-xs font-bold text-[#1d6a47] flex items-center gap-1.5 min-h-[44px] focus-visible:outline-2 focus-visible:outline-[#1d6a47]"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Kirim</span>
          </button>
        </form>
      </div>

      {/* Console Footer */}
      <div className="pt-2 border-t border-[#dfdbd2] text-[10px] font-mono text-[#4c5156] flex items-center justify-between">
        <p>{isHardwareConnected ? 'Serial Aktif (Thonny)' : 'Port TTY Menunggu Koneksi'}</p>
        <p>{logs.length} Baris</p>
      </div>
    </div>
  );
};
