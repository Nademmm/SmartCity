'use client';

import React, { useState } from 'react';
import { useSmartCity } from '@/context/SmartCityContext';
import { MetricCard } from '@/components/common/MetricCard';
import {
  Lightbulb,
  Zap,
  Power,
  Sliders,
  Footprints,
  Car,
  Clock,
  Sparkles,
  ShieldCheck,
  RotateCcw,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';

const PJU_ENERGY_DATA = [
  { hour: '18:00', conventional: 480, adaptive: 220 },
  { hour: '20:00', conventional: 480, adaptive: 340 },
  { hour: '22:00', conventional: 480, adaptive: 280 },
  { hour: '00:00', conventional: 480, adaptive: 150 },
  { hour: '02:00', conventional: 480, adaptive: 120 },
  { hour: '04:00', conventional: 480, adaptive: 140 },
  { hour: '06:00', conventional: 480, adaptive: 180 },
];

export const LightingView: React.FC = () => {
  const {
    pjuNodes,
    updatePJUBrightness,
    togglePJUPower,
    simulatePJUMotion,
  } = useSmartCity();

  const [selectedPjuId, setSelectedPjuId] = useState<string>('PJU-001');

  // Aggregates
  const totalPju = pjuNodes.length;
  const activePju = pjuNodes.filter((p) => p.status !== 'fault' && p.brightness > 0).length;
  const avgBrightness = Math.round(
    pjuNodes.reduce((acc, curr) => acc + curr.brightness, 0) / (totalPju || 1)
  );
  const totalPowerWatts = pjuNodes.reduce((acc, curr) => acc + curr.powerWatts, 0);
  const energySavingPercent = Math.round(((totalPju * 60 - totalPowerWatts) / (totalPju * 60)) * 100);

  const selectedPju = pjuNodes.find((p) => p.id === selectedPjuId) || pjuNodes[0];

  return (
    <div className="space-y-5">
      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Total PJU Terhubung"
          value={`${activePju}/${totalPju}`}
          statusText="Cluster Master Online"
          statusVariant="success"
          icon={<Lightbulb className="w-4 h-4" />}
          footerText="8 Tiang Jalan LED Pintar"
        />

        <MetricCard
          title="Average Brightness"
          value={`${avgBrightness}%`}
          statusText={avgBrightness <= 40 ? 'Eco Dimming Aktif' : 'High Intensity'}
          statusVariant="info"
          icon={<Sliders className="w-4 h-4" />}
          footerText="Baseline 30% Malam Hari"
        />

        <MetricCard
          title="Energy Saving"
          value={`${energySavingPercent}%`}
          statusText="Optimal Efficiency"
          statusVariant="success"
          trend={{ value: 'vs Lampu Konvensional', direction: 'down', label: 'Efisiensi' }}
          icon={<Zap className="w-4 h-4" />}
          footerText="Daya Saat Ini: 216 Watt"
        />

        <MetricCard
          title="Smart Motion Sensors"
          value={`${pjuNodes.filter((p) => p.motionDetected).length}`}
          unit="tiang mendeteksi"
          statusText="Radar Doppler PIR"
          statusVariant="neutral"
          icon={<Car className="w-4 h-4" />}
          footerText="Respon Terang &lt; 0.2 detik"
        />
      </div>

      {/* Main Grid: Individual Control & Energy Consumption Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left: Interactive PJU Controller & Motion Simulator */}
        <div className="lg:col-span-6 glass-panel rounded-2xl p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping" />
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                  Smart Controller: {selectedPju.name}
                </h3>
              </div>
              <span
                className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                  selectedPju.status === 'optimal'
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                }`}
              >
                {selectedPju.status === 'optimal' ? 'Status: 100% Terang' : 'Status: Energy Saving 30%'}
              </span>
            </div>

            {/* Glowing Bulb Visualizer */}
            <div className="my-5 p-6 rounded-2xl bg-[#070D1A] border border-slate-800 flex flex-col items-center justify-center relative overflow-hidden">
              {/* Dynamic Radial Glow */}
              <div
                className="absolute inset-0 transition-opacity duration-700 pointer-events-none"
                style={{
                  background: `radial-gradient(circle at center, rgba(245, 158, 11, ${
                    selectedPju.brightness * 0.005
                  }) 0%, rgba(0,0,0,0) 70%)`,
                }}
              />

              <div className="relative z-10 flex flex-col items-center">
                <div
                  className="w-20 h-20 rounded-full flex items-center justify-center border-2 transition-all duration-700 shadow-2xl"
                  style={{
                    backgroundColor: `rgba(245, 158, 11, ${0.1 + (selectedPju.brightness / 100) * 0.4})`,
                    borderColor: selectedPju.brightness > 0 ? '#F59E0B' : '#334155',
                    boxShadow:
                      selectedPju.brightness > 0
                        ? `0 0 ${selectedPju.brightness * 0.4}px rgba(245, 158, 11, 0.6)`
                        : 'none',
                  }}
                >
                  <Lightbulb
                    className="w-10 h-10 transition-colors duration-500"
                    style={{
                      color: selectedPju.brightness > 0 ? '#FEF08A' : '#64748B',
                    }}
                  />
                </div>

                <div className="mt-4 text-center">
                  <div className="text-3xl font-black text-white font-mono">{selectedPju.brightness}%</div>
                  <div className="text-xs text-slate-400 mt-0.5">
                    Konsumsi Daya: <span className="font-bold text-amber-400">{selectedPju.powerWatts} Watt</span> (LED SMD 3030)
                  </div>
                  {selectedPju.motionDetected && (
                    <span className="inline-block mt-2 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse">
                      Kendaraan/Pejalan Kaki Terdeteksi
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Controls */}
            <div className="space-y-4">
              {/* Mode Toggle & Power Switch */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => updatePJUBrightness(selectedPju.id, selectedPju.brightness, true)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                      selectedPju.isAutomatic
                        ? 'bg-cyan-500 text-white border-cyan-400'
                        : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
                    }`}
                  >
                    Auto Adaptive (Rule 02)
                  </button>
                  <button
                    onClick={() => updatePJUBrightness(selectedPju.id, selectedPju.brightness, false)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                      !selectedPju.isAutomatic
                        ? 'bg-amber-500 text-black border-amber-400'
                        : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
                    }`}
                  >
                    Manual Mode
                  </button>
                </div>

                <button
                  onClick={() => togglePJUPower(selectedPju.id)}
                  className={`p-2 rounded-lg border transition-all ${
                    selectedPju.brightness > 0
                      ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40 hover:bg-emerald-500/30'
                      : 'bg-slate-800 text-slate-500 border-slate-700 hover:text-slate-300'
                  }`}
                  title="Toggle Power ON/OFF"
                >
                  <Power className="w-4 h-4" />
                </button>
              </div>

              {/* Brightness Slider */}
              <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2">
                <div className="flex justify-between text-xs text-slate-300">
                  <span className="font-semibold">Atur Intensitas Cahaya (Soft Dimming)</span>
                  <span className="font-mono font-bold text-amber-400">{selectedPju.brightness}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={selectedPju.brightness}
                  onChange={(e) => updatePJUBrightness(selectedPju.id, Number(e.target.value), false)}
                  className="w-full accent-amber-500 cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                  <span>0% (OFF)</span>
                  <span>30% (Eco Night)</span>
                  <span>100% (High Beam)</span>
                </div>
              </div>
            </div>
          </div>

          {/* Interactive Motion Sensor Trigger (Simulate Car/Walker) */}
          <div className="mt-5 pt-4 border-t border-slate-800">
            <button
              onClick={() => simulatePJUMotion(selectedPju.id)}
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-500/20 to-cyan-500/20 hover:from-amber-500/30 hover:to-cyan-500/30 text-amber-300 font-bold text-xs border border-amber-500/40 transition-all flex items-center justify-center gap-2"
            >
              <Car className="w-4 h-4 text-amber-400" />
              <span>SIMULASIKAN KENDARAAN / PEJALAN KAKI LEWAT (TRIGGER 100%)</span>
            </button>
          </div>
        </div>

        {/* Right: Grid of all PJU Nodes & 24h Consumption Chart */}
        <div className="lg:col-span-6 space-y-5">
          {/* Energy Consumption Comparison Chart */}
          <div className="glass-panel rounded-2xl p-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                  PJU Energy Consumption (Watt)
                </h3>
                <p className="text-xs text-slate-400">Perbandingan Lampu Konvensional vs Adaptive Dimming</p>
              </div>
              <div className="flex items-center gap-3 text-xs">
                <span className="flex items-center gap-1 text-slate-400">
                  <span className="w-2.5 h-2.5 rounded-full bg-slate-600" /> Konvensional
                </span>
                <span className="flex items-center gap-1 text-amber-400">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-400" /> UrbanPulse Adaptive
                </span>
              </div>
            </div>

            <div className="w-full h-48 mt-3">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={PJU_ENERGY_DATA} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="hour" stroke="#64748B" fontSize={11} />
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
                  <Bar dataKey="conventional" fill="#475569" name="Konvensional (W)" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="adaptive" fill="#F59E0B" name="Adaptive (W)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Node Grid Selector */}
          <div className="glass-panel rounded-2xl p-5">
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-3">
              Daftar Tiang Lampu Terkoneksi (PJU Network)
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {pjuNodes.map((node) => {
                const isSelected = node.id === selectedPjuId;
                return (
                  <button
                    key={node.id}
                    onClick={() => setSelectedPjuId(node.id)}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      isSelected
                        ? 'bg-amber-500/15 border-amber-500/50 shadow-md shadow-amber-500/10'
                        : 'bg-slate-900/70 border-slate-800 hover:border-slate-700 hover:bg-slate-900'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] font-mono font-bold text-slate-300">{node.id}</span>
                      <span
                        className={`w-2 h-2 rounded-full ${
                          node.brightness > 50 ? 'bg-amber-400 animate-pulse' : 'bg-slate-600'
                        }`}
                      />
                    </div>
                    <div className="text-xs font-bold text-white truncate">{node.name}</div>
                    <div className="text-[11px] font-mono font-semibold text-amber-400 mt-1">
                      {node.brightness}% • {node.powerWatts}W
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
