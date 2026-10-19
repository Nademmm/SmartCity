'use client';

import React from 'react';
import { useSmartCity } from '@/context/SmartCityContext';
import { MetricCard } from '@/components/common/MetricCard';
import {
  Navigation,
  Wind,
  Lightbulb,
  Footprints,
  Cpu,
  Video,
  Sun,
  Moon,
  Clock,
  ArrowRight,
  Terminal,
  CheckCircle2,
  Activity,
  Zap,
} from 'lucide-react';

export const OverviewView: React.FC = () => {
  const {
    traffic,
    pju,
    crossing,
    gas,
    isHardwareConnected,
    isCameraConnected,
    setActiveSubsystem,
    togglePjuDayNight,
    triggerCrossingDetection,
    lastTelemetryTimestamp,
  } = useSmartCity();

  const isGelap = pju.kondisi === 'GELAP';
  const isMenyebrang = crossing.lampu === 'MERAH';

  return (
    <div className="space-y-4">
      {/* Executive Hardware Status Bar */}
      <div className="rounded-xl bg-slate-900/60 border border-slate-800/80 p-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${isHardwareConnected ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`} />
              <h2 className="text-sm font-semibold text-white">
                {isHardwareConnected ? 'ESP32 Miniatur Aktif' : 'ESP32 Miniatur Standby'}
              </h2>
              <div className="text-[11px] text-slate-400 font-mono">MicroPython Core (COM3)</div>
            </div>
            <p className="text-xs text-slate-400">
              {isHardwareConnected
                ? 'Telemetri mengalir secara real-time dari mikrokontroler ESP32.'
                : 'Menunggu koneksi board. Hubungkan kabel USB dan jalankan bridge serial.'}
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <div className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 flex items-center gap-2">
              <p className="text-slate-400">Kamera:</p>
              <p className={`font-medium ${isCameraConnected ? 'text-emerald-400' : 'text-slate-400'}`}>
                {isCameraConnected ? 'Aktif' : 'Standby'}
              </p>
            </div>
            <div className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 flex items-center gap-2">
              <p className="text-slate-400">Status Kota:</p>
              <p className="font-medium text-emerald-400">{crossing.statusRingkasan}</p>
            </div>
          </div>
        </div>
      </div>

      {/* 4 Core Telemetry Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* 1. Gas MQ */}
        <MetricCard
          title="Kualitas Udara (Gas MQ)"
          value={gas.gasValue}
          unit="ADC"
          statusText={gas.statusPolusi}
          statusVariant={
            gas.statusPolusi === 'POLUSI TINGGI'
              ? 'danger'
              : gas.statusPolusi === 'POLUSI SEDANG'
              ? 'warning'
              : 'success'
          }
          icon={<Wind className="w-4 h-4" />}
          footerText={`ADC Pin ${gas.pinGas} (Ambang: 1000 / 1500)`}
          onClick={() => setActiveSubsystem('air-quality')}
        />

        {/* 2. Smart PJU */}
        <MetricCard
          title="Penerangan Jalan (LDR)"
          value={pju.pjuStatus}
          statusText={`Kondisi ${pju.kondisi}`}
          statusVariant={isGelap ? 'warning' : 'neutral'}
          icon={<Lightbulb className="w-4 h-4" />}
          footerText={`LDR: ${pju.ldrValue} (Ambang: 2000) • Pin 36`}
          onClick={() => setActiveSubsystem('lighting')}
        />

        {/* 3. Penyeberangan Jalan */}
        <MetricCard
          title="Penyeberangan Pintar"
          value={`LAMPU ${crossing.lampu}`}
          statusText={crossing.statusRingkasan}
          statusVariant={crossing.lampu === 'MERAH' ? 'danger' : 'success'}
          icon={<Footprints className="w-4 h-4" />}
          footerText="Dual Ultrasonik (Pin 32/34 & 33/35)"
          onClick={() => setActiveSubsystem('pedestrian')}
        />

        {/* 4. Kamera AI */}
        <MetricCard
          title="Lalu Lintas (Kamera AI)"
          value={`${traffic.vehicleCount} Objek`}
          statusText={traffic.statusText}
          statusVariant={traffic.density >= 70 ? 'danger' : traffic.density >= 50 ? 'warning' : 'success'}
          icon={<Navigation className="w-4 h-4" />}
          footerText="Webcam Laptop Langsung"
          onClick={() => setActiveSubsystem('traffic')}
        />
      </div>

      {/* Schematic Layout & Hardware Status Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left: Schematic Layout of Miniature Smart City */}
        <div className="lg:col-span-7 rounded-xl bg-slate-900/60 border border-slate-800/80 p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
              <div>
                <h3 className="text-xs font-semibold text-white uppercase tracking-wider">
                  Layout Sensor Miniatur Maket
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Diagram posisi komponen sensor dan aktuator terhubung ke ESP32
                </p>
              </div>
              <div className="text-[11px] font-mono text-slate-400 bg-slate-900 px-2.5 py-1 rounded border border-slate-800">
                10 Pin GPIO & ADC
              </div>
            </div>

            {/* Schematic Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 my-4">
              {/* Pos 1: Kamera Traffic */}
              <div
                onClick={() => setActiveSubsystem('traffic')}
                className="p-3.5 rounded-lg bg-slate-900/90 border border-slate-800 hover:border-slate-700 transition-colors cursor-pointer group"
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2 text-xs font-medium text-slate-300">
                    <Video className="w-3.5 h-3.5 text-cyan-400" />
                    <p>Kamera Simpang AI</p>
                  </div>
                  <div className={`w-1.5 h-1.5 rounded-full ${isCameraConnected ? 'bg-emerald-400' : 'bg-slate-500'}`} />
                </div>
                <p className="text-xs text-slate-400">
                  {isCameraConnected ? `${traffic.vehicleCount} objek terdeteksi • Kepadatan ${traffic.density}%` : 'Webcam Standby (Klik untuk buka)'}
                </p>
              </div>

              {/* Pos 2: Sensor Gas MQ */}
              <div
                onClick={() => setActiveSubsystem('air-quality')}
                className="p-3.5 rounded-lg bg-slate-900/90 border border-slate-800 hover:border-slate-700 transition-colors cursor-pointer group"
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2 text-xs font-medium text-slate-300">
                    <Wind className="w-3.5 h-3.5 text-amber-400" />
                    <p>Pos Sensor Gas (MQ)</p>
                  </div>
                  <div className={`w-1.5 h-1.5 rounded-full ${gas.statusPolusi === 'POLUSI TINGGI' ? 'bg-rose-500' : 'bg-emerald-400'}`} />
                </div>
                <p className="text-xs text-slate-400">
                  Pin ADC 39 • Nilai: {gas.gasValue} ({gas.statusPolusi})
                </p>
              </div>

              {/* Pos 3: Penyeberangan Zebra Cross */}
              <div
                onClick={() => setActiveSubsystem('pedestrian')}
                className="p-3.5 rounded-lg bg-slate-900/90 border border-slate-800 hover:border-slate-700 transition-colors cursor-pointer group"
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2 text-xs font-medium text-slate-300">
                    <Footprints className="w-3.5 h-3.5 text-cyan-400" />
                    <p>Zebra Cross & Lampu Lalin</p>
                  </div>
                  <div className={`w-1.5 h-1.5 rounded-full ${isMenyebrang ? 'bg-rose-500' : 'bg-emerald-400'}`} />
                </div>
                <p className="text-xs text-slate-400">
                  Ultrasonik Kanan ({crossing.jarakKanan ? Math.round(crossing.jarakKanan) + 'cm' : '-'}) & Kiri ({crossing.jarakKiri ? Math.round(crossing.jarakKiri) + 'cm' : '-'})
                </p>
              </div>

              {/* Pos 4: Tiang PJU LDR */}
              <div
                onClick={() => setActiveSubsystem('lighting')}
                className="p-3.5 rounded-lg bg-slate-900/90 border border-slate-800 hover:border-slate-700 transition-colors cursor-pointer group"
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2 text-xs font-medium text-slate-300">
                    <Lightbulb className="w-3.5 h-3.5 text-amber-300" />
                    <p>Tiang Smart PJU</p>
                  </div>
                  <div className={`w-1.5 h-1.5 rounded-full ${isGelap ? 'bg-amber-400' : 'bg-slate-500'}`} />
                </div>
                <p className="text-xs text-slate-400">
                  LDR Pin 36 ({pju.ldrValue}) • LED Pin 25 & 26 ({pju.pjuStatus})
                </p>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="pt-3 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-2 text-xs">
            <p className="text-slate-400 text-xs">Uji Coba Cepat Miniatur:</p>
            <div className="flex items-center gap-2">
              <button
                onClick={togglePjuDayNight}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center gap-1.5 text-xs font-medium transition-colors cursor-pointer"
              >
                {isGelap ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
                <p>Toggle PJU ({isGelap ? 'Siang' : 'Malam'})</p>
              </button>

              <button
                onClick={() => triggerCrossingDetection('kanan')}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center gap-1.5 text-xs font-medium transition-colors cursor-pointer"
              >
                <Footprints className="w-3.5 h-3.5" />
                <p>Uji Penyeberangan</p>
              </button>
            </div>
          </div>
        </div>

        {/* Right Side: Centralized Telemetry and Link to Unified Terminal */}
        <div className="lg:col-span-5 rounded-xl bg-slate-900/60 border border-slate-800/80 p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
              <div className="flex items-center gap-2">
                <Cpu className="w-4 h-4 text-cyan-400" />
                <h3 className="text-xs font-semibold text-white uppercase tracking-wider">
                  Status Telemetri & Aktuator
                </h3>
              </div>
              <span className="font-mono text-[11px] text-slate-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                COM3 115200
              </span>
            </div>

            <div className="my-3 space-y-2.5 text-xs">
              {/* Telemetry Status Item 1: LCD & Gas */}
              <div className="p-3 rounded-lg bg-slate-950/80 border border-slate-800/80 flex items-center justify-between">
                <div>
                  <p className="font-medium text-white">Monitor Hijau (LCD 1602 I2C)</p>
                  <p className="text-[11px] text-slate-400 font-mono">
                    Baris 1: &quot;{gas.lcdBaris1 || 'Selamat Datang'}&quot;
                  </p>
                </div>
                <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  0x27 Aktif
                </span>
              </div>

              {/* Telemetry Status Item 2: PJU Lighting */}
              <div className="p-3 rounded-lg bg-slate-950/80 border border-slate-800/80 flex items-center justify-between">
                <div>
                  <p className="font-medium text-white">Penerangan Jalan (LED 25 & 26)</p>
                  <p className="text-[11px] text-slate-400 font-mono">
                    Mode: {pju.pjuMode || 'AUTO'} • Status: {pju.pjuStatus}
                  </p>
                </div>
                <span
                  className={`text-[10px] font-mono font-medium px-2 py-0.5 rounded border ${
                    pju.ledPutih || pju.ledMerah
                      ? 'bg-amber-500/10 text-amber-300 border-amber-500/20'
                      : 'bg-slate-800 text-slate-400 border-slate-700'
                  }`}
                >
                  {pju.pjuStatus}
                </span>
              </div>

              {/* Telemetry Status Item 3: Crossing & Buzzer */}
              <div className="p-3 rounded-lg bg-slate-950/80 border border-slate-800/80 flex items-center justify-between">
                <div>
                  <p className="font-medium text-white">Lampu Lalin & Buzzer (Pin 13)</p>
                  <p className="text-[11px] text-slate-400 font-mono">
                    Lampu {crossing.lampu} • Buzzer: {crossing.buzzer ? 'BUNYI' : 'STANDBY'}
                  </p>
                </div>
                <span
                  className={`text-[10px] font-mono font-medium px-2 py-0.5 rounded border ${
                    crossing.lampu === 'MERAH'
                      ? 'bg-rose-500/10 text-rose-300 border-rose-500/20'
                      : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                  }`}
                >
                  {crossing.lampu}
                </span>
              </div>
            </div>
          </div>

          {/* Quick link button to dedicated Terminal in Notifikasi & Log */}
          <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 text-[11px] text-slate-400 font-mono">
              <Activity className="w-3.5 h-3.5 text-cyan-400" />
              <span>Log terpusat di Notifikasi</span>
            </div>

            <button
              onClick={() => setActiveSubsystem('alerts')}
              className="px-3 py-1.5 rounded-lg bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 border border-cyan-500/30 flex items-center gap-1.5 text-xs font-medium cursor-pointer transition-colors"
            >
              <Terminal className="w-3.5 h-3.5" />
              <span>Buka Terminal Serial</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
