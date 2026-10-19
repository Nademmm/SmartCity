'use client';

import React from 'react';
import { useSmartCity } from '@/context/SmartCityContext';
import { MetricCard } from '@/components/common/MetricCard';
import {
  Lightbulb,
  Sun,
  Moon,
  Zap,
  Sliders,
  CheckCircle2,
  Info,
  Terminal,
  ArrowRight,
  ShieldAlert,
} from 'lucide-react';

export const LightingView: React.FC = () => {
  const { pju, setLdrValue, togglePjuDayNight, controlPjuManual, isHardwareConnected, setActiveSubsystem } = useSmartCity();
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
    <div className="space-y-4">
      {/* Offline Hardware Banner */}
      {!isHardwareConnected && (
        <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800/80 flex items-center justify-between text-xs text-slate-300">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-slate-500" />
            <p>
              Sensor LDR fisik (ADC Pin 36) menunggu koneksi ESP32. Simulasi interaktif dapat diuji di bawah ini.
            </p>
          </div>
          <div className="font-mono text-[11px] text-slate-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800 shrink-0">
            Standby
          </div>
        </div>
      )}

      {/* Status Banner */}
      <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-300">
            {isGelap ? <Moon className="w-5 h-5 text-amber-400" /> : <Sun className="w-5 h-5 text-cyan-400" />}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-semibold text-white">
                Penerangan Jalan Pintar ({pju.kondisi})
              </p>
              <div className="font-mono text-[11px] text-slate-400 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                Jam Kota: {currentClock || '18:00:00 WIB'}
              </div>
            </div>
            <p className="text-slate-400 mt-0.5">
              Status PJU: {pju.pjuStatus} (Ambang batas LDR: {pju.thresholdLdr}). Terakhir beralih pukul {pju.jamTerakhirBeralih || currentClock}.
            </p>
          </div>
        </div>

        <button
          onClick={togglePjuDayNight}
          className="px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-medium flex items-center gap-2 self-start sm:self-auto cursor-pointer transition-colors"
        >
          {isGelap ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          <p>{isGelap ? 'Ubah ke Siang (Terang)' : 'Ubah ke Malam (Gelap)'}</p>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <MetricCard
          title="Nilai Sensor LDR"
          value={pju.ldrValue}
          unit="ADC"
          statusText={isGelap ? 'Kondisi Gelap (> 2000)' : 'Kondisi Terang (<= 2000)'}
          statusVariant={isGelap ? 'warning' : 'success'}
          icon={<Sliders className="w-4 h-4" />}
          footerText={`ADC Pin ${pju.pinLdr} (Atten 11dB)`}
        />

        <MetricCard
          title="Status Lampu PJU"
          value={pju.pjuStatus}
          statusText={isGelap ? 'Lampu Aktif' : 'Lampu Padam'}
          statusVariant={isGelap ? 'warning' : 'neutral'}
          icon={<Lightbulb className="w-4 h-4" />}
          footerText={`Waktu: ${pju.jamTerakhirBeralih || currentClock}`}
        />

        <MetricCard
          title="LED Merah PJU"
          value={pju.ledMerah ? 'MENYALA' : 'MATI'}
          statusText={pju.ledMerah ? 'Pin 25 HIGH' : 'Pin 25 LOW'}
          statusVariant={pju.ledMerah ? 'danger' : 'neutral'}
          icon={<Zap className="w-4 h-4" />}
          footerText="Aktuator Lampu Jalan"
        />

        <MetricCard
          title="LED Putih PJU"
          value={pju.ledPutih ? 'MENYALA' : 'MATI'}
          statusText={pju.ledPutih ? 'Pin 26 HIGH' : 'Pin 26 LOW'}
          statusVariant={pju.ledPutih ? 'success' : 'neutral'}
          icon={<Lightbulb className="w-4 h-4" />}
          footerText="Aktuator Lampu Jalan"
        />
      </div>

      {/* Visual Controls & Automation Logic Card */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left Card: Controls */}
        <div className="lg:col-span-6 rounded-xl bg-slate-900/60 border border-slate-800/80 p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
              <h3 className="text-xs font-semibold text-white uppercase tracking-wider">
                Simulasi Tingkat Cahaya & Lampu
              </h3>
              <p className="text-[11px] font-mono text-slate-400">ADC Pin 36</p>
            </div>

            {/* Visual Indicator */}
            <div className="my-4 p-5 rounded-xl bg-slate-950/80 border border-slate-800/80 flex flex-col items-center justify-center">
              <div className="flex items-center justify-center gap-8 mb-3">
                {/* LED Merah */}
                <div className="flex flex-col items-center gap-1.5">
                  <div
                    className={`w-12 h-12 rounded-xl flex items-center justify-center border transition-colors ${
                      pju.ledMerah
                        ? 'bg-rose-500/20 border-rose-500 text-rose-400'
                        : 'bg-slate-900 border-slate-800 text-slate-600'
                    }`}
                  >
                    <Zap className="w-6 h-6" />
                  </div>
                  <p className="text-xs font-medium text-slate-300">LED Merah</p>
                  <p className="text-[10px] text-slate-400 font-mono">Pin 25 ({pju.ledMerah ? 'HIGH' : 'LOW'})</p>
                </div>

                {/* LED Putih */}
                <div className="flex flex-col items-center gap-1.5">
                  <div
                    className={`w-12 h-12 rounded-xl flex items-center justify-center border transition-colors ${
                      pju.ledPutih
                        ? 'bg-amber-500/20 border-amber-400 text-amber-300'
                        : 'bg-slate-900 border-slate-800 text-slate-600'
                    }`}
                  >
                    <Lightbulb className="w-6 h-6" />
                  </div>
                  <p className="text-xs font-medium text-slate-300">LED Putih</p>
                  <p className="text-[10px] text-slate-400 font-mono">Pin 26 ({pju.ledPutih ? 'HIGH' : 'LOW'})</p>
                </div>
              </div>

              <p className="text-2xl font-bold text-white font-mono">{pju.ldrValue} / 4095</p>
              <p className="text-xs text-slate-400 mt-0.5">
                Ambang Batas: {pju.thresholdLdr} • {isGelap ? 'Kondisi Gelap (PJU MENYALA)' : 'Kondisi Terang (PJU PADAM)'}
              </p>
            </div>

            {/* Slider */}
            <div className="p-3.5 rounded-lg bg-slate-900 border border-slate-800 space-y-2">
              <div className="flex justify-between text-xs text-slate-300 font-medium">
                <p>Pengaturan Manual Sensor LDR:</p>
                <p className="font-mono text-white font-bold">{pju.ldrValue}</p>
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
                <p>0 (Sangat Terang)</p>
                <p className="text-amber-400">Ambang: 2000</p>
                <p>4095 (Sangat Gelap)</p>
              </div>
            </div>

            {/* Kontrol Aktuator PJU Langsung */}
            <div className="p-3.5 rounded-lg bg-slate-900 border border-slate-800 space-y-2 mt-3">
              <div className="flex justify-between text-xs text-slate-300 font-medium">
                <p>Kontrol Aktuator PJU (ESP32):</p>
                <p className="font-mono text-cyan-400 font-bold">{pju.pjuMode || 'AUTO'}</p>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => controlPjuManual('ON')}
                  className={`py-2 px-2 rounded-lg border text-xs font-medium cursor-pointer transition-colors flex items-center justify-center gap-1.5 ${
                    pju.pjuMode === 'ON' || pju.kondisi === 'MANUAL_ON'
                      ? 'bg-rose-500/20 border-rose-500 text-rose-300'
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
                  }`}
                >
                  <Zap className="w-3.5 h-3.5" />
                  <span>Manual ON</span>
                </button>
                <button
                  onClick={() => controlPjuManual('OFF')}
                  className={`py-2 px-2 rounded-lg border text-xs font-medium cursor-pointer transition-colors flex items-center justify-center gap-1.5 ${
                    pju.pjuMode === 'OFF' || pju.kondisi === 'MANUAL_OFF'
                      ? 'bg-slate-700 border-slate-600 text-white'
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
                  }`}
                >
                  <Moon className="w-3.5 h-3.5" />
                  <span>Manual OFF</span>
                </button>
                <button
                  onClick={() => controlPjuManual('AUTO')}
                  className={`py-2 px-2 rounded-lg border text-xs font-medium cursor-pointer transition-colors flex items-center justify-center gap-1.5 ${
                    pju.pjuMode === 'AUTO' || !pju.pjuMode
                      ? 'bg-cyan-500/20 border-cyan-500 text-cyan-300'
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
                  }`}
                >
                  <Sun className="w-3.5 h-3.5" />
                  <span>Auto (LDR)</span>
                </button>
              </div>
              <p className="text-[10px] text-slate-400">
                Mengontrol langsung Pin 25 (LED Merah) dan Pin 26 (LED Putih) pada board ESP32.
              </p>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800/80 text-[11px] text-slate-400 flex items-center gap-2">
            <Info className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <p>Data dari pin ADC 36 langsung diolah ESP32 untuk menyalakan atau memadamkan LED PJU.</p>
          </div>
        </div>

        {/* Right Card: Logic and Specifications */}
        <div className="lg:col-span-6 rounded-xl bg-slate-900/60 border border-slate-800/80 p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
              <h3 className="text-xs font-semibold text-white uppercase tracking-wider">
                Logika Otomasi & Spesifikasi PJU
              </h3>
              <p className="text-[11px] font-mono text-slate-400">Firmware MicroPython</p>
            </div>

            <div className="my-3 space-y-3 text-xs">
              {/* Logic Rule 1 */}
              <div className="p-3 rounded-lg bg-slate-950/80 border border-slate-800/80 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-white flex items-center gap-1.5">
                    <Sun className="w-3.5 h-3.5 text-amber-400" />
                    Kondisi Siang (Terang)
                  </span>
                  <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    LDR &lt;= 2000 ADC
                  </span>
                </div>
                <p className="text-slate-400 text-[11px]">
                  Saat intensitas cahaya lingkungan tinggi, hambatan sensor LDR menurun sehingga nilai tegangan ADC berada di bawah 2000. ESP32 mematikan Pin 25 dan Pin 26.
                </p>
              </div>

              {/* Logic Rule 2 */}
              <div className="p-3 rounded-lg bg-slate-950/80 border border-slate-800/80 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-white flex items-center gap-1.5">
                    <Moon className="w-3.5 h-3.5 text-cyan-400" />
                    Kondisi Malam (Gelap)
                  </span>
                  <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20">
                    LDR &gt; 2000 ADC
                  </span>
                </div>
                <p className="text-slate-400 text-[11px]">
                  Saat kondisi gelap atau tertutup bayangan, nilai ADC melampaui 2000. ESP32 secara instan memberikan sinyal HIGH ke kedua LED penerangan jalan.
                </p>
              </div>

              {/* Hardware Pin Mapping */}
              <div className="p-3 rounded-lg bg-slate-950/80 border border-slate-800/80">
                <p className="font-semibold text-white mb-2">Pemetaan Pin Fisik ESP32:</p>
                <div className="grid grid-cols-3 gap-2 text-center font-mono text-[11px]">
                  <div className="p-2 rounded bg-slate-900 border border-slate-800">
                    <p className="text-slate-400 text-[10px]">Sensor LDR</p>
                    <p className="text-cyan-400 font-bold">ADC Pin 36</p>
                  </div>
                  <div className="p-2 rounded bg-slate-900 border border-slate-800">
                    <p className="text-slate-400 text-[10px]">LED Merah</p>
                    <p className="text-rose-400 font-bold">GPIO Pin 25</p>
                  </div>
                  <div className="p-2 rounded bg-slate-900 border border-slate-800">
                    <p className="text-slate-400 text-[10px]">LED Putih</p>
                    <p className="text-amber-300 font-bold">GPIO Pin 26</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Bar with Link to Centralized Logs */}
          <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 text-xs text-slate-400">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-[11px]">Aktuator PJU terhubung & siap dikontrol</span>
            </div>

            <button
              onClick={() => setActiveSubsystem('alerts')}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 flex items-center gap-1.5 text-xs font-medium cursor-pointer transition-colors"
            >
              <Terminal className="w-3.5 h-3.5 text-cyan-400" />
              <span>Log Serial PJU</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
