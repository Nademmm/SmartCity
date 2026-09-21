'use client';

import React, { useState } from 'react';
import { useSmartCity } from '@/context/SmartCityContext';
import { MetricCard } from '@/components/common/MetricCard';
import {
  Footprints,
  Users,
  Clock,
  ShieldCheck,
  AlertTriangle,
  Hand,
  CheckCircle2,
  Sliders,
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

const PEDESTRIAN_HOURLY_DATA = [
  { time: '06:00', volume: 85 },
  { time: '07:00', volume: 320 },
  { time: '08:00', volume: 410 },
  { time: '11:00', volume: 190 },
  { time: '13:00', volume: 340 },
  { time: '15:00', volume: 290 },
  { time: '17:00', volume: 480 },
  { time: '19:00', volume: 260 },
  { time: '21:00', volume: 110 },
];

export const PedestrianView: React.FC = () => {
  const { pedestrians, triggerPelicanCrossing } = useSmartCity();
  const [selectedCrossingId, setSelectedCrossingId] = useState<string>('PED-01');

  const selectedCrossing =
    pedestrians.find((p) => p.id === selectedCrossingId) || pedestrians[0];

  return (
    <div className="space-y-5">
      {/* High Activity Alert Banner */}
      {selectedCrossing.pelicanState === 'WALK' && (
        <div className="p-4 rounded-xl bg-gradient-to-r from-emerald-950/50 via-slate-900 to-slate-900 border border-emerald-500/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-pulse">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
              <Footprints className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                  SMART PELICAN CROSSING ACTIVE
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500 text-black">
                  SIGNAL: WALK
                </span>
              </div>
              <h2 className="text-sm font-bold text-white mt-0.5">
                {selectedCrossing.location}
              </h2>
              <p className="text-xs text-emerald-300/80">
                Lalu lintas kendaraan otomatis STOP. Pejalan kaki diberikan waktu menyeberang aman ({selectedCrossing.countdownSeconds}s tersisa).
              </p>
            </div>
          </div>

          <div className="px-3 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-bold flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5" /> Pedestrian Safe Corridor
          </div>
        </div>
      )}

      {/* Crossing Switcher */}
      <div className="flex flex-wrap items-center gap-2 p-2 rounded-xl bg-slate-900/80 border border-slate-800">
        <span className="text-xs font-bold uppercase text-slate-400 px-3 flex items-center gap-1.5">
          <Footprints className="w-3.5 h-3.5 text-cyan-400" /> Lokasi Penyeberangan:
        </span>
        {pedestrians.map((ped) => (
          <button
            key={ped.id}
            onClick={() => setSelectedCrossingId(ped.id)}
            className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-all flex items-center gap-2 ${
              selectedCrossing.id === ped.id
                ? 'bg-cyan-500 text-white shadow-md shadow-cyan-500/20 font-bold'
                : 'bg-slate-800/60 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <span>{ped.location}</span>
            <span
              className={`px-1.5 py-0.2 rounded text-[10px] ${
                ped.pelicanState === 'WALK'
                  ? 'bg-emerald-400 text-black font-bold'
                  : 'bg-slate-700 text-slate-300'
              }`}
            >
              {ped.pelicanState}
            </span>
          </button>
        ))}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Pedestrian Count"
          value={selectedCrossing.pedestrianCount}
          unit="orang/jam"
          statusText={selectedCrossing.status}
          statusVariant={selectedCrossing.status === 'HIGH ACTIVITY' ? 'warning' : 'success'}
          trend={{ value: '+18% vs jam lalu', direction: 'up', label: 'aktivitas' }}
          icon={<Users className="w-4 h-4" />}
          footerText="Sensor Radar Doppler ESP32-004"
        />

        <MetricCard
          title="Antrean Menunggu"
          value={selectedCrossing.waitingCount}
          unit="orang"
          statusText={selectedCrossing.waitingCount >= selectedCrossing.autoTriggerThreshold ? 'Threshold Tercapai' : 'Normal'}
          statusVariant={selectedCrossing.waitingCount >= selectedCrossing.autoTriggerThreshold ? 'danger' : 'info'}
          icon={<Clock className="w-4 h-4" />}
          footerText={`Batas Auto-Trigger: ${selectedCrossing.autoTriggerThreshold} orang`}
        />

        <MetricCard
          title="Pelican State"
          value={selectedCrossing.pelicanState}
          statusText={selectedCrossing.pelicanState === 'WALK' ? 'Kendaraan STOP' : 'Kendaraan Jalan'}
          statusVariant={selectedCrossing.pelicanState === 'WALK' ? 'success' : 'neutral'}
          icon={<Footprints className="w-4 h-4" />}
          footerText={`Sisa Waktu: ${selectedCrossing.countdownSeconds} detik`}
        />

        <MetricCard
          title="Safety Score"
          value="99.4%"
          statusText="Zero Incident"
          statusVariant="success"
          icon={<ShieldCheck className="w-4 h-4" />}
          footerText="AI Pedestrian Protection Active"
        />
      </div>

      {/* Main Grid: Pelican Crossing Visual Box & Hourly Volume Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left: Pelican Crossing Simulator Panel */}
        <div className="lg:col-span-5 glass-panel rounded-2xl p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping" />
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                  Pelican Crossing Visualizer
                </h3>
              </div>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                Rule 03 Auto Active
              </span>
            </div>

            {/* Visual Walk / Wait Signal Box */}
            <div className="my-5 p-6 rounded-2xl bg-[#080E1B] border border-slate-800 flex flex-col items-center justify-center gap-5">
              <div className="flex items-center gap-6">
                {/* WAIT Symbol (Red Hand) */}
                <div
                  className={`w-24 h-24 rounded-2xl border-2 flex flex-col items-center justify-center gap-1 transition-all duration-300 ${
                    selectedCrossing.pelicanState === 'WAIT'
                      ? 'bg-rose-950/80 border-rose-500 shadow-xl shadow-rose-500/30 text-rose-400 animate-pulse'
                      : 'bg-slate-900/40 border-slate-800 text-slate-700'
                  }`}
                >
                  <Hand className="w-10 h-10" />
                  <span className="text-[10px] font-black tracking-widest uppercase">WAIT</span>
                </div>

                {/* WALK Symbol (Green Walking Person) */}
                <div
                  className={`w-24 h-24 rounded-2xl border-2 flex flex-col items-center justify-center gap-1 transition-all duration-300 ${
                    selectedCrossing.pelicanState === 'WALK'
                      ? 'bg-emerald-950/80 border-emerald-400 shadow-xl shadow-emerald-500/30 text-emerald-400 animate-pulse'
                      : 'bg-slate-900/40 border-slate-800 text-slate-700'
                  }`}
                >
                  <Footprints className="w-10 h-10" />
                  <span className="text-[10px] font-black tracking-widest uppercase">WALK</span>
                </div>
              </div>

              {/* Countdown & Status */}
              <div className="text-center">
                <div className="text-xs text-slate-400">Durasi Sinyal Berjalan:</div>
                <div className="text-3xl font-black text-white font-mono mt-0.5">
                  {selectedCrossing.countdownSeconds} <span className="text-xs text-slate-400 font-normal">detik</span>
                </div>
                <div className="mt-2 text-xs font-semibold text-slate-300 bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-800">
                  {selectedCrossing.pelicanState === 'WALK'
                    ? 'Lalu lintas disetop, silakan menyeberang'
                    : 'Menunggu antrean atau penekanan tombol pejalan kaki'}
                </div>
              </div>
            </div>

            {/* Threshold condition note */}
            <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 text-xs text-slate-300 space-y-1">
              <div className="font-bold text-cyan-400 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" /> Logika Otomasi Rule 03:
              </div>
              <p className="text-slate-400">
                Jika antrean pejalan kaki &gt; {selectedCrossing.autoTriggerThreshold} orang, sinyal otomatis berganti ke WALK selama 15 detik.
              </p>
            </div>
          </div>

          {/* Manual Request Push Button */}
          <div className="mt-5 pt-4 border-t border-slate-800">
            <button
              onClick={() => triggerPelicanCrossing(selectedCrossing.id)}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-xs shadow-lg shadow-cyan-500/25 transition-all flex items-center justify-center gap-2"
            >
              <Hand className="w-4 h-4" />
              <span>TEKAN TOMBOL MANUAL PENYEBERANGAN (REQUEST WALK)</span>
            </button>
          </div>
        </div>

        {/* Right: Hourly Foot Traffic Volume Chart */}
        <div className="lg:col-span-7 glass-panel rounded-2xl p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div>
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                  Foot Traffic Activity: 24 Jam
                </h3>
                <p className="text-xs text-slate-400">Jumlah pejalan kaki terpantau oleh kamera sensor radar AI.</p>
              </div>
              <span className="text-xs font-mono text-cyan-400 bg-slate-900 px-2.5 py-1 rounded-lg border border-slate-800">
                Rata-rata: 280 org/jam
              </span>
            </div>

            <div className="w-full h-64 mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={PEDESTRIAN_HOURLY_DATA} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="pedGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#06B6D4" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#06B6D4" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="time" stroke="#64748B" fontSize={11} />
                  <YAxis stroke="#64748B" fontSize={11} />
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
                    dataKey="volume"
                    stroke="#06B6D4"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#pedGradient)"
                    name="Pejalan Kaki (orang)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-slate-800 grid grid-cols-2 gap-3 text-center">
            <div className="p-3 rounded-lg bg-slate-900/70 border border-slate-800">
              <div className="text-[10px] text-slate-400 uppercase font-bold">Jam Tersibuk Sekolah & Kantor</div>
              <div className="text-sm font-bold text-cyan-400 mt-0.5">07:00 - 08:30 & 16:30 - 17:30</div>
            </div>
            <div className="p-3 rounded-lg bg-slate-900/70 border border-slate-800">
              <div className="text-[10px] text-slate-400 uppercase font-bold">Respon Waktu Lampu Hijau</div>
              <div className="text-sm font-bold text-emerald-400 mt-0.5">&lt; 15 Detik Rata-rata</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
