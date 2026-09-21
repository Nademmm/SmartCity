'use client';

import React, { useState } from 'react';
import { useSmartCity } from '@/context/SmartCityContext';
import { MetricCard } from '@/components/common/MetricCard';
import {
  Wind,
  Droplets,
  Thermometer,
  AlertTriangle,
  ShieldAlert,
  Zap,
  RotateCw,
  CheckCircle2,
  X,
  Navigation,
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

const AQI_24H_DATA = [
  { time: '00:00', aqi: 45, pm25: 18 },
  { time: '03:00', aqi: 40, pm25: 15 },
  { time: '06:00', aqi: 58, pm25: 28 },
  { time: '08:00', aqi: 88, pm25: 45 },
  { time: '11:00', aqi: 76, pm25: 39 },
  { time: '14:00', aqi: 72, pm25: 38 },
  { time: '17:00', aqi: 115, pm25: 62 },
  { time: '19:00', aqi: 95, pm25: 50 },
  { time: '22:00', aqi: 65, pm25: 32 },
];

export const AirQualityView: React.FC = () => {
  const { airQuality, toggleAQIMitigation, toggleMistingCannons } = useSmartCity();
  const [isMitigationModalOpen, setIsMitigationModalOpen] = useState<boolean>(false);

  const isUnhealthy = airQuality.aqi > 100;

  const getAqiColor = (aqi: number) => {
    if (aqi <= 50) return 'text-emerald-400 border-emerald-500/30 bg-emerald-500/15';
    if (aqi <= 100) return 'text-amber-400 border-amber-500/30 bg-amber-500/15';
    if (aqi <= 150) return 'text-orange-400 border-orange-500/30 bg-orange-500/15';
    return 'text-rose-400 border-rose-500/30 bg-rose-500/15';
  };

  return (
    <div className="space-y-5">
      {/* Critical / Unhealthy AQI Alert Banner */}
      {isUnhealthy && (
        <div className="p-4 rounded-xl bg-gradient-to-r from-rose-950/50 via-slate-900 to-slate-900 border border-rose-500/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-pulse">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-rose-500/20 text-rose-400 border border-rose-500/40">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-rose-400">
                  AIR QUALITY WARNING • UNSAFE EMISSIONS
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500 text-white">
                  AQI &gt; 100
                </span>
              </div>
              <h2 className="text-sm font-bold text-white mt-0.5">
                Kondisi Udara Zona Industri: AQI {airQuality.aqi} ({airQuality.status})
              </h2>
              <p className="text-xs text-rose-300/80">
                Sistem mitigasi otomatis aktif: Urban Misting Cannons menyemprotkan partikulat air dan rute kendaraan berat dialihkan.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsMitigationModalOpen(true)}
              className="px-3.5 py-2 rounded-lg bg-rose-500 text-white text-xs font-bold hover:bg-rose-600 transition-all shadow-lg shadow-rose-500/20"
            >
              Lihat Prosedur Mitigasi
            </button>
          </div>
        </div>
      )}

      {/* KPI Cards: Multi-Gas & Atmospheric Sensors */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <MetricCard
          title="Air Quality Index"
          value={airQuality.aqi}
          unit="AQI"
          statusText={airQuality.status}
          statusVariant={airQuality.aqi > 100 ? 'danger' : airQuality.aqi > 50 ? 'warning' : 'success'}
          trend={{ value: `${airQuality.pm25} µg/m³ PM2.5`, direction: 'neutral', label: 'PM2.5' }}
          icon={<Wind className="w-4 h-4" />}
          footerText="Sensor Array ESP32-003"
        />

        <MetricCard
          title="Carbon Monoxide (CO)"
          value={`${airQuality.co}`}
          unit="ppm"
          statusText="Level Aman"
          statusVariant="success"
          icon={<Droplets className="w-4 h-4" />}
          footerText="Standar Baku Mutu: &lt; 9 ppm"
        />

        <MetricCard
          title="Carbon Dioxide (CO2)"
          value={`${airQuality.co2}`}
          unit="ppm"
          statusText="Normal Atmosfer"
          statusVariant="info"
          icon={<Wind className="w-4 h-4" />}
          footerText="Baseline Global: 420 ppm"
        />

        <MetricCard
          title="Nitrogen Dioxide (NO2)"
          value={`${airQuality.no2}`}
          unit="ppb"
          statusText="Emisi Kendaraan"
          statusVariant="info"
          icon={<Wind className="w-4 h-4" />}
          footerText="Ambang Batas: 100 ppb"
        />

        <MetricCard
          title="Suhu & Kelembapan"
          value={`${airQuality.temperature}°C`}
          unit={`/ ${airQuality.humidity}%`}
          statusText="Tropis Lembap"
          statusVariant="neutral"
          icon={<Thermometer className="w-4 h-4" />}
          footerText="Sensor DHT22 / SHT31"
        />
      </div>

      {/* Main Grid: 24h AQI Chart & Mitigation Action Control Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left: 24h Real-Time AQI Trend */}
        <div className="lg:col-span-7 glass-panel rounded-2xl p-5 flex flex-col justify-between">
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-800">
              <div>
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                  Air Quality Index (AQI) - 24 Jam
                </h3>
                <p className="text-xs text-slate-400">Tren polutan PM2.5 dan indeks kualitas udara terpadu.</p>
              </div>
              <div className="flex items-center gap-3 text-xs">
                <span className="flex items-center gap-1 text-cyan-400">
                  <span className="w-2.5 h-2.5 rounded-full bg-cyan-400" /> AQI
                </span>
                <span className="flex items-center gap-1 text-emerald-400">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" /> PM2.5 (µg/m³)
                </span>
              </div>
            </div>

            <div className="w-full h-64 mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={AQI_24H_DATA} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="aqiGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#06B6D4" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#06B6D4" stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="pm25Gradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10B981" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#10B981" stopOpacity={0.0} />
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
                    dataKey="aqi"
                    stroke="#06B6D4"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#aqiGradient)"
                    name="AQI"
                  />
                  <Area
                    type="monotone"
                    dataKey="pm25"
                    stroke="#10B981"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#pm25Gradient)"
                    name="PM2.5 (µg/m³)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Standards Scale */}
          <div className="mt-4 pt-4 border-t border-slate-800 grid grid-cols-4 gap-2 text-center text-[10px]">
            <div className="p-2 rounded bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 font-bold">
              0 - 50: Baik (Good)
            </div>
            <div className="p-2 rounded bg-amber-500/15 border border-amber-500/30 text-amber-400 font-bold">
              51 - 100: Sedang (Moderate)
            </div>
            <div className="p-2 rounded bg-orange-500/15 border border-orange-500/30 text-orange-400 font-bold">
              101 - 150: Tidak Sehat
            </div>
            <div className="p-2 rounded bg-rose-500/15 border border-rose-500/30 text-rose-400 font-bold">
              &gt; 150: Sangat Tidak Sehat
            </div>
          </div>
        </div>

        {/* Right: Active Mitigation Response System */}
        <div className="lg:col-span-5 glass-panel rounded-2xl p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-cyan-400" />
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                  Automated Mitigation System
                </h3>
              </div>
              <span
                className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                  airQuality.mitigationActive
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : 'bg-slate-800 text-slate-400'
                }`}
              >
                {airQuality.mitigationActive ? 'Mitigasi AKTIF' : 'Standby'}
              </span>
            </div>

            <div className="my-4 space-y-3">
              {/* Action 1: Urban Misting Cannons */}
              <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className={`p-2 rounded-lg border ${
                      airQuality.mistingCannonsActive
                        ? 'bg-cyan-500/20 border-cyan-500/40 text-cyan-300'
                        : 'bg-slate-800 border-slate-700 text-slate-500'
                    }`}
                  >
                    <Droplets className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white">Urban Misting Cannons</div>
                    <div className="text-[10px] text-slate-400">Penyemprotan kabut air pengikat partikulat PM2.5</div>
                  </div>
                </div>

                <button
                  onClick={toggleMistingCannons}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                    airQuality.mistingCannonsActive
                      ? 'bg-emerald-500 text-black border-emerald-400'
                      : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
                  }`}
                >
                  {airQuality.mistingCannonsActive ? 'ON' : 'OFF'}
                </button>
              </div>

              {/* Action 2: Traffic Diversion Recommendation */}
              <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className={`p-2 rounded-lg border ${
                      airQuality.trafficDiversionRecommended
                        ? 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                        : 'bg-slate-800 border-slate-700 text-slate-500'
                    }`}
                  >
                    <Navigation className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white">Pengalihan Truk & Kendaraan Berat</div>
                    <div className="text-[10px] text-slate-400">Reroute via Jalan Lingkar Luar Kota</div>
                  </div>
                </div>

                <span
                  className={`px-2.5 py-1 rounded text-[10px] font-bold uppercase ${
                    airQuality.trafficDiversionRecommended
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                      : 'bg-slate-800 text-slate-500'
                  }`}
                >
                  {airQuality.trafficDiversionRecommended ? 'DIREKOMENDASIKAN' : 'NORMAL'}
                </span>
              </div>

              {/* Action 3: Public Health Advisory Broadcast */}
              <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-slate-800 border border-slate-700 text-cyan-400">
                    <Wind className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white">Broadcast Aplikasi Warga</div>
                    <div className="text-[10px] text-slate-400">Himbauan penggunaan masker di area industri</div>
                  </div>
                </div>

                <span className="px-2.5 py-1 rounded text-[10px] font-bold bg-slate-800 text-slate-400">
                  SIAP BROADCAST
                </span>
              </div>
            </div>
          </div>

          {/* Master Toggle Mitigation */}
          <div className="mt-4 pt-4 border-t border-slate-800">
            <button
              onClick={toggleAQIMitigation}
              className={`w-full py-2.5 rounded-xl font-bold text-xs border transition-all flex items-center justify-center gap-2 ${
                airQuality.mitigationActive
                  ? 'bg-emerald-500 text-black border-emerald-400 shadow-lg shadow-emerald-500/20'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
              }`}
            >
              <Zap className="w-4 h-4" />
              <span>
                {airQuality.mitigationActive
                  ? 'DEAKTIVASI SISTEM MITIGASI (KEMBALI NORMAL)'
                  : 'AKTIFKAN SISTEM MITIGASI DARURAT SEKARANG'}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Mitigation Action Plan Modal */}
      {isMitigationModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-2xl bg-[#0D1527] border border-cyan-500/40 p-6 shadow-2xl space-y-4">
            <div className="flex items-start justify-between pb-3 border-b border-slate-800">
              <div>
                <span className="text-[10px] font-mono font-bold text-cyan-400 uppercase tracking-wider">
                  SOP Standar Operasional Prosedur
                </span>
                <h3 className="text-base font-bold text-white">Mitigasi Polusi Udara Smart City</h3>
              </div>
              <button
                onClick={() => setIsMitigationModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-300">
              <div className="p-3 rounded-lg bg-slate-900 border border-slate-800">
                <div className="font-bold text-cyan-300 mb-1">Tahap 1: Pengaktifan Misting Cannon Otomatis</div>
                <p className="text-slate-400">
                  ESP32 Air Station mengirim sinyal MQTT untuk menyalakan relay pompa air bertekanan tinggi guna menurunkan partikulat PM2.5 di udara terbuka.
                </p>
              </div>

              <div className="p-3 rounded-lg bg-slate-900 border border-slate-800">
                <div className="font-bold text-amber-300 mb-1">Tahap 2: Rekayasa Lalu Lintas & Reroute</div>
                <p className="text-slate-400">
                  Variable Message Sign (VMS) digital menginstruksikan truk angkutan berat untuk melewati jalur lingkar luar, mengurangi penumpukan emisi NOx.
                </p>
              </div>

              <div className="p-3 rounded-lg bg-slate-900 border border-slate-800">
                <div className="font-bold text-emerald-300 mb-1">Tahap 3: Pemantauan Normalisasi</div>
                <p className="text-slate-400">
                  Ketika sensor MQ-135 / PMS5003 mendeteksi AQI &lt; 80 selama 15 menit berturut-turut, status darurat otomatis dicabut.
                </p>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-800 flex justify-end">
              <button
                onClick={() => setIsMitigationModalOpen(false)}
                className="px-4 py-2 rounded-lg bg-cyan-500 text-white font-semibold text-xs hover:bg-cyan-600"
              >
                Tutup Panduan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
