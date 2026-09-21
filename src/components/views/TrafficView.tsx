'use client';

import React, { useState } from 'react';
import { useSmartCity } from '@/context/SmartCityContext';
import { MetricCard } from '@/components/common/MetricCard';
import {
  Navigation,
  Gauge,
  Car,
  Clock,
  Sliders,
  AlertTriangle,
  Zap,
  Siren,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';

const TRAFFIC_24H_DATA = [
  { time: '00:00', density: 20, speed: 52 },
  { time: '03:00', density: 15, speed: 58 },
  { time: '06:00', density: 45, speed: 42 },
  { time: '07:30', density: 82, speed: 18 },
  { time: '09:00', density: 74, speed: 22 },
  { time: '12:00', density: 62, speed: 30 },
  { time: '14:00', density: 55, speed: 38 },
  { time: '17:00', density: 88, speed: 14 },
  { time: '18:30', density: 84, speed: 16 },
  { time: '21:00', density: 48, speed: 40 },
  { time: '23:00', density: 28, speed: 48 },
];

export const TrafficView: React.FC = () => {
  const {
    intersections,
    updateTrafficLightMode,
    updateTrafficManualPhases,
    triggerEmergencyCorridor,
  } = useSmartCity();

  const [selectedIntersectionId, setSelectedIntersectionId] = useState<string>('TRF-02');

  const selectedIntersection =
    intersections.find((i) => i.id === selectedIntersectionId) || intersections[0];

  return (
    <div className="space-y-5">
      {/* Top ATSC Alert Banner */}
      {selectedIntersection.density > 70 && (
        <div className="p-4 rounded-xl bg-gradient-to-r from-rose-900/40 via-slate-900 to-slate-900 border border-rose-500/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-pulse">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-rose-500/20 text-rose-400 border border-rose-500/40">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-rose-400">
                  AUTOMATION TRIGGERED • ATSC ACTIVE
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500 text-white">
                  KEPADATAN &gt; 70%
                </span>
              </div>
              <h2 className="text-sm font-bold text-white mt-0.5">
                Kepadatan {selectedIntersection.name}: {selectedIntersection.density}% (
                {selectedIntersection.statusText})
              </h2>
              <p className="text-xs text-rose-300/80">
                Aksi Sistem Otomatis: Lampu Hijau Diperpanjang +20 Detik untuk mengurai antrean {selectedIntersection.queueLengthMeters}m.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="px-3 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-bold flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5" /> Green Extended +20s
            </span>
          </div>
        </div>
      )}

      {/* Intersection Switcher Bar */}
      <div className="flex flex-wrap items-center gap-2 p-2 rounded-xl bg-slate-900/80 border border-slate-800">
        <span className="text-xs font-bold uppercase text-slate-400 px-3 flex items-center gap-1.5">
          <Navigation className="w-3.5 h-3.5 text-cyan-400" /> Simpang Terpantau:
        </span>
        {intersections.map((it) => (
          <button
            key={it.id}
            onClick={() => setSelectedIntersectionId(it.id)}
            className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-all flex items-center gap-2 ${
              selectedIntersection.id === it.id
                ? 'bg-cyan-500 text-white shadow-md shadow-cyan-500/20 font-bold'
                : 'bg-slate-800/60 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <span>{it.name}</span>
            <span
              className={`w-2 h-2 rounded-full ${
                it.density >= 70 ? 'bg-rose-400' : it.density >= 45 ? 'bg-amber-400' : 'bg-emerald-400'
              }`}
            />
          </button>
        ))}
      </div>

      {/* Key Metrics Grid for Selected Intersection */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Traffic Density"
          value={`${selectedIntersection.density}%`}
          statusText={selectedIntersection.statusText}
          statusVariant={
            selectedIntersection.density >= 75
              ? 'danger'
              : selectedIntersection.density >= 60
              ? 'warning'
              : 'success'
          }
          trend={{
            value: selectedIntersection.density >= 70 ? '+14% vs normal' : '-5% vs normal',
            direction: selectedIntersection.density >= 70 ? 'up' : 'down',
            label: 'real-time',
          }}
          icon={<Navigation className="w-4 h-4" />}
          footerText="Sensor Radar ESP32-001"
        />

        <MetricCard
          title="Vehicle Count"
          value={selectedIntersection.vehicleCount}
          unit="kendaraan/jam"
          statusText="Volume Tinggi"
          statusVariant="info"
          icon={<Car className="w-4 h-4" />}
          footerText="AI Optical Flow Detection"
        />

        <MetricCard
          title="Average Speed"
          value={`${selectedIntersection.avgSpeedKmh}`}
          unit="km/jam"
          statusText={selectedIntersection.avgSpeedKmh < 25 ? 'Merayap' : 'Lancar'}
          statusVariant={selectedIntersection.avgSpeedKmh < 25 ? 'danger' : 'success'}
          icon={<Gauge className="w-4 h-4" />}
          footerText="Batas Kecepatan Kota: 50 km/j"
        />

        <MetricCard
          title="Queue Length"
          value={`${selectedIntersection.queueLengthMeters}`}
          unit="meter"
          statusText={selectedIntersection.queueLengthMeters > 80 ? 'Kritis' : 'Normal'}
          statusVariant={selectedIntersection.queueLengthMeters > 80 ? 'danger' : 'info'}
          icon={<Clock className="w-4 h-4" />}
          footerText="Panjang Antrean Lampu Merah"
        />
      </div>

      {/* Main Grid: Visual Traffic Light Controller & 24h Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Visual Traffic Signal & ATSC Control Box */}
        <div className="lg:col-span-5 glass-panel rounded-2xl p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping" />
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                  Signal Controller: {selectedIntersection.name}
                </h3>
              </div>
              <span
                className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                  selectedIntersection.isAutomatic
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                }`}
              >
                {selectedIntersection.isAutomatic ? 'Mode: Otomatis (ATSC)' : 'Mode: Manual'}
              </span>
            </div>

            {/* Traffic Light Visual Column */}
            <div className="my-5 flex flex-col sm:flex-row items-center justify-center gap-6 p-4 rounded-xl bg-[#080E1B] border border-slate-800">
              {/* Traffic Pole Visual */}
              <div className="w-20 p-3 bg-slate-950 rounded-2xl border-2 border-slate-800 shadow-2xl flex flex-col items-center gap-3">
                {/* Red Light */}
                <div
                  className={`w-12 h-12 rounded-full border-2 transition-all duration-300 flex items-center justify-center text-xs font-bold ${
                    selectedIntersection.currentLight === 'red'
                      ? 'bg-rose-500 border-rose-400 shadow-lg shadow-rose-500/80 text-white animate-pulse'
                      : 'bg-rose-950/40 border-rose-900/40 text-rose-900/60'
                  }`}
                >
                  {selectedIntersection.currentLight === 'red' && `${selectedIntersection.countdownSeconds}s`}
                </div>

                {/* Yellow Light */}
                <div
                  className={`w-12 h-12 rounded-full border-2 transition-all duration-300 flex items-center justify-center text-xs font-bold ${
                    selectedIntersection.currentLight === 'yellow'
                      ? 'bg-amber-400 border-amber-300 shadow-lg shadow-amber-400/80 text-black animate-pulse'
                      : 'bg-amber-950/40 border-amber-900/40 text-amber-900/60'
                  }`}
                >
                  {selectedIntersection.currentLight === 'yellow' && `${selectedIntersection.countdownSeconds}s`}
                </div>

                {/* Green Light */}
                <div
                  className={`w-12 h-12 rounded-full border-2 transition-all duration-300 flex items-center justify-center text-xs font-bold ${
                    selectedIntersection.currentLight === 'green'
                      ? 'bg-emerald-400 border-emerald-300 shadow-lg shadow-emerald-400/80 text-black animate-pulse'
                      : 'bg-emerald-950/40 border-emerald-900/40 text-emerald-900/60'
                  }`}
                >
                  {selectedIntersection.currentLight === 'green' && `${selectedIntersection.countdownSeconds}s`}
                </div>
              </div>

              {/* Status Details */}
              <div className="space-y-2 text-center sm:text-left">
                <div className="text-xs text-slate-400">Fase Berjalan:</div>
                <div className="text-2xl font-black text-white uppercase tracking-tight flex items-center gap-2 justify-center sm:justify-start">
                  <span
                    className={`w-3 h-3 rounded-full ${
                      selectedIntersection.currentLight === 'green'
                        ? 'bg-emerald-400'
                        : selectedIntersection.currentLight === 'yellow'
                        ? 'bg-amber-400'
                        : 'bg-rose-500'
                    }`}
                  />
                  LAMPU {selectedIntersection.currentLight}
                </div>
                <div className="text-xs font-mono text-cyan-300 bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-800">
                  Hitung Mundur: <span className="font-bold text-white">{selectedIntersection.countdownSeconds} Detik</span>
                </div>
                {selectedIntersection.greenExtensionSeconds > 0 && (
                  <div className="text-[11px] text-emerald-400 font-semibold bg-emerald-500/10 px-2.5 py-1 rounded border border-emerald-500/20">
                    +20 Detik Ekstensi Otomatis Aktif
                  </div>
                )}
              </div>
            </div>

            {/* Mode Switch Controls */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-300">Mode Operasi Sinyal</span>
                <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-lg border border-slate-800 text-xs">
                  <button
                    onClick={() => updateTrafficLightMode(selectedIntersection.id, true)}
                    className={`px-3 py-1 rounded-md font-semibold transition-all ${
                      selectedIntersection.isAutomatic
                        ? 'bg-cyan-500 text-white'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Automatic (AI)
                  </button>
                  <button
                    onClick={() => updateTrafficLightMode(selectedIntersection.id, false)}
                    className={`px-3 py-1 rounded-md font-semibold transition-all ${
                      !selectedIntersection.isAutomatic
                        ? 'bg-amber-500 text-black'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Manual Override
                  </button>
                </div>
              </div>

              {/* Manual Phase Sliders (If Manual Mode) */}
              {!selectedIntersection.isAutomatic && (
                <div className="p-3.5 rounded-xl bg-slate-900/90 border border-amber-500/30 space-y-3">
                  <div className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                    <Sliders className="w-3.5 h-3.5" /> Pengaturan Durasi Fase Manual
                  </div>

                  <div>
                    <div className="flex justify-between text-xs text-slate-300 mb-1">
                      <span>Lampu Merah (Red)</span>
                      <span className="font-mono font-bold text-rose-400">{selectedIntersection.manualPhases.red}s</span>
                    </div>
                    <input
                      type="range"
                      min="10"
                      max="90"
                      value={selectedIntersection.manualPhases.red}
                      onChange={(e) =>
                        updateTrafficManualPhases(selectedIntersection.id, {
                          ...selectedIntersection.manualPhases,
                          red: Number(e.target.value),
                        })
                      }
                      className="w-full accent-rose-500 cursor-pointer"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between text-xs text-slate-300 mb-1">
                      <span>Lampu Hijau (Green)</span>
                      <span className="font-mono font-bold text-emerald-400">{selectedIntersection.manualPhases.green}s</span>
                    </div>
                    <input
                      type="range"
                      min="10"
                      max="90"
                      value={selectedIntersection.manualPhases.green}
                      onChange={(e) =>
                        updateTrafficManualPhases(selectedIntersection.id, {
                          ...selectedIntersection.manualPhases,
                          green: Number(e.target.value),
                        })
                      }
                      className="w-full accent-emerald-500 cursor-pointer"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Emergency Corridor Priority Button */}
          <div className="mt-5 pt-4 border-t border-slate-800">
            <button
              onClick={() => triggerEmergencyCorridor(selectedIntersection.id)}
              className={`w-full py-2.5 rounded-xl font-bold text-xs border transition-all flex items-center justify-center gap-2 ${
                selectedIntersection.emergencyPriorityActive
                  ? 'bg-rose-500 text-white border-rose-400 shadow-lg shadow-rose-500/30 animate-pulse'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
              }`}
            >
              <Siren className="w-4 h-4 text-rose-400" />
              {selectedIntersection.emergencyPriorityActive
                ? 'BATALKAN KORIDOR DARURAT (AMBULANS AKTIF)'
                : 'PRIORITAS KENDARAAN DARURAT (GREEN CORRIDOR)'}
            </button>
          </div>
        </div>

        {/* 24-Hour Traffic Flow Chart & Analytics */}
        <div className="lg:col-span-7 glass-panel rounded-2xl p-5 flex flex-col justify-between">
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-800">
              <div>
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                  Traffic Density: Last 24 Hours
                </h3>
                <p className="text-xs text-slate-400">
                  Data historis fluktuasi kepadatan dan kecepatan rata-rata kendaraan perkotaan.
                </p>
              </div>
              <div className="flex items-center gap-3 text-xs">
                <span className="flex items-center gap-1 text-cyan-400">
                  <span className="w-2.5 h-2.5 rounded-full bg-cyan-400" /> Kepadatan (%)
                </span>
                <span className="flex items-center gap-1 text-emerald-400">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" /> Kecepatan (km/j)
                </span>
              </div>
            </div>

            {/* Recharts Area Chart */}
            <div className="w-full h-64 mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={TRAFFIC_24H_DATA} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="densityGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#06B6D4" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#06B6D4" stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="speedGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10B981" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#10B981" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="time" stroke="#64748B" fontSize={11} />
                  <YAxis stroke="#64748B" fontSize={11} domain={[0, 100]} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0D1527',
                      borderColor: '#1E293B',
                      borderRadius: '8px',
                      color: '#F8FAFC',
                      fontSize: '12px',
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="density"
                    stroke="#06B6D4"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#densityGradient)"
                    name="Kepadatan (%)"
                  />
                  <Area
                    type="monotone"
                    dataKey="speed"
                    stroke="#10B981"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#speedGradient)"
                    name="Kecepatan (km/j)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Traffic Efficiency Summary */}
          <div className="mt-4 pt-4 border-t border-slate-800 grid grid-cols-3 gap-3 text-center">
            <div className="p-2.5 rounded-lg bg-slate-900/60 border border-slate-800">
              <div className="text-[10px] text-slate-400 uppercase font-bold">Waktu Puncak</div>
              <div className="text-sm font-bold text-rose-400 mt-0.5">17:00 - 18:30</div>
            </div>
            <div className="p-2.5 rounded-lg bg-slate-900/60 border border-slate-800">
              <div className="text-[10px] text-slate-400 uppercase font-bold">Penghematan Waktu</div>
              <div className="text-sm font-bold text-emerald-400 mt-0.5">24.5% via ATSC</div>
            </div>
            <div className="p-2.5 rounded-lg bg-slate-900/60 border border-slate-800">
              <div className="text-[10px] text-slate-400 uppercase font-bold">Kamera AI Optical</div>
              <div className="text-sm font-bold text-cyan-300 mt-0.5">4/4 Online</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
