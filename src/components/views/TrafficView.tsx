'use client';

import React from 'react';
import { useSmartCity } from '@/context/SmartCityContext';
import { MetricCard } from '@/components/common/MetricCard';
import { LiveWebcamFeed } from '@/components/common/LiveWebcamFeed';
import {
  Navigation,
  Car,
  AlertTriangle,
  Siren,
  CheckCircle2,
  Video,
} from 'lucide-react';

export const TrafficView: React.FC = () => {
  const { traffic, triggerTrafficEmergency, setTrafficModeAuto, isCameraConnected } = useSmartCity();

  const isPadat = traffic.density >= 70;

  return (
    <div className="space-y-4">
      {/* Alert Banner when Congestion Detected */}
      {isPadat && (
        <div className="p-3.5 rounded-xl bg-rose-950/40 border border-rose-500/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            <div>
              <p className="font-semibold text-white">Kepadatan Lalu Lintas Tinggi ({traffic.density}%)</p>
              <p className="text-slate-400">Terdeteksi akumulasi objek oleh model visi kamera AI.</p>
            </div>
          </div>

          <div className="px-2.5 py-1 rounded bg-rose-500/20 text-rose-300 font-medium border border-rose-500/30 text-[11px] self-start sm:self-auto">
            Prioritas Jalur Aktif
          </div>
        </div>
      )}

      {/* Live Direct Browser Webcam Feed Player */}
      <LiveWebcamFeed />

      {/* 4 Real Telemetry Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <MetricCard
          title="Status Kamera"
          value={isCameraConnected ? 'AKTIF' : 'STANDBY'}
          statusText={isCameraConnected ? 'Feed Terhubung' : 'Webcam Siap'}
          statusVariant={isCameraConnected ? 'success' : 'neutral'}
          icon={<Video className="w-4 h-4" />}
          footerText="Kamera Laptop / USB Langsung"
        />

        <MetricCard
          title="Total Objek Terdeteksi"
          value={traffic.vehicleCount}
          unit="item"
          statusText={traffic.vehicleCount > 0 ? 'Objek Aktif' : 'Nol Objek'}
          statusVariant="info"
          icon={<Car className="w-4 h-4" />}
          footerText="Klasifikasi Visi Real-Time"
        />

        <MetricCard
          title="Tingkat Kepadatan"
          value={`${traffic.density}%`}
          statusText={traffic.statusText}
          statusVariant={traffic.density >= 75 ? 'danger' : traffic.density >= 50 ? 'warning' : 'success'}
          icon={<Navigation className="w-4 h-4" />}
          footerText="Kalkulasi Kepadatan Maket"
        />

        <MetricCard
          title="Fase Sinyal Lampu"
          value={`LAMPU ${traffic.currentLight.toUpperCase()}`}
          unit={`${traffic.countdownSeconds}s`}
          statusText={traffic.isAutomatic ? 'Mode AI' : 'Mode Manual'}
          statusVariant={traffic.currentLight === 'green' ? 'success' : traffic.currentLight === 'yellow' ? 'warning' : 'danger'}
          icon={<Navigation className="w-4 h-4" />}
          footerText="Pengatur Lampu Simpang"
        />
      </div>

      {/* Signal Controller & Object Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Signal Controller Box */}
        <div className="lg:col-span-6 rounded-xl bg-slate-900/60 border border-slate-800/80 p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
              <h3 className="text-xs font-semibold text-white uppercase tracking-wider">
                Pengatur Sinyal Simpang
              </h3>
              <div className="text-[11px] font-mono text-slate-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                {traffic.isAutomatic ? 'Otomatis (Adaptif)' : 'Manual Override'}
              </div>
            </div>

            {/* Visual Signal Status */}
            <div className="my-4 flex items-center justify-center gap-6 p-4 rounded-xl bg-slate-950/80 border border-slate-800/80">
              {/* Traffic Light Head */}
              <div className="w-16 p-2.5 bg-slate-900 rounded-xl border border-slate-800 flex flex-col items-center gap-2.5">
                {/* Red */}
                <div
                  className={`w-10 h-10 rounded-full border transition-colors flex items-center justify-center text-[10px] font-bold ${
                    traffic.currentLight === 'red'
                      ? 'bg-rose-500 border-rose-400 text-white'
                      : 'bg-rose-950/30 border-rose-900/40 text-rose-900/60'
                  }`}
                >
                  {traffic.currentLight === 'red' && `${traffic.countdownSeconds}s`}
                </div>

                {/* Yellow */}
                <div
                  className={`w-10 h-10 rounded-full border transition-colors flex items-center justify-center text-[10px] font-bold ${
                    traffic.currentLight === 'yellow'
                      ? 'bg-amber-400 border-amber-300 text-black'
                      : 'bg-amber-950/30 border-amber-900/40 text-amber-900/60'
                  }`}
                >
                  {traffic.currentLight === 'yellow' && `${traffic.countdownSeconds}s`}
                </div>

                {/* Green */}
                <div
                  className={`w-10 h-10 rounded-full border transition-colors flex items-center justify-center text-[10px] font-bold ${
                    traffic.currentLight === 'green'
                      ? 'bg-emerald-400 border-emerald-300 text-black'
                      : 'bg-emerald-950/30 border-emerald-900/40 text-emerald-900/60'
                  }`}
                >
                  {traffic.currentLight === 'green' && `${traffic.countdownSeconds}s`}
                </div>
              </div>

              {/* Status Details */}
              <div className="space-y-1.5">
                <p className="text-xs text-slate-400">Fase Aktif:</p>
                <p className="text-xl font-bold text-white uppercase tracking-tight">
                  LAMPU {traffic.currentLight.toUpperCase()}
                </p>
                <div className="text-xs font-mono text-slate-300 bg-slate-900 px-2.5 py-1 rounded border border-slate-800">
                  Sisa Durasi: <span className="font-bold text-white">{traffic.countdownSeconds} Detik</span>
                </div>
              </div>
            </div>

            {/* Mode Controls */}
            <div className="flex items-center justify-between text-xs">
              <p className="font-medium text-slate-300">Mode Kontrol</p>
              <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800">
                <button
                  onClick={() => setTrafficModeAuto(true)}
                  className={`px-2.5 py-1 rounded text-xs font-medium transition-colors cursor-pointer ${
                    traffic.isAutomatic ? 'bg-slate-800 text-white font-semibold' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Otomatis
                </button>
                <button
                  onClick={() => setTrafficModeAuto(false)}
                  className={`px-2.5 py-1 rounded text-xs font-medium transition-colors cursor-pointer ${
                    !traffic.isAutomatic ? 'bg-slate-800 text-white font-semibold' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Manual
                </button>
              </div>
            </div>
          </div>

          {/* Emergency Priority Button */}
          <div className="mt-4 pt-3 border-t border-slate-800/80">
            <button
              onClick={triggerTrafficEmergency}
              className="w-full py-2 rounded-lg font-medium text-xs border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              <Siren className="w-4 h-4 text-rose-400" />
              <span>Prioritas Kendaraan Darurat (Green Corridor)</span>
            </button>
          </div>
        </div>

        {/* Vehicle Classification Breakdown */}
        <div className="lg:col-span-6 rounded-xl bg-slate-900/60 border border-slate-800/80 p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
              <h3 className="text-xs font-semibold text-white uppercase tracking-wider">
                Klasifikasi Objek Terdeteksi
              </h3>
              <p className="text-[11px] font-mono text-slate-400">Model: COCO-SSD</p>
            </div>

            <div className="grid grid-cols-2 gap-2.5 my-4">
              <div className="p-3 rounded-lg bg-slate-900 border border-slate-800">
                <p className="text-slate-400 text-xs">Sepeda Motor</p>
                <p className="text-xl font-bold text-white font-mono mt-0.5">
                  {traffic.vehicleCounts?.motor ?? 0}
                </p>
              </div>

              <div className="p-3 rounded-lg bg-slate-900 border border-slate-800">
                <p className="text-slate-400 text-xs">Mobil</p>
                <p className="text-xl font-bold text-white font-mono mt-0.5">
                  {traffic.vehicleCounts?.mobil ?? 0}
                </p>
              </div>

              <div className="p-3 rounded-lg bg-slate-900 border border-slate-800">
                <p className="text-slate-400 text-xs">Bus</p>
                <p className="text-xl font-bold text-white font-mono mt-0.5">
                  {traffic.vehicleCounts?.bus ?? 0}
                </p>
              </div>

              <div className="p-3 rounded-lg bg-slate-900 border border-slate-800">
                <p className="text-slate-400 text-xs">Truk</p>
                <p className="text-xl font-bold text-white font-mono mt-0.5">
                  {traffic.vehicleCounts?.truk ?? 0}
                </p>
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
            <div className="flex items-center gap-1.5 text-slate-300">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <p>Pipeline Deteksi Aktif</p>
            </div>
            <p className="font-mono text-slate-400">Resolusi 1280x720 (Ideal)</p>
          </div>
        </div>
      </div>
    </div>
  );
};
