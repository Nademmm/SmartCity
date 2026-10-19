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
  Video,
} from 'lucide-react';

export const TrafficView: React.FC = () => {
  const { traffic, triggerTrafficEmergency, setTrafficModeAuto, isCameraConnected } = useSmartCity();

  const isPadat = traffic.density >= 70;

  return (
    <div className="space-y-6">
      {/* Alert Banner when Congestion Detected */}
      {isPadat && (
        <div className="rounded-2xl p-4 bg-[#ffe4e6] border border-[#fecdd3] text-[#e11d48] flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-[#e11d48] shrink-0" />
            <div>
              <p className="font-bold text-sm">Kepadatan Lalu Lintas Tinggi ({traffic.density}%)</p>
              <p className="text-xs opacity-90">Terdeteksi akumulasi kendaraan di area simpang.</p>
            </div>
          </div>
          <button
            type="button"
            onClick={triggerTrafficEmergency}
            className="neu-btn px-4 py-2 rounded-xl text-xs font-bold text-[#e11d48] min-h-[44px]"
          >
            Jalur Hijau Darurat
          </button>
        </div>
      )}

      {/* Live Direct Browser Webcam Feed Player */}
      <LiveWebcamFeed />

      {/* 4 Clean Real Telemetry Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Status Kamera"
          value={isCameraConnected ? 'AKTIF' : 'SIAGA'}
          colorScheme={isCameraConnected ? 'emerald' : 'indigo'}
          icon={<Video className="w-5 h-5" />}
          subtitle="Kamera Pemantau Simpang"
        />

        <MetricCard
          title="Total Objek"
          value={traffic.vehicleCount}
          unit="Unit"
          colorScheme="cyan"
          icon={<Car className="w-5 h-5" />}
          subtitle="Klasifikasi Visi Nyata"
        />

        <MetricCard
          title="Kepadatan Jalan"
          value={`${traffic.density}%`}
          colorScheme={traffic.density >= 75 ? 'rose' : traffic.density >= 50 ? 'amber' : 'emerald'}
          icon={<Navigation className="w-5 h-5" />}
          subtitle={traffic.statusText}
        />

        <MetricCard
          title="Fase Sinyal"
          value={traffic.currentLight.toUpperCase()}
          unit={`${traffic.countdownSeconds}s`}
          colorScheme={traffic.currentLight === 'green' ? 'emerald' : traffic.currentLight === 'yellow' ? 'amber' : 'rose'}
          icon={<Navigation className="w-5 h-5" />}
          subtitle={traffic.isAutomatic ? 'Mode Adaptif' : 'Manual Override'}
        />
      </div>

      {/* Signal Controller & Vehicle Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Signal Controller Box */}
        <div className="lg:col-span-6 neu-raised rounded-3xl p-6 border border-white/80 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-[#d3dde9]">
              <h3 className="text-xs font-bold text-[#4e5d71] uppercase tracking-wider">
                Pengatur Sinyal Simpang
              </h3>
              <div className="flex items-center neu-inset p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => setTrafficModeAuto(true)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all min-h-[44px] ${
                    traffic.isAutomatic ? 'neu-btn-active text-[#059669]' : 'text-[#4e5d71]'
                  }`}
                >
                  Otomatis
                </button>
                <button
                  type="button"
                  onClick={() => setTrafficModeAuto(false)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all min-h-[44px] ${
                    !traffic.isAutomatic ? 'neu-btn-active text-[#0284c7]' : 'text-[#4e5d71]'
                  }`}
                >
                  Manual
                </button>
              </div>
            </div>

            {/* Visual Signal Status */}
            <div className="my-6 flex items-center justify-center gap-8 p-6 rounded-2xl neu-inset">
              {/* Traffic Light Head */}
              <div className="w-20 p-3 neu-raised rounded-3xl border border-white/80 flex flex-col items-center gap-3">
                {/* Red */}
                <div
                  className={`w-12 h-12 rounded-full flex items-center justify-center font-mono font-extrabold text-xs transition-all duration-300 ${
                    traffic.currentLight === 'red'
                      ? 'bg-[#e11d48] text-white shadow-[0_0_20px_rgba(225,29,72,0.6)] scale-110'
                      : 'bg-[#dbe3ee] text-[#8e9eaf]'
                  }`}
                >
                  {traffic.currentLight === 'red' && `${traffic.countdownSeconds}s`}
                </div>

                {/* Yellow */}
                <div
                  className={`w-12 h-12 rounded-full flex items-center justify-center font-mono font-extrabold text-xs transition-all duration-300 ${
                    traffic.currentLight === 'yellow'
                      ? 'bg-[#d97706] text-white shadow-[0_0_20px_rgba(217,119,6,0.6)] scale-110'
                      : 'bg-[#dbe3ee] text-[#8e9eaf]'
                  }`}
                >
                  {traffic.currentLight === 'yellow' && `${traffic.countdownSeconds}s`}
                </div>

                {/* Green */}
                <div
                  className={`w-12 h-12 rounded-full flex items-center justify-center font-mono font-extrabold text-xs transition-all duration-300 ${
                    traffic.currentLight === 'green'
                      ? 'bg-[#059669] text-white shadow-[0_0_20px_rgba(5,150,105,0.6)] scale-110'
                      : 'bg-[#dbe3ee] text-[#8e9eaf]'
                  }`}
                >
                  {traffic.currentLight === 'green' && `${traffic.countdownSeconds}s`}
                </div>
              </div>

              {/* Status Details */}
              <div className="space-y-2">
                <p className="text-xs text-[#6e7e93] font-bold">FASE AKTIF:</p>
                <p className="text-2xl font-extrabold text-[#19212d] uppercase tracking-tight">
                  LAMPU {traffic.currentLight.toUpperCase()}
                </p>
                <p className="text-xs font-mono font-bold text-[#0284c7]">
                  Sisa Waktu: {traffic.countdownSeconds} Detik
                </p>
              </div>
            </div>
          </div>

          {/* Emergency Priority Button */}
          <div className="pt-4 border-t border-[#d3dde9]">
            <button
              type="button"
              onClick={triggerTrafficEmergency}
              className="neu-btn w-full py-3.5 px-4 rounded-xl text-xs font-bold text-[#e11d48] flex items-center justify-center gap-2 min-h-[44px]"
            >
              <Siren className="w-4 h-4 text-[#e11d48]" />
              <span>Prioritas Jalur Darurat (Green Corridor)</span>
            </button>
          </div>
        </div>

        {/* Vehicle Classification Breakdown */}
        <div className="lg:col-span-6 neu-raised rounded-3xl p-6 border border-white/80 flex flex-col justify-between">
          <div>
            <div className="pb-3 border-b border-[#d3dde9] mb-4">
              <h3 className="text-xs font-bold text-[#4e5d71] uppercase tracking-wider">
                Klasifikasi Kendaraan Terpantau
              </h3>
            </div>

            <div className="grid grid-cols-2 gap-4 my-2">
              <div className="neu-inset p-4 rounded-2xl">
                <span className="text-[#6e7e93] text-xs font-bold">Sepeda Motor</span>
                <p className="text-3xl font-extrabold text-[#0284c7] font-mono mt-2">
                  {traffic.vehicleCounts?.motor ?? 0}
                </p>
              </div>

              <div className="neu-inset p-4 rounded-2xl">
                <span className="text-[#6e7e93] text-xs font-bold">Mobil</span>
                <p className="text-3xl font-extrabold text-[#059669] font-mono mt-2">
                  {traffic.vehicleCounts?.mobil ?? 0}
                </p>
              </div>

              <div className="neu-inset p-4 rounded-2xl">
                <span className="text-[#6e7e93] text-xs font-bold">Bus</span>
                <p className="text-3xl font-extrabold text-[#d97706] font-mono mt-2">
                  {traffic.vehicleCounts?.bus ?? 0}
                </p>
              </div>

              <div className="neu-inset p-4 rounded-2xl">
                <span className="text-[#6e7e93] text-xs font-bold">Truk</span>
                <p className="text-3xl font-extrabold text-[#e11d48] font-mono mt-2">
                  {traffic.vehicleCounts?.truk ?? 0}
                </p>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-[#d3dde9] text-xs text-[#6e7e93] flex justify-between">
            <span>Model Deteksi COCO-SSD Aktif</span>
            <span className="font-mono">Resolusi 1280x720</span>
          </div>
        </div>
      </div>
    </div>
  );
};
