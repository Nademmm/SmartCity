'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useSmartCity } from '@/context/SmartCityContext';

interface TerminalConsoleProps {
  filterFeature?: 'all' | 'polusi' | 'penyeberangan' | 'pju';
  title?: string;
  maxHeight?: string;
}

const QUICK_COMMANDS = [
  { cmd: 'CMD:PJU_ON', label: 'PJU ON' },
  { cmd: 'CMD:PJU_OFF', label: 'PJU OFF' },
  { cmd: 'CMD:PJU_AUTO', label: 'PJU AUTO' },
  { cmd: 'CMD:FORCE_CROSSING', label: 'FORCE CROSSING' },
  { cmd: 'CMD:BUZZER_TEST', label: 'BUZZER TEST' },
  { cmd: 'CMD:CROSSING_RESET', label: 'RESET HIJAU' },
  { cmd: 'CMD:GAS_AUTO', label: 'GAS AUTO' },
];

export const TerminalConsole: React.FC<TerminalConsoleProps> = ({
  filterFeature = 'all',
  title = 'Terminal Serial ESP32 (COM3 · 115200)',
  maxHeight = 'max-h-80',
}) => {
  const { gas, crossing, pju, isHardwareConnected, sendCommand } = useSmartCity();
  const [logs, setLogs] = useState<string[]>([]);
  const [copied, setCopied] = useState(false);
  const [autoScroll, setAutoScroll] = useState(true);
  const [isWebSerialSupported, setIsWebSerialSupported] = useState(false);
  const [isSerialConnected, setIsSerialConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [serialError, setSerialError] = useState<string | null>(null);
  const [customCommand, setCustomCommand] = useState('');

  const consoleContainerRef = useRef<HTMLDivElement>(null);
  const portRef = useRef<unknown>(null);
  const writerRef = useRef<unknown>(null);
  const keepReadingRef = useRef<boolean>(true);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'serial' in navigator) {
      setIsWebSerialSupported(true);
    }
  }, []);

  const connectSerial = async () => {
    if (!('serial' in navigator)) {
      setSerialError('Web Serial API memerlukan Google Chrome atau Microsoft Edge.');
      return;
    }

    try {
      setIsConnecting(true);
      setSerialError(null);
      const navSerial = (navigator as unknown as { serial: { requestPort: () => Promise<any> } }).serial;
      const port = await navSerial.requestPort();
      await port.open({ baudRate: 115200 });
      portRef.current = port;

      if (port.writable) {
        const writer = port.writable.getWriter();
        writerRef.current = writer;
        (window as unknown as { __smartcity_send_serial?: (cmd: string) => Promise<void> }).__smartcity_send_serial = async (cmd: string) => {
          const enc = new TextEncoder();
          await writer.write(enc.encode(cmd + '\n'));
        };
      }

      setIsSerialConnected(true);
      keepReadingRef.current = true;

      setLogs((prev) => [
        ...prev,
        `[${new Date().toLocaleTimeString('id-ID', { hour12: false })}] [USB SERIAL] Terhubung 115200 baud.`,
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

            setLogs((prev) => [...prev.slice(-140), trimmed]);

            if (trimmed.startsWith('[JSON]')) {
              try {
                const parsed = JSON.parse(trimmed.substring(6));
                const isPjuOn = parsed.pjuStatus === 'MENYALA';
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
                        jarakKanan: parsed.jarakKanan,
                        jarakKiri: parsed.jarakKiri,
                        orangKanan: parsed.orangKanan,
                        orangKiri: parsed.orangKiri,
                        lampu: parsed.lampu,
                        buzzer: parsed.lampu === 'MERAH',
                        siapMenyeberang: parsed.lampu === 'HIJAU',
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
                }).catch(() => {});
              } catch {}
            }
          }
        }
      }

      reader.releaseLock();
    } catch (err: unknown) {
      const errorObj = err as { name?: string; message?: string };
      if (errorObj.name !== 'NotFoundError') {
        setSerialError(`Gagal membuka port COM3: ${errorObj.message || 'Port sibuk'}`);
      }
    } finally {
      setIsConnecting(false);
    }
  };

  const disconnectSerial = async () => {
    keepReadingRef.current = false;
    delete (window as unknown as { __smartcity_send_serial?: unknown }).__smartcity_send_serial;
    const writer = writerRef.current as { close?: () => Promise<void> } | null;
    if (writer && writer.close) {
      try {
        await writer.close();
      } catch {}
      writerRef.current = null;
    }
    const port = portRef.current as { close?: () => Promise<void> } | null;
    if (port && port.close) {
      try {
        await port.close();
      } catch {}
      portRef.current = null;
    }
    setIsSerialConnected(false);
    setLogs((prev) => [
      ...prev,
      `[${new Date().toLocaleTimeString('id-ID', { hour12: false })}] [USB SERIAL] Koneksi diputus.`,
    ]);
  };

  const handleDispatchCommand = async (cmdString: string) => {
    if (!cmdString.trim()) return;
    const formatted = cmdString.trim().startsWith('CMD:') ? cmdString.trim() : `CMD:${cmdString.trim()}`;
    await sendCommand(formatted);
    setLogs((prev) => [
      ...prev,
      `>>> PERINTAH DIKIRIM: ${formatted}`,
    ]);
  };

  useEffect(() => {
    if (!isHardwareConnected && !isSerialConnected) return;

    const jkStr = crossing.jarakKanan !== null ? crossing.jarakKanan.toFixed(1) : 'null';
    const jkrStr = crossing.jarakKiri !== null ? crossing.jarakKiri.toFixed(1) : 'null';

    const lines: string[] = [];
    if (filterFeature === 'all') {
      lines.push(
        `[JSON]{"gas":${gas.gasValue},"statusPolusi":"${gas.statusPolusi}","jarakKanan":${jkStr},"jarakKiri":${jkrStr},"orangKanan":${crossing.orangKanan},"orangKiri":${crossing.orangKiri},"lampu":"${crossing.lampu}","ldr":${pju.ldrValue},"kondisi":"${pju.kondisi}","pjuStatus":"${pju.pjuStatus}","pjuMode":"${pju.pjuMode}"}`
      );
    } else if (filterFeature === 'polusi') {
      lines.push(`MONITORING POLUSI | Nilai gas: ${gas.gasValue} | Status: ${gas.statusPolusi}`);
    } else if (filterFeature === 'penyeberangan') {
      lines.push(`PENYEBERANGAN | Kanan: ${jkStr} cm | Kiri: ${jkrStr} cm | Fase: ${crossing.lampu}`);
    } else if (filterFeature === 'pju') {
      lines.push(`SMART PJU | LDR: ${pju.ldrValue} | Kondisi: ${pju.kondisi} | Status: ${pju.pjuStatus} (${pju.pjuMode})`);
    }

    setLogs((prev) => [...prev.slice(-100), ...lines]);
  }, [
    isHardwareConnected,
    isSerialConnected,
    gas.gasValue,
    gas.statusPolusi,
    crossing.jarakKanan,
    crossing.jarakKiri,
    crossing.orangKanan,
    crossing.orangKiri,
    crossing.lampu,
    pju.ldrValue,
    pju.kondisi,
    pju.pjuStatus,
    pju.pjuMode,
    filterFeature,
  ]);

  useEffect(() => {
    if (autoScroll && consoleContainerRef.current) {
      consoleContainerRef.current.scrollTop = consoleContainerRef.current.scrollHeight;
    }
  }, [logs, autoScroll]);

  const handleCopy = () => {
    navigator.clipboard.writeText(logs.join('\n'));
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="rack-panel flex flex-col">
      {/* Header Bar */}
      <div className="px-4 py-3 bg-[var(--bg-header)] border-b border-[var(--border-line)] flex items-center justify-between flex-wrap gap-2 rounded-t-[10px]">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-sm text-[var(--text-primary)]">{title}</span>
          <span
            className="px-2 py-0.5 rounded-md text-[11px] font-mono font-bold border"
            style={{
              backgroundColor: isHardwareConnected || isSerialConnected ? 'var(--sig-green-bg)' : 'var(--bg-well)',
              borderColor: isHardwareConnected || isSerialConnected ? 'var(--sig-green-border)' : 'var(--border-line)',
              color: isHardwareConnected || isSerialConnected ? 'var(--sig-green)' : 'var(--text-secondary)',
            }}
          >
            {isConnecting ? 'MENGHUBUNGKAN...' : isHardwareConnected || isSerialConnected ? 'ONLINE' : 'SIAGA'}
          </span>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          {isWebSerialSupported && (
            <button
              type="button"
              onClick={isSerialConnected ? disconnectSerial : connectSerial}
              disabled={isConnecting}
              className={`ctrl-btn ctrl-btn-sm font-mono ${
                isSerialConnected ? 'ctrl-btn-red' : 'ctrl-btn-green'
              }`}
            >
              <span>
                {isConnecting ? 'Membuka...' : isSerialConnected ? 'Putuskan USB' : 'Sambungkan USB'}
              </span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setAutoScroll(!autoScroll)}
            className={`ctrl-btn ctrl-btn-sm font-mono ${autoScroll ? 'ctrl-btn-active' : ''}`}
          >
            <span>Auto-Scroll: {autoScroll ? 'ON' : 'OFF'}</span>
          </button>

          <button
            type="button"
            onClick={handleCopy}
            className="ctrl-btn ctrl-btn-sm font-mono"
          >
            <span>{copied ? 'Tersalin' : 'Salin'}</span>
          </button>

          <button
            type="button"
            onClick={() => setLogs([])}
            className="ctrl-btn ctrl-btn-sm font-mono"
          >
            <span>Bersihkan</span>
          </button>
        </div>
      </div>

      <div className="p-4 flex flex-col gap-3">
        {/* Error State */}
        {serialError && (
          <div
            className="p-3 rounded-lg border text-xs font-mono flex items-center justify-between gap-2"
            style={{
              backgroundColor: 'var(--sig-red-bg)',
              borderColor: 'var(--sig-red-border)',
              color: 'var(--sig-red)',
            }}
          >
            <span>{serialError}</span>
            <button
              type="button"
              onClick={() => setSerialError(null)}
              className="ctrl-btn ctrl-btn-sm font-mono"
            >
              Tutup
            </button>
          </div>
        )}

        {/* Serial Output Window */}
        <div
          ref={consoleContainerRef}
          className={`p-3.5 rounded-lg font-mono text-xs leading-relaxed overflow-y-auto select-text ${maxHeight} bg-[#0B0F17] text-[#E2E8F0] border border-[var(--border-strong)] space-y-1`}
        >
          {isConnecting ? (
            <p className="text-[#FBBF24] py-3">Membuka koneksi serial COM3 (115200 baud)...</p>
          ) : logs.length === 0 ? (
            <div className="py-4 text-[#94A3B8] space-y-1">
              <p className="font-semibold text-[#F8FAFC]">Belum ada aliran data serial.</p>
              <p>Klik [Sambungkan USB] atau kirim perintah di bawah untuk menguji respon ESP32.</p>
            </div>
          ) : (
            logs.map((line, idx) => {
              const isCmd = line.includes('>>>') || line.includes('CMD:');
              const isJson = line.startsWith('[JSON]');
              const isAlert = line.includes('POLUSI TINGGI') || line.includes('MERAH');
              return (
                <div
                  key={idx}
                  className={`break-all ${
                    isCmd
                      ? 'text-[#60A5FA] font-bold'
                      : isAlert
                      ? 'text-[#F87171]'
                      : isJson
                      ? 'text-[#4ADE80]'
                      : 'text-[#E2E8F0]'
                  }`}
                >
                  {line}
                </div>
              );
            })
          )}
        </div>

        {/* Quick Hardware Commands */}
        <div className="flex flex-wrap items-center gap-1.5">
          {QUICK_COMMANDS.map((item) => (
            <button
              key={item.cmd}
              type="button"
              onClick={() => handleDispatchCommand(item.cmd)}
              className="ctrl-btn ctrl-btn-sm font-mono"
            >
              {item.label}
            </button>
          ))}
        </div>

        {/* Manual Command Input */}
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
            placeholder="CMD:PJU_ON | CMD:FORCE_CROSSING | CMD:BUZZER_TEST"
            value={customCommand}
            onChange={(e) => setCustomCommand(e.target.value)}
            aria-label="Perintah Serial Manual"
            className="flex-1 rack-well px-3.5 h-9 text-xs font-mono text-[var(--text-primary)] placeholder:text-[var(--text-secondary)]"
          />
          <button
            type="submit"
            className="ctrl-btn ctrl-btn-active px-4 font-mono"
          >
            Kirim
          </button>
        </form>
      </div>
    </div>
  );
};
