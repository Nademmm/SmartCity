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
  { cmd: 'CMD:GAS_BERSIH', label: 'GAS 650' },
  { cmd: 'CMD:GAS_SEDANG', label: 'GAS 1250' },
  { cmd: 'CMD:GAS_BAHAYA', label: 'GAS 2100' },
];

export const TerminalConsole: React.FC<TerminalConsoleProps> = ({
  filterFeature = 'all',
  title = 'Terminal Serial ESP32 (COM3 · 115200)',
  maxHeight = 'max-h-80',
}) => {
  const {
    gas,
    crossing,
    pju,
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
    sendCommand,
  } = useSmartCity();

  const [localLogs, setLocalLogs] = useState<string[]>([]);
  const [copied, setCopied] = useState(false);
  const [autoScroll, setAutoScroll] = useState(true);
  const [customCommand, setCustomCommand] = useState('');

  const consoleContainerRef = useRef<HTMLDivElement>(null);

  const handleDispatchCommand = async (cmdString: string) => {
    if (!cmdString.trim()) return;
    const formatted = cmdString.trim().startsWith('CMD:') ? cmdString.trim() : `CMD:${cmdString.trim()}`;
    await sendCommand(formatted);
    setLocalLogs((prev) => [...prev.slice(-100), `>>> PERINTAH DIKIRIM: ${formatted}`]);
  };

  useEffect(() => {
    if (!isHardwareConnected && !isSerialConnected) return;

    const jkStr = crossing.jarakKanan !== null ? crossing.jarakKanan.toFixed(1) : 'null';
    const jkrStr = crossing.jarakKiri !== null ? crossing.jarakKiri.toFixed(1) : 'null';

    const lines: string[] = [];
    if (filterFeature === 'all') {
      lines.push(
        `[JSON]{"gas":${gas.gasValue},"gasMode":"${gas.gasMode}","statusPolusi":"${gas.statusPolusi}","jarakKanan":${jkStr},"jarakKiri":${jkrStr},"orangKanan":${crossing.orangKanan},"orangKiri":${crossing.orangKiri},"lampu":"${crossing.lampu}","ldr":${pju.ldrValue},"kondisi":"${pju.kondisi}","pjuStatus":"${pju.pjuStatus}","pjuMode":"${pju.pjuMode}"}`
      );
    } else if (filterFeature === 'polusi') {
      lines.push(`MONITORING POLUSI | Nilai gas: ${gas.gasValue} (${gas.gasMode}) | Status: ${gas.statusPolusi}`);
    } else if (filterFeature === 'penyeberangan') {
      lines.push(`PENYEBERANGAN | Kanan: ${jkStr} cm | Kiri: ${jkrStr} cm | Fase: ${crossing.lampu}`);
    } else if (filterFeature === 'pju') {
      lines.push(`SMART PJU | LDR: ${pju.ldrValue} | Kondisi: ${pju.kondisi} | Status: ${pju.pjuStatus} (${pju.pjuMode})`);
    }

    setLocalLogs((prev) => [...prev.slice(-100), ...lines]);
  }, [
    isHardwareConnected,
    isSerialConnected,
    gas.gasValue,
    gas.gasMode,
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

  const displayedLogs = filterFeature === 'all' && serialLogs.length > 0 ? serialLogs : localLogs;

  useEffect(() => {
    if (autoScroll && consoleContainerRef.current) {
      consoleContainerRef.current.scrollTop = consoleContainerRef.current.scrollHeight;
    }
  }, [displayedLogs, autoScroll]);

  const handleCopy = () => {
    navigator.clipboard.writeText(displayedLogs.join('\n'));
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const handleClear = () => {
    setLocalLogs([]);
    clearSerialLogs();
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
              backgroundColor:
                isHardwareConnected || isSerialConnected ? 'var(--sig-green-bg)' : 'var(--bg-well)',
              borderColor:
                isHardwareConnected || isSerialConnected
                  ? 'var(--sig-green-border)'
                  : 'var(--border-line)',
              color:
                isHardwareConnected || isSerialConnected
                  ? 'var(--sig-green)'
                  : 'var(--text-secondary)',
            }}
          >
            {isConnectingSerial
              ? 'MENGHUBUNGKAN...'
              : isSerialConnected
              ? 'USB TERHUBUNG'
              : isHardwareConnected
              ? 'BRIDGE ONLINE'
              : 'SIAGA'}
          </span>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          {isWebSerialSupported && (
            <button
              type="button"
              onClick={isSerialConnected ? disconnectSerial : connectSerial}
              disabled={isConnectingSerial}
              className={`ctrl-btn ctrl-btn-sm font-mono ${
                isSerialConnected ? 'ctrl-btn-red' : 'ctrl-btn-green'
              }`}
            >
              <span>
                {isConnectingSerial
                  ? 'Membuka...'
                  : isSerialConnected
                  ? 'Putuskan USB'
                  : 'Sambungkan USB (COM3)'}
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
            onClick={handleClear}
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
              onClick={clearSerialError}
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
          {isConnectingSerial ? (
            <p className="text-[#FBBF24] py-3">Membuka koneksi serial COM3 (115200 baud)...</p>
          ) : displayedLogs.length === 0 ? (
            <div className="py-4 text-[#94A3B8] space-y-1">
              <p className="font-semibold text-[#F8FAFC]">Belum ada aliran data serial.</p>
              <p>
                Klik [Sambungkan USB (COM3)] di atas untuk menghubungkan ESP32 langsung ke browser, atau jalankan jembatan serial.
              </p>
            </div>
          ) : (
            displayedLogs.map((line, idx) => {
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
            placeholder="CMD:PJU_ON | CMD:FORCE_CROSSING | CMD:GAS_SET:1800"
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
