'use client';

import React from 'react';
import { useSmartCity } from '@/context/SmartCityContext';
import { MetricCard } from '@/components/common/MetricCard';
import { TerminalConsole } from '@/components/common/TerminalConsole';
import {
  Navigation,
  Wind,
  Lightbulb,
  Footprints,
  ShieldCheck,
  Cpu,
  Bell,
  Radio,
  Video,
  Sun,
  Moon,
} from 'lucide-react';

export const OverviewView: React.FC = () => {
  const {
    traffic,
    pju,
    crossing,
    gas,
    devices,
    alerts,
    isHardwareConnected,
    isCameraConnected,
    setActiveSubsystem,
    togglePjuDayNight,
    triggerCrossingDetection,
  } = useSmartCity();

  const isGelap = pju.kondisi === 'GELAP';
  const isMenyebrang = crossing.lampu === 'MERAH';
  const onlineDevicesCount = devices.filter((d) => d.status === 'Online').length;
  const activeAlertsCount = alerts.filter((a) => !a.isResolved).length;

  return (
    <div className="space-y-5">
      {/* City Status Banner */}
      <div className="glass-panel-accent rounded-2xl p-5 relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-gradient-to-l from-cyan-500/10 to-transparent pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-1">
              {isHardwareConnected ? (
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                  MINIATUR ESP32 ONLINE
                </span>
              ) : (
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                  MINIATUR ESP32 OFFLINE (BELUM TERSAMBUNG)
                </span>
              )}
              <span className="text-xs text-slate-400">ESP32 MicroPython + Python AI Vision</span>
            </div>
            <h1 className="text-2xl lg:text-3xl font-black text-white tracking-tight">
              STATUS MINIATUR:{' '}
              {isHardwareConnected ? (
                <span className="text-emerald-400">TERHUBUNG & AKTIF</span>
              ) : (
                <span className="text-rose-400">TERPUTUS (STANDBY)</span>
              )}
            </h1>
            <p className="text-xs text-slate-300 mt-1 max-w-2xl">
              {isHardwareConnected
                ? 'ESP32 Miniatur mengirimkan data telemetri langsung secara real-time dari sensor fisik.'
                : 'ESP32 fisik belum terhubung. Colokkan kabel Micro-USB ke komputer dan jalankan kode di Thonny agar sensor fisik mengirim data ke dashboard.'}
            </p>
          </div>

          {/* Quick Metrics Badges */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 flex flex-col justify-between">
              <span className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" /> Ringkasan Kota
              </span>
              <div className="text-base font-black text-emerald-400 mt-1">
                {isHardwareConnected ? crossing.statusRingkasan : 'STANDBY'}
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 flex flex-col justify-between">
              <span className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1">
                <Cpu className="w-3.5 h-3.5 text-emerald-400" /> Node Aktif
              </span>
              <div className="text-xl font-black text-emerald-400 mt-1">
                {onlineDevicesCount}<span className="text-xs text-slate-400 font-normal">/{devices.length}</span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 flex flex-col justify-between">
              <span className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1">
                <Bell className="w-3.5 h-3.5 text-amber-400" /> Notifikasi
              </span>
              <div className="text-xl font-black text-amber-400 mt-1">
                {activeAlertsCount}
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 flex flex-col justify-between">
              <span className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1">
                <Radio className="w-3.5 h-3.5 text-cyan-400" /> Telemetri
              </span>
              <div className={`text-xs font-black mt-1 font-mono ${isHardwareConnected ? 'text-emerald-400' : 'text-slate-400'}`}>
                {isHardwareConnected ? 'Live Real-Time' : 'Standby (0 bps)'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 4 Core Pillars KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Pilar 1: Gas MQ */}
        <MetricCard
          title="1. Monitoring Polusi (Gas MQ)"
          value={isHardwareConnected ? gas.gasValue : 'STANDBY'}
          unit={isHardwareConnected ? 'ADC' : ''}
          statusText={isHardwareConnected ? gas.statusPolusi : 'ESP32 Offline'}
          statusVariant={isHardwareConnected ? (gas.statusPolusi === 'POLUSI TINGGI' ? 'danger' : gas.statusPolusi === 'POLUSI SEDANG' ? 'warning' : 'success') : 'neutral'}
          icon={<Wind className="w-4 h-4" />}
          footerText="Sensor Gas ADC Pin 39"
          onClick={() => setActiveSubsystem('air-quality')}
        />

        {/* Pilar 2: Smart Penyeberangan */}
        <MetricCard
          title="2. Smart Penyeberangan"
          value={isHardwareConnected ? `LAMPU ${crossing.lampu}` : 'STANDBY'}
          statusText={isHardwareConnected ? crossing.statusRingkasan : 'ESP32 Offline'}
          statusVariant={isHardwareConnected ? (crossing.lampu === 'MERAH' ? 'danger' : crossing.lampu === 'KUNING' ? 'warning' : 'success') : 'neutral'}
          icon={<Footprints className="w-4 h-4" />}
          footerText="Dual Ultrasonik (Pin 32/34 & 33/35)"
          onClick={() => setActiveSubsystem('pedestrian')}
        />

        {/* Pilar 3: Smart PJU LDR */}
        <MetricCard
          title="3. Smart PJU Otomatis"
          value={isHardwareConnected ? pju.pjuStatus : 'STANDBY'}
          statusText={isHardwareConnected ? `Kondisi ${pju.kondisi} (LDR: ${pju.ldrValue})` : 'ESP32 Offline'}
          statusVariant={isHardwareConnected ? (isGelap ? 'warning' : 'neutral') : 'neutral'}
          icon={<Lightbulb className="w-4 h-4" />}
          footerText="LDR Pin 36 | LED Pin 25 & 26"
          onClick={() => setActiveSubsystem('lighting')}
        />

        {/* Pilar 4: Traffic Kamera */}
        <MetricCard
          title="4. Traffic Kamera AI"
          value={isCameraConnected ? `${traffic.density}%` : 'STANDBY'}
          unit={isCameraConnected ? `(${traffic.vehicleCount} unit)` : ''}
          statusText={isCameraConnected ? traffic.statusText : 'Webcam Standby'}
          statusVariant={isCameraConnected ? (traffic.density >= 70 ? 'danger' : traffic.density >= 50 ? 'warning' : 'success') : 'neutral'}
          icon={<Navigation className="w-4 h-4" />}
          footerText="Webcam Laptop Langsung"
          onClick={() => setActiveSubsystem('traffic')}
        />
      </div>

      {/* Spatial Board & Live Serial Console */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left: Spatial Layout of the Miniature Hardware */}
        <div className="lg:col-span-7 glass-panel rounded-2xl p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping" />
                <h2 className="text-base font-bold text-white tracking-tight">
                  LAYOUT SPASIAL MINIATUR SMART CITY
                </h2>
              </div>
              <span className="text-xs font-mono text-cyan-400 bg-slate-900 px-2.5 py-1 rounded-lg border border-slate-800">
                Thonny MicroPython
              </span>
            </div>

            {/* Visual Board Layout */}
            <div className="relative w-full aspect-[16/10] bg-[#070D1A] rounded-xl my-4 overflow-hidden border border-slate-800 p-4 flex flex-col justify-between">
              {/* Top Row: Camera Simpang & Gas Station */}
              <div className="grid grid-cols-2 gap-4">
                {/* Pos Kamera Traffic */}
                <div
                  onClick={() => setActiveSubsystem('traffic')}
                  className="p-3.5 rounded-xl bg-slate-900/90 border border-cyan-500/30 hover:border-cyan-400 transition-all cursor-pointer group shadow-lg"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-mono font-bold text-cyan-400 flex items-center gap-1.5">
                      <Video className="w-3.5 h-3.5" /> Pos Kamera AI
                    </span>
                    <span className={`w-2 h-2 rounded-full ${isCameraConnected ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`} />
                  </div>
                  <div className="text-xs font-bold text-white group-hover:text-cyan-300 transition-colors">
                    Simpang Lalu Lintas (Webcam AI)
                  </div>
                  <div className="text-[11px] text-slate-300 mt-1 font-mono">
                    {isCameraConnected ? `Kepadatan: ${traffic.density}% • ${traffic.vehicleCount} Unit` : 'Webcam Standby (Klik untuk buka)'}
                  </div>
                </div>

                {/* Pos Sensor Gas MQ */}
                <div
                  onClick={() => setActiveSubsystem('air-quality')}
                  className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 hover:border-cyan-400 transition-all cursor-pointer group shadow-lg"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-mono font-bold text-amber-400 flex items-center gap-1.5">
                      <Wind className="w-3.5 h-3.5" /> Sensor Gas / MQ
                    </span>
                    <span className={`w-2 h-2 rounded-full ${gas.statusPolusi === 'POLUSI TINGGI' ? 'bg-rose-500 animate-ping' : 'bg-emerald-400'}`} />
                  </div>
                  <div className="text-xs font-bold text-white group-hover:text-amber-300 transition-colors">
                    Stasiun Monitoring Udara (ADC 39)
                  </div>
                  <div className="text-[11px] text-slate-300 mt-1 font-mono">
                    Nilai Gas: {gas.gasValue} ({gas.statusPolusi})
                  </div>
                </div>
              </div>

              {/* Center Road & Zebra Cross Visual */}
              <div className="my-2 py-3 px-4 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                {/* Left Sensor */}
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${crossing.orangKiri ? 'bg-rose-500 animate-ping' : 'bg-emerald-400'}`} />
                  <span className="text-[10px] font-mono text-slate-300">
                    Sensor Kiri: {crossing.jarakKiri !== null ? `${Math.round(crossing.jarakKiri)}cm` : '-'}
                  </span>
                </div>

                {/* Zebra Stripes */}
                <div
                  onClick={() => setActiveSubsystem('pedestrian')}
                  className="flex items-center gap-2 px-4 py-1.5 rounded-lg bg-slate-900 border border-slate-700 cursor-pointer hover:border-cyan-400 transition-all"
                >
                  <Footprints className="w-4 h-4 text-cyan-400" />
                  <span className="text-xs font-bold text-white">Zebra Cross:</span>
                  <span
                    className={`text-xs font-bold px-2 py-0.5 rounded ${
                      isMenyebrang ? 'bg-rose-500 text-white animate-pulse' : 'bg-emerald-500/20 text-emerald-400'
                    }`}
                  >
                    {isMenyebrang ? `LAMPU MERAH (${crossing.countdownSeconds}s)` : 'LAMPU HIJAU (GO)'}
                  </span>
                </div>

                {/* Right Sensor */}
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono text-slate-300">
                    Sensor Kanan: {crossing.jarakKanan !== null ? `${Math.round(crossing.jarakKanan)}cm` : '-'}
                  </span>
                  <div className={`w-3 h-3 rounded-full ${crossing.orangKanan ? 'bg-rose-500 animate-ping' : 'bg-emerald-400'}`} />
                </div>
              </div>

              {/* Bottom Row: PJU Tiang & ESP32 Board */}
              <div className="grid grid-cols-2 gap-4">
                {/* Tiang PJU LDR */}
                <div
                  onClick={() => setActiveSubsystem('lighting')}
                  className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 hover:border-amber-400 transition-all cursor-pointer group shadow-lg"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-mono font-bold text-amber-300 flex items-center gap-1.5">
                      <Lightbulb className="w-3.5 h-3.5" /> Tiang Smart PJU
                    </span>
                    <span className={`w-2 h-2 rounded-full ${isGelap ? 'bg-amber-400 animate-pulse' : 'bg-slate-600'}`} />
                  </div>
                  <div className="text-xs font-bold text-white group-hover:text-amber-300 transition-colors">
                    Sensor LDR (Pin 36) & LED Merah/Putih
                  </div>
                  <div className="text-[11px] text-slate-300 mt-1 font-mono">
                    LDR: {pju.ldrValue} • {pju.kondisi} ({pju.pjuStatus}) • {pju.jamTerakhirBeralih || 'Real-time'}
                  </div>
                </div>

                {/* ESP32 Core Controller */}
                <div
                  onClick={() => setActiveSubsystem('iot-devices')}
                  className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 hover:border-cyan-400 transition-all cursor-pointer group shadow-lg"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-mono font-bold text-cyan-400 flex items-center gap-1.5">
                      <Cpu className="w-3.5 h-3.5" /> ESP32 Miniatur Core
                    </span>
                    <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  </div>
                  <div className="text-xs font-bold text-white group-hover:text-cyan-300 transition-colors">
                    Thonny MicroPython Program
                  </div>
                  <div className="text-[11px] text-slate-300 mt-1 font-mono">
                    10 Pin GPIO & ADC Aktif
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Test Interactive Controls */}
            <div className="pt-3 border-t border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs">
              <span className="font-bold text-slate-400 text-[11px] uppercase">Aksi Uji Coba Cepat:</span>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={togglePjuDayNight}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center gap-1.5 font-semibold"
                >
                  {isGelap ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
                  <span>Toggle PJU LDR ({isGelap ? 'Siang' : 'Malam'})</span>
                </button>

                <button
                  onClick={() => triggerCrossingDetection('kanan')}
                  className="px-3 py-1.5 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 flex items-center gap-1.5 font-semibold"
                >
                  <Footprints className="w-3.5 h-3.5" />
                  <span>Uji Penyeberangan (60s)</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Real Live Serial Terminal Console (Thonny Shell Stream) */}
        <div className="lg:col-span-5 flex flex-col justify-between">
          <TerminalConsole
            filterFeature="all"
            title="Live Thonny Serial Output"
            maxHeight="max-h-[460px]"
          />
        </div>
      </div>
    </div>
  );
};
