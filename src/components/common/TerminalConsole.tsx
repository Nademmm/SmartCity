'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useSmartCity } from '@/context/SmartCityContext';
import { Terminal, Copy, Check, Trash2, ArrowDownCircle, AlertCircle } from 'lucide-react';

interface TerminalConsoleProps {
  filterFeature?: 'all' | 'polusi' | 'penyeberangan' | 'pju';
  title?: string;
  maxHeight?: string;
}

export const TerminalConsole: React.FC<TerminalConsoleProps> = ({
  filterFeature = 'all',
  title = 'Live Serial Console (Output Shell Thonny)',
  maxHeight = 'max-h-80',
}) => {
  const { gas, crossing, pju, isHardwareConnected } = useSmartCity();
  const [logs, setLogs] = useState<string[]>([]);
  const [copied, setCopied] = useState(false);
  const [autoScroll, setAutoScroll] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Set standby prompt when hardware is offline
  useEffect(() => {
    if (!isHardwareConnected) {
      setLogs([
        `[STATUS] ESP32 MINIATUR TIDAK TERHUBUNG (OFFLINE)`,
        `[SERIAL] Port TTY (115200 Baud): Standby (Tidak ada data terdeteksi)`,
        `[INFO]   Menunggu transmisi data dari MicroPython Thonny...`,
        `--------------------------------------------------------------------------------`,
        `Petunjuk Menghubungkan:`,
        `1. Pastikan modul ESP32 telah dicolokkan ke port USB komputer.`,
        `2. Buka Thonny IDE dan buka file 'firmware/main_thonny_micropython.py'.`,
        `3. Jalankan script (F5).`,
        `4. Log serial output sensor MQ (Pin 39), Ultrasonik (Pin 32-35), dan LDR (Pin 36)`,
        `   akan langsung dialirkan di sini secara real-time setelah data diterima.`,
        `--------------------------------------------------------------------------------`,
      ]);
    } else {
      // When hardware is newly connected, announce it
      const timestamp = new Date().toLocaleTimeString('id-ID', { hour12: false });
      setLogs([
        `[${timestamp}] [CONNECTED] ESP32 Miniatur terdeteksi aktif. Menerima serial stream...`,
      ]);
    }
  }, [isHardwareConnected]);

  // Append real output stream only when hardware is connected and values update
  useEffect(() => {
    if (!isHardwareConnected) return;

    const timestamp = new Date().toLocaleTimeString('id-ID', { hour12: false });
    const lines: string[] = [];

    if (filterFeature === 'all') {
      lines.push(`================================`);
      lines.push(`     SMART CITY IOT SYSTEM`);
      lines.push(`================================`);
      lines.push(``);
      lines.push(`MONITORING POLUSI`);
      lines.push(`Nilai gas: ${gas.gasValue}`);
      lines.push(`Status: ${gas.statusPolusi}`);
      lines.push(``);
      lines.push(`MONITORING PENYEBERANGAN`);
      lines.push(`Jarak kanan: ${crossing.jarakKanan !== null ? (Math.round(crossing.jarakKanan * 10) / 10) + ' cm' : 'tidak terbaca'}`);
      lines.push(`Jarak kiri: ${crossing.jarakKiri !== null ? (Math.round(crossing.jarakKiri * 10) / 10) + ' cm' : 'tidak terbaca'}`);

      if (crossing.lampu === 'KUNING') {
        lines.push(`>>> OBJEK TERDETEKSI!`);
        if (crossing.orangKanan) lines.push(`>>> SENSOR KANAN MENDETEKSI`);
        if (crossing.orangKiri) lines.push(`>>> SENSOR KIRI MENDETEKSI`);
        lines.push(`>>> LAMPU KUNING`);
      } else if (crossing.lampu === 'MERAH') {
        lines.push(`>>> LAMPU MERAH - MENYEBERANG`);
        lines.push(`Sisa waktu: ${crossing.countdownSeconds} detik`);
      } else if (!crossing.siapMenyeberang) {
        if (!crossing.orangKanan && !crossing.orangKiri) {
          lines.push(`>>> AREA KOSONG - SIAP MENDETEKSI LAGI`);
        } else {
          lines.push(`>>> OBJEK MASIH TERDETEKSI`);
          lines.push(`>>> MENUNGGU OBJEK MENJAUH`);
        }
      } else {
        lines.push(`>>> AMAN - LAMPU HIJAU`);
      }

      lines.push(``);
      lines.push(`SMART PJU`);
      lines.push(`Nilai LDR: ${pju.ldrValue}`);
      if (pju.ldrValue > 2000) {
        lines.push(`Kondisi: GELAP - PJU MENYALA`);
      } else {
        lines.push(`Kondisi: TERANG - PJU MATI`);
      }

      lines.push(``);
      lines.push(`========== STATUS KOTA ==========`);
      lines.push(`Polusi: ${gas.statusPolusi}`);
      lines.push(`Objek kanan: ${crossing.orangKanan}`);
      lines.push(`Objek kiri: ${crossing.orangKiri}`);
      lines.push(`PJU: ${pju.ldrValue > 2000 ? 'MENYALA' : 'MATI'}`);
      lines.push(`=================================`);
    } else if (filterFeature === 'polusi') {
      lines.push(`MONITORING POLUSI`);
      lines.push(`Nilai gas: ${gas.gasValue}`);
      lines.push(`Status: ${gas.statusPolusi}`);
    } else if (filterFeature === 'penyeberangan') {
      lines.push(`MONITORING PENYEBERANGAN`);
      lines.push(`Jarak kanan: ${crossing.jarakKanan !== null ? (Math.round(crossing.jarakKanan * 10) / 10) + ' cm' : 'tidak terbaca'}`);
      lines.push(`Jarak kiri: ${crossing.jarakKiri !== null ? (Math.round(crossing.jarakKiri * 10) / 10) + ' cm' : 'tidak terbaca'}`);
      if (crossing.lampu === 'KUNING') {
        lines.push(`>>> OBJEK TERDETEKSI!`);
        lines.push(`>>> LAMPU KUNING`);
      } else if (crossing.lampu === 'MERAH') {
        lines.push(`>>> LAMPU MERAH - MENYEBERANG`);
        lines.push(`Sisa waktu: ${crossing.countdownSeconds} detik`);
      } else if (!crossing.siapMenyeberang) {
        lines.push(`>>> MENUNGGU OBJEK MENJAUH`);
      } else {
        lines.push(`>>> AMAN - LAMPU HIJAU`);
      }
    } else if (filterFeature === 'pju') {
      lines.push(`SMART PJU`);
      lines.push(`Nilai LDR: ${pju.ldrValue}`);
      lines.push(`Kondisi: ${pju.ldrValue > 2000 ? 'GELAP - PJU MENYALA' : 'TERANG - PJU MATI'}`);
    }

    setLogs((prev) => [...prev.slice(-150), ...lines]);
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
    <div className="rounded-2xl bg-[#050A14] border border-slate-800 overflow-hidden shadow-2xl flex flex-col">
      {/* Console Topbar */}
      <div className="px-4 py-2.5 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Terminal className={`w-4 h-4 ${isHardwareConnected ? 'text-emerald-400' : 'text-slate-400'}`} />
          <span className="text-xs font-mono font-bold text-slate-200">{title}</span>
          {isHardwareConnected ? (
            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              ESP32: ONLINE (115200)
            </span>
          ) : (
            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
              ESP32: BELUM TERHUBUNG (OFFLINE)
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 text-xs">
          <button
            onClick={() => setAutoScroll(!autoScroll)}
            className={`px-2 py-1 rounded text-[11px] font-mono transition-colors flex items-center gap-1 ${
              autoScroll ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30' : 'text-slate-400 hover:text-white'
            }`}
            title="Auto-scroll"
          >
            <ArrowDownCircle className="w-3 h-3" />
            <span className="hidden sm:inline">Auto-scroll</span>
          </button>

          <button
            onClick={handleCopy}
            className="p-1.5 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title="Copy Terminal Log"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          </button>

          <button
            onClick={handleClear}
            className="p-1.5 rounded text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors"
            title="Clear Terminal"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Terminal Text Area */}
      <div className={`p-4 font-mono text-[11px] leading-relaxed overflow-y-auto select-text ${maxHeight} text-slate-300 space-y-0.5`}>
        {logs.length === 0 ? (
          <div className="text-slate-500 italic py-4">Menunggu output telemetri dari serial Thonny...</div>
        ) : (
          logs.map((line, idx) => {
            const isHeader = line.includes('===') || line.includes('SMART CITY') || line.includes('URBANPULSE');
            const isOffline = line.includes('[STATUS] ESP32') || line.includes('OFFLINE');
            const isAlert = line.includes('>>>') || line.includes('POLUSI TINGGI') || line.includes('LAMPU MERAH');
            const isGood = line.includes('UDARA BERSIH') || line.includes('AMAN') || line.includes('HIJAU') || line.includes('[CONNECTED]');
            const isWarning = line.includes('POLUSI SEDANG') || line.includes('KUNING') || line.includes('TERDETEKSI');

            return (
              <div
                key={idx}
                className={
                  isOffline
                    ? 'text-rose-400 font-bold'
                    : isHeader
                    ? 'text-cyan-400 font-bold'
                    : isAlert
                    ? 'text-rose-400 font-semibold'
                    : isWarning
                    ? 'text-amber-300 font-semibold'
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

      {/* Terminal Bottom Status */}
      <div className="px-4 py-2 bg-slate-950/80 border-t border-slate-900 text-[10px] font-mono text-slate-400 flex items-center justify-between">
        <span className="flex items-center gap-1.5">
          {isHardwareConnected ? (
            <>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-emerald-400">Serial Stream Aktif (Thonny ESP32 Terhubung)</span>
            </>
          ) : (
            <>
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
              <span className="text-slate-400">ESP32 Offline (Standby, Tidak Ada Data)</span>
            </>
          )}
        </span>
        <span>Lines: {logs.length}</span>
      </div>
    </div>
  );
};
