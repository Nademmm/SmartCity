'use client';

import React, { useState } from 'react';
import { useSmartCity } from '@/context/SmartCityContext';
import { MetricCard } from '@/components/common/MetricCard';
import { LiveWebcamFeed } from '@/components/common/LiveWebcamFeed';
import {
  Navigation,
  Gauge,
  Car,
  Clock,
  AlertTriangle,
  Zap,
  Siren,
  Video,
  Radio,
  CheckCircle2,
  RotateCcw,
} from 'lucide-react';

export const TrafficView: React.FC = () => {
  const { traffic, triggerTrafficEmergency, setTrafficModeAuto, isCameraConnected } = useSmartCity();

  const isPadat = traffic.density >= 70;

  return (
    <div className="space-y-5">
      {/* Alert Banner when Congestion Detected */}
      {isPadat && (
        <div className="p-4 rounded-xl bg-gradient-to-r from-rose-900/40 via-slate-900 to-slate-900 border border-rose-500/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-pulse">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-rose-500/20 text-rose-400 border border-rose-500/40">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-rose-400">
                  KEPADATAN TINGGI TERDETEKSI KAMERA AI
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500 text-white">
                  KEPADATAN &gt; 70%
                </span>
              </div>
              <h2 className="text-sm font-bold text-white mt-0.5">
                Kepadatan {traffic.name}: {traffic.density}% ({traffic.statusText})
              </h2>
              <p className="text-xs text-rose-300/80">
                Aksi Otomatis: Lampu Hijau diperpanjang untuk mengurai antrean {traffic.queueLengthMeters} meter.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="px-3 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-bold flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5" /> Green Wave Active
            </span>
          </div>
        </div>
      )}

      {/* Live Direct Browser Webcam Feed Player */}
      <LiveWebcamFeed />

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Kepadatan Lalu Lintas"
          value={`${traffic.density}%`}
          statusText={traffic.statusText}
          statusVariant={traffic.density >= 75 ? 'danger' : traffic.density >= 50 ? 'warning' : 'success'}
          trend={{
            value: `${traffic.vehicleCount} unit terdeteksi`,
            direction: traffic.density >= 60 ? 'up' : 'down',
            label: 'AI Stream',
          }}
          icon={<Navigation className="w-4 h-4" />}
          footerText="Kamera AI YOLO11 Real-Time"
        />

        <MetricCard
          title="Jumlah Kendaraan"
          value={traffic.vehicleCount}
          unit="unit"
          statusText="Terhitung Kamera"
          statusVariant="info"
          icon={<Car className="w-4 h-4" />}
          footerText="Klasifikasi Motor, Mobil, Bus, Truk"
        />

        <MetricCard
          title="Estimasi Kecepatan Rata-rata"
          value={`${traffic.avgSpeedKmh}`}
          unit="km/jam"
          statusText={traffic.avgSpeedKmh < 25 ? 'Merayap' : 'Lancar'}
          statusVariant={traffic.avgSpeedKmh < 25 ? 'danger' : 'success'}
          icon={<Gauge className="w-4 h-4" />}
          footerText="Kalkulasi Flow Kamera"
        />

        <MetricCard
          title="Estimasi Panjang Antrean"
          value={`${traffic.queueLengthMeters}`}
          unit="meter"
          statusText={traffic.queueLengthMeters > 50 ? 'Antrean Panjang' : 'Normal'}
          statusVariant={traffic.queueLengthMeters > 50 ? 'danger' : 'info'}
          icon={<Clock className="w-4 h-4" />}
          footerText="Jarak Akumulasi Kendaraan"
        />
      </div>

      {/* Signal Controller Box */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <div className="lg:col-span-6 glass-panel rounded-2xl p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping" />
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                  Pengatur Sinyal Lalu Lintas Kamera
                </h3>
              </div>
              <span
                className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                  traffic.isAutomatic
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                }`}
              >
                {traffic.isAutomatic ? 'Mode: Otomatis (AI)' : 'Mode: Manual'}
              </span>
            </div>

            {/* Visual Traffic Signal Head */}
            <div className="my-5 flex items-center justify-center gap-6 p-5 rounded-xl bg-[#080E1B] border border-slate-800">
              {/* Traffic Light Head */}
              <div className="w-20 p-3 bg-slate-950 rounded-2xl border-2 border-slate-800 shadow-2xl flex flex-col items-center gap-3">
                {/* Red */}
                <div
                  className={`w-12 h-12 rounded-full border-2 transition-all duration-300 flex items-center justify-center text-xs font-bold ${
                    traffic.currentLight === 'red'
                      ? 'bg-rose-500 border-rose-400 shadow-lg shadow-rose-500/80 text-white animate-pulse'
                      : 'bg-rose-950/40 border-rose-900/40 text-rose-900/60'
                  }`}
                >
                  {traffic.currentLight === 'red' && `${traffic.countdownSeconds}s`}
                </div>

                {/* Yellow */}
                <div
                  className={`w-12 h-12 rounded-full border-2 transition-all duration-300 flex items-center justify-center text-xs font-bold ${
                    traffic.currentLight === 'yellow'
                      ? 'bg-amber-400 border-amber-300 shadow-lg shadow-amber-400/80 text-black animate-pulse'
                      : 'bg-amber-950/40 border-amber-900/40 text-amber-900/60'
                  }`}
                >
                  {traffic.currentLight === 'yellow' && `${traffic.countdownSeconds}s`}
                </div>

                {/* Green */}
                <div
                  className={`w-12 h-12 rounded-full border-2 transition-all duration-300 flex items-center justify-center text-xs font-bold ${
                    traffic.currentLight === 'green'
                      ? 'bg-emerald-400 border-emerald-300 shadow-lg shadow-emerald-400/80 text-black animate-pulse'
                      : 'bg-emerald-950/40 border-emerald-900/40 text-emerald-900/60'
                  }`}
                >
                  {traffic.currentLight === 'green' && `${traffic.countdownSeconds}s`}
                </div>
              </div>

              {/* Status Details */}
              <div className="space-y-2">
                <div className="text-xs text-slate-400">Fase Berjalan:</div>
                <div className="text-2xl font-black text-white uppercase tracking-tight flex items-center gap-2">
                  <span
                    className={`w-3 h-3 rounded-full ${
                      traffic.currentLight === 'green'
                        ? 'bg-emerald-400'
                        : traffic.currentLight === 'yellow'
                        ? 'bg-amber-400'
                        : 'bg-rose-500'
                    }`}
                  />
                  LAMPU {traffic.currentLight.toUpperCase()}
                </div>
                <div className="text-xs font-mono text-cyan-300 bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-800">
                  Hitung Mundur: <span className="font-bold text-white">{traffic.countdownSeconds} Detik</span>
                </div>
              </div>
            </div>

            {/* Mode Controls */}
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-300">Mode Operasi Sinyal</span>
              <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-lg border border-slate-800 text-xs">
                <button
                  onClick={() => setTrafficModeAuto(true)}
                  className={`px-3 py-1 rounded-md font-semibold transition-all ${
                    traffic.isAutomatic ? 'bg-cyan-500 text-white font-bold' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Otomatis (AI Adaptive)
                </button>
                <button
                  onClick={() => setTrafficModeAuto(false)}
                  className={`px-3 py-1 rounded-md font-semibold transition-all ${
                    !traffic.isAutomatic ? 'bg-amber-500 text-black font-bold' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Manual Override
                </button>
              </div>
            </div>
          </div>

          {/* Emergency Corridor Priority Button */}
          <div className="mt-5 pt-4 border-t border-slate-800">
            <button
              onClick={triggerTrafficEmergency}
              className="w-full py-2.5 rounded-xl font-bold text-xs border border-rose-500/50 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 transition-all flex items-center justify-center gap-2"
            >
              <Siren className="w-4 h-4 text-rose-400" />
              <span>PRIORITAS KENDARAAN DARURAT (AMBULANS / GREEN CORRIDOR)</span>
            </button>
          </div>
        </div>

        {/* Right: Vehicle Types Breakdown from YOLO */}
        <div className="lg:col-span-6 glass-panel rounded-2xl p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Car className="w-4 h-4 text-cyan-400" />
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                  Rincian Deteksi Klasifikasi Kendaraan
                </h3>
              </div>
              <span className="text-xs font-mono text-slate-400">Model: YOLO11 COCO</span>
            </div>

            <div className="grid grid-cols-2 gap-3 my-4">
              <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800">
                <span className="text-slate-400 text-xs block">Sepeda Motor (Motorcycle)</span>
                <span className="text-2xl font-black text-cyan-400 font-mono mt-1 block">
                  {traffic.vehicleCounts?.motor ?? 0}
                </span>
                <span className="text-[10px] text-slate-500">Class ID: 3</span>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800">
                <span className="text-slate-400 text-xs block">Mobil Pribadi (Car)</span>
                <span className="text-2xl font-black text-emerald-400 font-mono mt-1 block">
                  {traffic.vehicleCounts?.mobil ?? 0}
                </span>
                <span className="text-[10px] text-slate-500">Class ID: 2</span>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800">
                <span className="text-slate-400 text-xs block">Bus Penumpang (Bus)</span>
                <span className="text-2xl font-black text-amber-400 font-mono mt-1 block">
                  {traffic.vehicleCounts?.bus ?? 0}
                </span>
                <span className="text-[10px] text-slate-500">Class ID: 5</span>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800">
                <span className="text-slate-400 text-xs block">Truk Angkutan (Truck)</span>
                <span className="text-2xl font-black text-rose-400 font-mono mt-1 block">
                  {traffic.vehicleCounts?.truk ?? 0}
                </span>
                <span className="text-[10px] text-slate-500">Class ID: 7</span>
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
            <span className="flex items-center gap-1.5 text-emerald-400">
              <CheckCircle2 className="w-3.5 h-3.5" /> Pipeline DashboardClient Terhubung
            </span>
            <span className="font-mono text-cyan-400">Endpoint: /api/iot/telemetry</span>
          </div>
        </div>
      </div>
    </div>
  );
};
