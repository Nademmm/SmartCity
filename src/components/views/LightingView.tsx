'use client';

import React from 'react';
import { useSmartCity } from '@/context/SmartCityContext';
import { MetricCard } from '@/components/common/MetricCard';
import { TerminalConsole } from '@/components/common/TerminalConsole';
import {
  Lightbulb,
  Sun,
  Moon,
  Zap,
  Sliders,
  CheckCircle2,
  Info,
} from 'lucide-react';

export const LightingView: React.FC = () => {
  const { pju, setLdrValue, togglePjuDayNight, isHardwareConnected } = useSmartCity();
  const [currentClock, setCurrentClock] = React.useState<string>('');

  React.useEffect(() => {
    const tick = () => {
      setCurrentClock(new Date().toLocaleTimeString('id-ID', { hour12: false }) + ' WIB');
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, []);

  const isGelap = pju.kondisi === 'GELAP';

  return (
    <div className="space-y-5">
      {/* Offline Hardware Banner */}
      {!isHardwareConnected && (
        <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 flex items-center justify-between text-xs text-slate-300">
          <div className="flex items-center gap-2.5">
            <span className="w-2 h-2 rounded-full bg-rose-500" />
            <span>
              <strong>Perangkat ESP32 Offline:</strong> Sensor cahaya LDR (ADC Pin 36) dalam mode Standby. Colokkan ESP32 dan jalankan Thonny agar pembacaan nilai LDR masuk ke dashboard.
            </span>
          </div>
          <span className="font-mono text-[10px] bg-rose-500/10 text-rose-400 border border-rose-500/20 px-2 py-0.5 rounded shrink-0">
            Hardware Belum Terhubung
          </span>
        </div>
      )}
      {/* Status Banner with Live City Clock */}
      <div
        className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-all ${
          isGelap
            ? 'bg-amber-950/30 border-amber-500/40'
            : 'bg-slate-900/60 border-slate-800'
        }`}
      >
        <div className="flex items-center gap-3">
          <div
            className={`p-2.5 rounded-lg border ${
              isGelap
                ? 'bg-amber-500/20 text-amber-400 border-amber-500/40 animate-pulse'
                : 'bg-slate-800 text-slate-400 border-slate-700'
            }`}
          >
            {isGelap ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                FITUR 3: SMART PJU OTOMATIS BERDASARKAN CAHAYA & WAKTU
              </span>
              <span
                className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                  isGelap
                    ? 'bg-amber-500 text-black'
                    : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                }`}
              >
                KONDISI: {pju.kondisi}
              </span>
              {/* Live Digital Clock Badge */}
              <span className="px-2.5 py-0.5 rounded bg-slate-950 font-mono text-cyan-300 border border-slate-800 text-[11px] font-bold">
                Jam Kota: {currentClock || '18:00:00 WIB'}
              </span>
            </div>
            <h2 className="text-sm font-bold text-white mt-0.5">
              Status PJU: <span className={isGelap ? 'text-amber-400' : 'text-slate-400'}>{pju.pjuStatus}</span> (Ambang LDR: {pju.thresholdLdr})
            </h2>
            <p className="text-xs text-slate-300">
              {isGelap
                ? `Kondisi redup/malam terdeteksi (Tercatat sejak ${pju.jamTerakhirBeralih || currentClock}). LED Merah (Pin 25) & Putih (Pin 26) otomatis aktif.`
                : `Kondisi terang/siang terdeteksi (Tercatat sejak ${pju.jamTerakhirBeralih || currentClock}). Kedua lampu padam untuk efisiensi daya kota.`}
            </p>
          </div>
        </div>

        <button
          onClick={togglePjuDayNight}
          className={`px-3.5 py-2 rounded-lg text-xs font-bold border transition-all flex items-center gap-2 cursor-pointer ${
            isGelap
              ? 'bg-amber-500 text-black border-amber-400 hover:bg-amber-400'
              : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
          }`}
        >
          {isGelap ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          <span>{isGelap ? 'Simulasikan Terang (Siang)' : 'Simulasikan Gelap (Malam)'}</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Nilai Sensor LDR"
          value={pju.ldrValue}
          unit="ADC"
          statusText={isGelap ? 'Nilai > 2000 (Gelap)' : 'Nilai <= 2000 (Terang)'}
          statusVariant={isGelap ? 'warning' : 'success'}
          icon={<Sliders className="w-4 h-4" />}
          footerText={`ADC Pin ${pju.pinLdr} (Atten 11dB)`}
        />

        <MetricCard
          title="Status Lampu PJU & Waktu"
          value={pju.pjuStatus}
          statusText={isGelap ? 'Menyala (Malam)' : 'Padam (Siang)'}
          statusVariant={isGelap ? 'warning' : 'neutral'}
          icon={<Lightbulb className="w-4 h-4" />}
          footerText={`Beralih: ${pju.jamTerakhirBeralih || currentClock || 'Baru saja'}`}
        />

        <MetricCard
          title="LED Merah PJU"
          value={pju.ledMerah ? 'MENYALA' : 'MATI'}
          statusText={pju.ledMerah ? 'GPIO Pin 25 High' : 'GPIO Pin 25 Low'}
          statusVariant={pju.ledMerah ? 'danger' : 'neutral'}
          icon={<Zap className="w-4 h-4" />}
          footerText="Aktuator Pin 25"
        />

        <MetricCard
          title="LED Putih PJU"
          value={pju.ledPutih ? 'MENYALA' : 'MATI'}
          statusText={pju.ledPutih ? 'GPIO Pin 26 High' : 'GPIO Pin 26 Low'}
          statusVariant={pju.ledPutih ? 'success' : 'neutral'}
          icon={<Lightbulb className="w-4 h-4" />}
          footerText="Aktuator Pin 26"
        />
      </div>

      {/* Main Grid: Visual Controller & Live Terminal Output */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left: Interactive Visual PJU Pole & Slider */}
        <div className="lg:col-span-6 glass-panel rounded-2xl p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <span className={`w-2.5 h-2.5 rounded-full ${isGelap ? 'bg-amber-400 animate-ping' : 'bg-slate-600'}`} />
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                  Visualisasi Miniatur Lampu PJU
                </h3>
              </div>
              <span className="text-xs font-mono text-cyan-400 bg-slate-900 px-2.5 py-0.5 rounded border border-slate-800">
                ADC Pin 36
              </span>
            </div>

            {/* Glowing Lamp Display */}
            <div className="my-5 p-6 rounded-2xl bg-[#070D1A] border border-slate-800 flex flex-col items-center justify-center relative overflow-hidden">
              <div
                className="absolute inset-0 transition-opacity duration-500 pointer-events-none"
                style={{
                  background: isGelap
                    ? 'radial-gradient(circle at center, rgba(245, 158, 11, 0.25) 0%, rgba(0,0,0,0) 70%)'
                    : 'none',
                }}
              />

              <div className="relative z-10 flex flex-col items-center text-center">
                {/* 2 LED Visuals: Merah & Putih */}
                <div className="flex items-center justify-center gap-8 mb-4">
                  {/* LED Merah */}
                  <div className="flex flex-col items-center gap-2">
                    <div
                      className={`w-14 h-14 rounded-full flex items-center justify-center border-2 transition-all duration-300 ${
                        pju.ledMerah
                          ? 'bg-rose-600 border-rose-400 shadow-xl shadow-rose-500/70 animate-pulse text-white'
                          : 'bg-rose-950/30 border-rose-900/40 text-rose-900/40'
                      }`}
                    >
                      <Zap className="w-7 h-7" />
                    </div>
                    <span className="text-xs font-mono font-bold text-white">LED Merah</span>
                    <span className="text-[10px] text-slate-400 font-mono">Pin 25: {pju.ledMerah ? 'HIGH' : 'LOW'}</span>
                  </div>

                  {/* LED Putih */}
                  <div className="flex flex-col items-center gap-2">
                    <div
                      className={`w-14 h-14 rounded-full flex items-center justify-center border-2 transition-all duration-300 ${
                        pju.ledPutih
                          ? 'bg-amber-100 border-white shadow-xl shadow-white/80 animate-pulse text-amber-900'
                          : 'bg-slate-800/40 border-slate-700/40 text-slate-600'
                      }`}
                    >
                      <Lightbulb className="w-7 h-7" />
                    </div>
                    <span className="text-xs font-mono font-bold text-white">LED Putih</span>
                    <span className="text-[10px] text-slate-400 font-mono">Pin 26: {pju.ledPutih ? 'HIGH' : 'LOW'}</span>
                  </div>
                </div>

                <div className="mt-2 text-2xl font-black text-white font-mono">
                  LDR: {pju.ldrValue} / 4095
                </div>
                <div className="text-xs text-slate-400 mt-1">
                  Ambang Batas: {pju.thresholdLdr} • {isGelap ? 'Kondisi Gelap (PJU MENYALA)' : 'Kondisi Terang (PJU MATI)'}
                </div>
              </div>
            </div>

            {/* Slider Kontrol LDR */}
            <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2">
              <div className="flex justify-between text-xs text-slate-300 font-semibold">
                <span>Atur Nilai ADC Sensor LDR:</span>
                <span className="font-mono text-cyan-400 font-bold">{pju.ldrValue}</span>
              </div>
              <input
                type="range"
                min="0"
                max="4095"
                value={pju.ldrValue}
                onChange={(e) => setLdrValue(Number(e.target.value))}
                className="w-full accent-cyan-400 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                <span>0 (Sangat Terang)</span>
                <span className="text-amber-400 font-bold">Ambang: 2000</span>
                <span>4095 (Sangat Gelap)</span>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800 text-xs text-slate-400 flex items-center gap-2">
            <Info className="w-4 h-4 text-cyan-400 shrink-0" />
            <span>
              Ketika miniatur ESP32 mengirim telemetri lewat WiFi, nilai LDR dari hardware akan langsung meng-update tampilan ini.
            </span>
          </div>
        </div>

        {/* Right: Real Live Terminal Shell Output (Replacing static code snippet) */}
        <div className="lg:col-span-6 flex flex-col justify-between">
          <TerminalConsole
            filterFeature="pju"
            title="Live Serial Terminal Output (Smart PJU)"
            maxHeight="max-h-[380px]"
          />

          <div className="mt-4 p-4 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span className="text-white font-semibold">Aktuator Terverifikasi:</span>
            </div>
            <div className="flex items-center gap-3 font-mono text-slate-300">
              <span>LED Merah: Pin 25</span>
              <span>•</span>
              <span>LED Putih: Pin 26</span>
              <span>•</span>
              <span>LDR: ADC 36</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
