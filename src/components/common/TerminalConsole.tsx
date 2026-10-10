'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useSmartCity } from '@/context/SmartCityContext';
import { Terminal, Copy, Check, Trash2, ArrowDownCircle } from 'lucide-react';

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
  const { gas, crossing, pju, isHardwareConnected } = useSmartCity();
  const [logs, setLogs] = useState<string[]>([]);
  const [copied, setCopied] = useState(false);
  const [autoScroll, setAutoScroll] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isHardwareConnected) {
      setLogs([
        `[STATUS] ESP32 STANDBY (BELUM TERHUBUNG)`,
        `[PORT]   Baud Rate: 115200 (Menunggu transmisi serial)`,
        `--------------------------------------------------------------------------------`,
        `Petunjuk:`,
        `1. Hubungkan modul ESP32 ke komputer melalui kabel USB.`,
        `2. Buka script MicroPython di Thonny IDE.`,
        `3. Jalankan program (F5).`,
        `4. Output pembacaan sensor MQ, LDR, dan Ultrasonik akan tampil di sini.`,
        `--------------------------------------------------------------------------------`,
      ]);
    } else {
      const timestamp = new Date().toLocaleTimeString('id-ID', { hour12: false });
      setLogs([
        `[${timestamp}] [CONNECTED] ESP32 terdeteksi aktif. Menerima serial stream...`,
      ]);
    }
  }, [isHardwareConnected]);

  useEffect(() => {
    if (!isHardwareConnected) return;

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
  }, [isHardwareConnected, gas.gasValue, crossing.lampu, crossing.countdownSeconds, pju.ldrValue, filterFeature]);

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
      <div className="px-3.5 py-2.5 bg-slate-950/80 border-b border-slate-800/80 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Terminal className="w-3.5 h-3.5 text-slate-400" />
          <h4 className="text-xs font-mono font-medium text-slate-200">{title}</h4>
          <div
            className={`px-2 py-0.5 rounded text-[10px] font-mono font-medium border ${
              isHardwareConnected
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25'
                : 'bg-slate-800/40 text-slate-400 border-slate-700/50'
            }`}
          >
            {isHardwareConnected ? 'Online (115200)' : 'Standby'}
          </div>
        </div>

        <div className="flex items-center gap-1.5 text-xs">
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

      {/* Console Footer */}
      <div className="px-3.5 py-1.5 bg-slate-950/60 border-t border-slate-900 text-[10px] font-mono text-slate-500 flex items-center justify-between">
        <p>{isHardwareConnected ? 'Serial Aktif (Thonny)' : 'Port TTY Menunggu Koneksi'}</p>
        <p>{logs.length} Baris</p>
      </div>
    </div>
  );
};
