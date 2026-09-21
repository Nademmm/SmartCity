'use client';

import React, { useState } from 'react';
import { useSmartCity } from '@/context/SmartCityContext';
import { MetricCard } from '@/components/common/MetricCard';
import {
  BarChart3,
  Calendar,
  Download,
  Zap,
  Navigation,
  Wind,
  ShieldCheck,
  Award,
  TrendingUp,
  Footprints,
  Printer,
  CheckCircle2,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';

const TIMEFRAME_DATA = {
  today: [
    { label: '00:00', traffic: 22, energy: 120, aqi: 45, ped: 40 },
    { label: '04:00', traffic: 15, energy: 110, aqi: 40, ped: 20 },
    { label: '08:00', traffic: 82, energy: 240, aqi: 88, ped: 410 },
    { label: '12:00', traffic: 62, energy: 220, aqi: 76, ped: 250 },
    { label: '16:00', traffic: 78, energy: 290, aqi: 92, ped: 380 },
    { label: '20:00', traffic: 65, energy: 320, aqi: 74, ped: 210 },
  ],
  '7days': [
    { label: 'Senin', traffic: 68, energy: 1420, aqi: 65, ped: 2400 },
    { label: 'Selasa', traffic: 72, energy: 1380, aqi: 70, ped: 2600 },
    { label: 'Rabu', traffic: 75, energy: 1400, aqi: 78, ped: 2550 },
    { label: 'Kamis', traffic: 71, energy: 1390, aqi: 72, ped: 2480 },
    { label: 'Jumat', traffic: 84, energy: 1550, aqi: 85, ped: 3100 },
    { label: 'Sabtu', traffic: 62, energy: 1200, aqi: 58, ped: 2900 },
    { label: 'Minggu', traffic: 48, energy: 1050, aqi: 42, ped: 2200 },
  ],
  '30days': [
    { label: 'M1', traffic: 70, energy: 9200, aqi: 68, ped: 18000 },
    { label: 'M2', traffic: 73, energy: 9100, aqi: 72, ped: 18500 },
    { label: 'M3', traffic: 66, energy: 8800, aqi: 64, ped: 17800 },
    { label: 'M4', traffic: 69, energy: 8950, aqi: 67, ped: 18200 },
  ],
};

export const AnalyticsView: React.FC = () => {
  const { sustainabilityScore } = useSmartCity();
  const [timeframe, setTimeframe] = useState<'today' | '7days' | '30days'>('7days');
  const [isExporting, setIsExporting] = useState<boolean>(false);

  const currentChartData = TIMEFRAME_DATA[timeframe];

  const handlePrint = () => {
    setIsExporting(true);
    setTimeout(() => {
      window.print();
      setIsExporting(false);
    }, 400);
  };

  return (
    <div className="space-y-5">
      {/* Top Header with Filters & Print Button */}
      <div className="glass-panel rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-cyan-400" />
            Historical Telemetry Analytics & City Performance
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Analisis tren lalu lintas, penghematan energi PJU, kualitas udara, dan efisiensi otomasi.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Timeframe selector */}
          <div className="flex items-center gap-1 bg-slate-900/90 p-1 rounded-xl border border-slate-800 text-xs">
            <button
              onClick={() => setTimeframe('today')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                timeframe === 'today' ? 'bg-cyan-500 text-white font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              Hari Ini
            </button>
            <button
              onClick={() => setTimeframe('7days')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                timeframe === '7days' ? 'bg-cyan-500 text-white font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              7 Hari
            </button>
            <button
              onClick={() => setTimeframe('30days')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                timeframe === '30days' ? 'bg-cyan-500 text-white font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              30 Hari
            </button>
          </div>

          <button
            onClick={handlePrint}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-all flex items-center gap-2"
          >
            <Printer className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden sm:inline">Export / Cetak Laporan</span>
          </button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Energy Saved This Month"
          value="4.8"
          unit="MWh"
          statusText="62% Efisiensi"
          statusVariant="success"
          trend={{ value: '+14% vs bulan lalu', direction: 'up', label: 'Hemat Biaya' }}
          icon={<Zap className="w-4 h-4" />}
          footerText="Estimasi Rp 7.200.000,-"
        />

        <MetricCard
          title="Traffic Efficiency"
          value="+28.4%"
          statusText="ATSC Dynamic Flow"
          statusVariant="success"
          trend={{ value: 'Pengurangan Delay', direction: 'down', label: 'Macet' }}
          icon={<Navigation className="w-4 h-4" />}
          footerText="4 Simpang Utama Terkoordinasi"
        />

        <MetricCard
          title="Average City AQI"
          value="64"
          unit="Moderate"
          statusText="Baku Mutu Terpenuhi"
          statusVariant="info"
          trend={{ value: '-8.5 AQI improvement', direction: 'down', label: 'Polusi' }}
          icon={<Wind className="w-4 h-4" />}
          footerText="Kawasan Pusat & Pemukiman"
        />

        <MetricCard
          title="Automation Events"
          value="1,482"
          unit="Actions"
          statusText="100% Autonomous"
          statusVariant="success"
          trend={{ value: 'Zero Incident', direction: 'neutral', label: 'Keamanan' }}
          icon={<ShieldCheck className="w-4 h-4" />}
          footerText="ESP32 IoT Decision Mesh"
        />
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Chart 1: Traffic vs Pedestrian Trends */}
        <div className="glass-panel rounded-2xl p-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                Tren Kepadatan Lalu Lintas (%)
              </h3>
              <p className="text-xs text-slate-400">Pola arus kendaraan berdasarkan rentang waktu terpilih.</p>
            </div>
            <span className="text-xs font-mono text-cyan-400 bg-slate-900 px-2.5 py-1 rounded border border-slate-800">
              Avg: 68%
            </span>
          </div>

          <div className="w-full h-56 mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={currentChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="anTrafficGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#06B6D4" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#06B6D4" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="label" stroke="#64748B" fontSize={11} />
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
                  dataKey="traffic"
                  stroke="#06B6D4"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#anTrafficGrad)"
                  name="Kepadatan (%)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: PJU Energy Consumption (kWh) */}
        <div className="glass-panel rounded-2xl p-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                Konsumsi Energi Lampu PJU (Watt/kWh)
              </h3>
              <p className="text-xs text-slate-400">Penurunan daya berkat algoritma soft dimming adaptif.</p>
            </div>
            <span className="text-xs font-mono text-emerald-400 bg-slate-900 px-2.5 py-1 rounded border border-slate-800">
              -62% Saved
            </span>
          </div>

          <div className="w-full h-56 mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={currentChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="label" stroke="#64748B" fontSize={11} />
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
                <Bar dataKey="energy" fill="#10B981" radius={[4, 4, 0, 0]} name="Konsumsi Daya" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Professional Gamification: City Sustainability Score & Badges */}
      <div className="glass-panel-accent rounded-2xl p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-5 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Award className="w-4 h-4 text-amber-400" />
              <span className="text-xs font-bold uppercase tracking-wider text-amber-300">
                City Sustainability Index
              </span>
            </div>
            <h2 className="text-xl font-bold text-white">Indeks Keberlanjutan Kota Cerdas</h2>
            <p className="text-xs text-slate-400 mt-1 max-w-xl">
              Skor terukur berdasarkan efisiensi energi PJU, manajemen kelancaran lalu lintas ATSC, kualitas udara bersih, dan keselamatan pejalan kaki.
            </p>
          </div>

          {/* Score Badge */}
          <div className="flex items-center gap-4 bg-slate-900/90 p-4 rounded-2xl border border-cyan-500/30 self-start md:self-auto">
            <div className="w-16 h-16 rounded-xl bg-gradient-to-tr from-cyan-600 to-emerald-500 flex items-center justify-center text-2xl font-black text-white shadow-xl shadow-cyan-500/20">
              {sustainabilityScore}
            </div>
            <div>
              <div className="text-xs font-bold text-emerald-400 uppercase tracking-wide">Peringkat: Grade A+</div>
              <div className="text-sm font-bold text-white">Smart Eco City</div>
              <div className="text-[10px] text-slate-400">Target Tahunan: 85+</div>
            </div>
          </div>
        </div>

        {/* City Badges */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-5">
          <div className="p-3.5 rounded-xl bg-slate-900/70 border border-slate-800 flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-bold text-white">Energy Saver</div>
              <div className="text-[10px] text-emerald-400">Efisiensi PJU &gt; 60% Tercapai</div>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-900/70 border border-slate-800 flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
              <Wind className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-bold text-white">Clean Air Guardian</div>
              <div className="text-[10px] text-cyan-400">Mitigasi Cepat &lt; 3 Menit</div>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-900/70 border border-slate-800 flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
              <Navigation className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-bold text-white">Traffic Master</div>
              <div className="text-[10px] text-amber-400">ATSC Urai Macet Otomatis</div>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-900/70 border border-slate-800 flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-500/20 text-blue-400 border border-blue-500/30">
              <Footprints className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-bold text-white">Smart Mobility</div>
              <div className="text-[10px] text-blue-400">Zero Incident Penyeberangan</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
