'use client';

import React, { useState } from 'react';
import { useSmartCity } from '@/context/SmartCityContext';
import { MetricCard } from '@/components/common/MetricCard';
import {
  Navigation,
  Wind,
  Lightbulb,
  Footprints,
  ShieldCheck,
  Cpu,
  Bell,
  Zap,
  Radio,
  SlidersHorizontal,
  ChevronRight,
  Maximize2,
} from 'lucide-react';
import { IoTDevice } from '@/types/iot';

export const OverviewView: React.FC = () => {
  const {
    intersections,
    pjuNodes,
    pedestrians,
    airQuality,
    devices,
    alerts,
    rules,
    eventLogs,
    sustainabilityScore,
    setSelectedDeviceForInspection,
    setActiveSubsystem,
  } = useSmartCity();

  const [mapFilter, setMapFilter] = useState<'all' | 'traffic' | 'lighting' | 'air' | 'pedestrian'>('all');

  // Calculate aggregates
  const avgTrafficDensity = Math.round(
    intersections.reduce((acc, curr) => acc + curr.density, 0) / (intersections.length || 1)
  );
  const avgPjuBrightness = Math.round(
    pjuNodes.reduce((acc, curr) => acc + curr.brightness, 0) / (pjuNodes.length || 1)
  );
  const totalPedestrians = pedestrians.reduce((acc, curr) => acc + curr.pedestrianCount, 0);
  const activeAlertsCount = alerts.filter((a) => !a.isResolved).length;
  const onlineDevicesCount = devices.filter((d) => d.status === 'Online').length;
  const activeRulesCount = rules.filter((r) => r.isEnabled).length;

  const handleDeviceClick = (devId: string) => {
    const found = devices.find((d) => d.id === devId);
    if (found) {
      setSelectedDeviceForInspection(found);
    }
  };

  return (
    <div className="space-y-5">
      {/* Top City Status Banner */}
      <div className="glass-panel-accent rounded-2xl p-5 relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-gradient-to-l from-cyan-500/10 to-transparent pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                VIRTUAL COMMAND CENTER ACTIVE
              </span>
              <span className="text-xs text-slate-400">Autonomous Mesh Grid</span>
            </div>
            <h1 className="text-2xl lg:text-3xl font-black text-white tracking-tight">
              CITY STATUS: <span className="text-emerald-400">OPTIMAL</span>
            </h1>
            <p className="text-xs text-slate-300 mt-1 max-w-2xl">
              Seluruh sistem IoT terhubung secara real-time. Otomasi Adaptive Traffic Signal Control, PJU Smart Dimming, dan Pelican Crossing berjalan normal.
            </p>
          </div>

          {/* Quick Metrics Badges */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 flex flex-col justify-between">
              <span className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" /> Sustainability
              </span>
              <div className="text-xl font-black text-white mt-1">
                {sustainabilityScore}<span className="text-xs text-cyan-400 font-normal">/100</span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 flex flex-col justify-between">
              <span className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1">
                <Cpu className="w-3.5 h-3.5 text-emerald-400" /> Active IoT
              </span>
              <div className="text-xl font-black text-emerald-400 mt-1">
                {onlineDevicesCount}<span className="text-xs text-slate-400 font-normal">/{devices.length}</span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 flex flex-col justify-between">
              <span className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1">
                <Bell className="w-3.5 h-3.5 text-amber-400" /> Active Alerts
              </span>
              <div className="text-xl font-black text-amber-400 mt-1">
                {activeAlertsCount}
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 flex flex-col justify-between">
              <span className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1">
                <Zap className="w-3.5 h-3.5 text-cyan-400" /> Automation
              </span>
              <div className="text-xl font-black text-cyan-300 mt-1">
                {activeRulesCount} ON
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Traffic Density"
          value={`${avgTrafficDensity}%`}
          statusText={avgTrafficDensity > 70 ? 'Busy (Padat)' : 'Normal'}
          statusVariant={avgTrafficDensity > 70 ? 'danger' : 'success'}
          trend={{ value: '+4.2% vs baseline', direction: avgTrafficDensity > 65 ? 'up' : 'down', label: '1 jam lalu' }}
          icon={<Navigation className="w-4 h-4" />}
          footerText="4 Simpang Utama Dipantau"
          onClick={() => setActiveSubsystem('traffic')}
        />

        <MetricCard
          title="Air Quality"
          value={`AQI ${airQuality.aqi}`}
          statusText={airQuality.status}
          statusVariant={airQuality.aqi > 100 ? 'danger' : airQuality.aqi > 50 ? 'warning' : 'success'}
          trend={{ value: `${airQuality.pm25} µg/m³ PM2.5`, direction: 'neutral', label: 'PM2.5' }}
          icon={<Wind className="w-4 h-4" />}
          footerText="Kawasan Pusat & Industri"
          onClick={() => setActiveSubsystem('air-quality')}
        />

        <MetricCard
          title="Street Lighting"
          value={`${avgPjuBrightness}%`}
          statusText="Adaptive Eco Mode"
          statusVariant="info"
          trend={{ value: '62% Hemat Energi', direction: 'down', label: 'vs konvensional' }}
          icon={<Lightbulb className="w-4 h-4" />}
          footerText="8 Tiang Lampu Terhubung"
          onClick={() => setActiveSubsystem('lighting')}
        />

        <MetricCard
          title="Pedestrian Activity"
          value={`${totalPedestrians}`}
          unit="orang/jam"
          statusText="2 Pelican Aktif"
          statusVariant="neutral"
          trend={{ value: 'Normal Flow', direction: 'neutral', label: 'Zona Sekolah' }}
          icon={<Footprints className="w-4 h-4" />}
          footerText="SMAN 1 & Mall Central"
          onClick={() => setActiveSubsystem('pedestrian')}
        />
      </div>

      {/* Interactive Map & Live Event Feed Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Main Live Vector City Map */}
        <div className="lg:col-span-8 glass-panel rounded-2xl p-5 flex flex-col justify-between">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping" />
                <h2 className="text-base font-bold text-white tracking-tight">LIVE SPATIAL CITY MAP</h2>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Klik pada marker sensor/perangkat untuk membuka inspeksi telemetri real-time.
              </p>
            </div>

            {/* Map Filters */}
            <div className="flex items-center gap-1 bg-slate-900/90 p-1 rounded-lg border border-slate-800 text-[11px]">
              <button
                onClick={() => setMapFilter('all')}
                className={`px-2.5 py-1 rounded font-medium transition-all ${
                  mapFilter === 'all' ? 'bg-cyan-500 text-white font-bold' : 'text-slate-400 hover:text-white'
                }`}
              >
                Semua
              </button>
              <button
                onClick={() => setMapFilter('traffic')}
                className={`px-2.5 py-1 rounded font-medium transition-all ${
                  mapFilter === 'traffic' ? 'bg-cyan-500 text-white font-bold' : 'text-slate-400 hover:text-white'
                }`}
              >
                Traffic
              </button>
              <button
                onClick={() => setMapFilter('lighting')}
                className={`px-2.5 py-1 rounded font-medium transition-all ${
                  mapFilter === 'lighting' ? 'bg-cyan-500 text-white font-bold' : 'text-slate-400 hover:text-white'
                }`}
              >
                PJU
              </button>
              <button
                onClick={() => setMapFilter('air')}
                className={`px-2.5 py-1 rounded font-medium transition-all ${
                  mapFilter === 'air' ? 'bg-cyan-500 text-white font-bold' : 'text-slate-400 hover:text-white'
                }`}
              >
                AQI
              </button>
            </div>
          </div>

          {/* SVG Vector City Map Canvas */}
          <div className="relative w-full aspect-[16/10] bg-[#070D1A] rounded-xl my-4 overflow-hidden border border-slate-800 flex items-center justify-center">
            {/* Grid Pattern */}
            <svg className="absolute inset-0 w-full h-full" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                  <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(56, 189, 248, 0.05)" strokeWidth="1" />
                </pattern>
                <radialGradient id="airHeat" cx="80%" cy="25%" r="35%">
                  <stop offset="0%" stopColor={airQuality.aqi > 100 ? 'rgba(239, 68, 68, 0.25)' : 'rgba(245, 158, 11, 0.15)'} />
                  <stop offset="100%" stopColor="rgba(0,0,0,0)" />
                </radialGradient>
              </defs>
              <rect width="100%" height="100%" fill="url(#grid)" />
              <rect width="100%" height="100%" fill="url(#airHeat)" />

              {/* Roads Network */}
              {/* Horizontal Arterial Road 1 */}
              <rect x="0" y="32%" width="100%" height="32" fill="#0E172B" />
              <line x1="0" y1="35%" x2="100%" y2="35%" stroke="#38BDF8" strokeWidth="1.5" strokeDasharray="8 6" opacity="0.4" />
              
              {/* Horizontal Arterial Road 2 */}
              <rect x="0" y="70%" width="100%" height="28" fill="#0E172B" />
              <line x1="0" y1="72.5%" x2="100%" y2="72.5%" stroke="#38BDF8" strokeWidth="1.5" strokeDasharray="8 6" opacity="0.4" />

              {/* Vertical Arterial Road 1 */}
              <rect x="26%" y="0" width="30" height="100%" fill="#0E172B" />
              <line x1="28.5%" y1="0" x2="28.5%" y2="100%" stroke="#38BDF8" strokeWidth="1.5" strokeDasharray="8 6" opacity="0.4" />

              {/* Vertical Arterial Road 2 */}
              <rect x="68%" y="0" width="30" height="100%" fill="#0E172B" />
              <line x1="70.5%" y1="0" x2="70.5%" y2="100%" stroke="#38BDF8" strokeWidth="1.5" strokeDasharray="8 6" opacity="0.4" />

              {/* Central Roundabout / Bundaran */}
              <circle cx="28.5%" cy="35%" r="36" fill="#0E172B" stroke="rgba(56, 189, 248, 0.3)" strokeWidth="2" />
              <circle cx="28.5%" cy="35%" r="16" fill="#080E1B" stroke="#10B981" strokeWidth="1.5" />

              {/* District Labels */}
              <text x="10%" y="15%" fill="#64748B" fontSize="11" fontWeight="bold" letterSpacing="1">ZONA PUSAT PEMERINTAHAN</text>
              <text x="75%" y="15%" fill="#64748B" fontSize="11" fontWeight="bold" letterSpacing="1">KAWASAN INDUSTRI TIMUR</text>
              <text x="10%" y="88%" fill="#64748B" fontSize="11" fontWeight="bold" letterSpacing="1">BOULEVARD RESIDENTIAL</text>
              <text x="65%" y="88%" fill="#64748B" fontSize="11" fontWeight="bold" letterSpacing="1">SMART TECHNO PARK</text>
            </svg>

            {/* Interactive Markers Overlay */}
            {/* 1. Traffic Intersection Nodes */}
            {(mapFilter === 'all' || mapFilter === 'traffic') && (
              <>
                <button
                  onClick={() => handleDeviceClick('ESP32-001')}
                  className="absolute left-[28.5%] top-[35%] -translate-x-1/2 -translate-y-1/2 group cursor-pointer"
                  title="Simpang Bundaran Merdeka (Klik untuk inspeksi)"
                >
                  <div className="relative">
                    <span className="absolute -inset-2 rounded-full bg-emerald-400/30 animate-ping" />
                    <div className="w-8 h-8 rounded-full bg-slate-900 border-2 border-emerald-400 flex items-center justify-center text-emerald-400 shadow-lg shadow-emerald-500/20 group-hover:scale-125 transition-transform">
                      <Navigation className="w-4 h-4" />
                    </div>
                  </div>
                  <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 whitespace-nowrap bg-slate-900/90 text-[10px] font-mono font-bold text-white px-1.5 py-0.5 rounded border border-slate-700">
                    Simpang Merdeka ({intersections[0].density}%)
                  </span>
                </button>

                <button
                  onClick={() => handleDeviceClick('ESP32-007')}
                  className="absolute left-[70.5%] top-[35%] -translate-x-1/2 -translate-y-1/2 group cursor-pointer"
                  title="Simpang Veteran Utara (Klik untuk inspeksi)"
                >
                  <div className="relative">
                    <span className="absolute -inset-2 rounded-full bg-rose-400/30 animate-ping" />
                    <div className="w-8 h-8 rounded-full bg-slate-900 border-2 border-rose-400 flex items-center justify-center text-rose-400 shadow-lg shadow-rose-500/20 group-hover:scale-125 transition-transform">
                      <Navigation className="w-4 h-4" />
                    </div>
                  </div>
                  <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 whitespace-nowrap bg-slate-900/90 text-[10px] font-mono font-bold text-rose-300 px-1.5 py-0.5 rounded border border-rose-500/40">
                    Simpang Veteran ({intersections[1].density}%)
                  </span>
                </button>
              </>
            )}

            {/* 2. PJU Nodes */}
            {(mapFilter === 'all' || mapFilter === 'lighting') &&
              pjuNodes.map((pju) => (
                <button
                  key={pju.id}
                  onClick={() => handleDeviceClick('ESP32-002')}
                  style={{ left: `${pju.coordinates.x}%`, top: `${pju.coordinates.y}%` }}
                  className="absolute -translate-x-1/2 -translate-y-1/2 group cursor-pointer"
                  title={`${pju.name}: ${pju.brightness}% Brightness`}
                >
                  <div className="relative">
                    {pju.brightness > 50 && (
                      <span
                        className="absolute -inset-3 rounded-full bg-amber-400/25 animate-pulse"
                        style={{ transform: `scale(${pju.brightness / 70})` }}
                      />
                    )}
                    <div
                      className={`w-6 h-6 rounded-full flex items-center justify-center border transition-all ${
                        pju.brightness > 50
                          ? 'bg-amber-500/20 border-amber-400 text-amber-300'
                          : 'bg-slate-900 border-slate-700 text-slate-500'
                      }`}
                    >
                      <Lightbulb className="w-3 h-3" />
                    </div>
                  </div>
                </button>
              ))}

            {/* 3. Air Quality Sensor */}
            {(mapFilter === 'all' || mapFilter === 'air') && (
              <button
                onClick={() => handleDeviceClick('ESP32-003')}
                className="absolute left-[82%] top-[22%] -translate-x-1/2 -translate-y-1/2 group cursor-pointer"
                title="Air Quality Sensor Industri (Klik untuk inspeksi)"
              >
                <div className="relative">
                  <span className="absolute -inset-2 rounded-full bg-amber-400/30 animate-ping" />
                  <div className="w-7 h-7 rounded-full bg-slate-900 border-2 border-amber-400 flex items-center justify-center text-amber-400 group-hover:scale-125 transition-transform">
                    <Wind className="w-3.5 h-3.5" />
                  </div>
                </div>
                <span className="absolute -bottom-5 left-1/2 -translate-x-1/2 whitespace-nowrap bg-slate-900/90 text-[10px] font-mono font-bold text-amber-300 px-1 py-0.5 rounded border border-amber-500/40">
                  AQI {airQuality.aqi}
                </span>
              </button>
            )}

            {/* 4. Pedestrian Crossing */}
            {(mapFilter === 'all' || mapFilter === 'pedestrian') && (
              <button
                onClick={() => handleDeviceClick('ESP32-004')}
                className="absolute left-[45%] top-[35%] -translate-x-1/2 -translate-y-1/2 group cursor-pointer"
                title="Smart Pelican Crossing SMAN 1"
              >
                <div className="relative">
                  <div className="w-7 h-7 rounded-full bg-slate-900 border-2 border-cyan-400 flex items-center justify-center text-cyan-300 group-hover:scale-125 transition-transform">
                    <Footprints className="w-3.5 h-3.5" />
                  </div>
                </div>
                <span className="absolute -bottom-5 left-1/2 -translate-x-1/2 whitespace-nowrap bg-slate-900/90 text-[9px] font-mono font-bold text-cyan-300 px-1 py-0.5 rounded border border-slate-700">
                  Pelican ({pedestrians[0].pelicanState})
                </span>
              </button>
            )}

            {/* 5. Core IoT Gateway Node */}
            <button
              onClick={() => handleDeviceClick('ESP32-005')}
              className="absolute left-[50%] top-[50%] -translate-x-1/2 -translate-y-1/2 group cursor-pointer"
              title="ESP32 Urban Core Gateway LoRa"
            >
              <div className="w-8 h-8 rounded-lg bg-blue-600/30 border-2 border-blue-400 flex items-center justify-center text-blue-300 shadow-xl group-hover:scale-125 transition-transform">
                <Radio className="w-4 h-4" />
              </div>
            </button>
          </div>

          {/* Map Legend */}
          <div className="pt-3 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3 text-[11px] text-slate-400">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" /> Normal / Optimal
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400" /> Warning (Perhatian)
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500" /> Critical / Macet
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500" /> IoT Gateway Master
              </span>
            </div>

            <div className="font-mono text-cyan-400 text-[10px]">Mesh Telemetry Protocol: MQTT v3.1.1</div>
          </div>
        </div>

        {/* Right Side: Live Autonomous Activity & Event Feed */}
        <div className="lg:col-span-4 glass-panel rounded-2xl p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-cyan-400" />
                <h2 className="text-sm font-bold text-white tracking-tight uppercase">Live System Activity</h2>
              </div>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-mono">
                Real-Time
              </span>
            </div>

            <div className="mt-3 space-y-3 max-h-[460px] overflow-y-auto pr-1">
              {eventLogs.slice(0, 7).map((log) => (
                <div
                  key={log.id}
                  className="p-3 rounded-xl bg-slate-900/70 border border-slate-800/90 text-xs hover:border-slate-700 transition-colors"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-mono text-cyan-400 bg-cyan-500/10 px-1.5 py-0.5 rounded">
                      {log.timestamp}
                    </span>
                    <span
                      className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${
                        log.type === 'AUTO'
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : log.type === 'MANUAL'
                          ? 'bg-blue-500/20 text-blue-300'
                          : 'bg-slate-700 text-slate-300'
                      }`}
                    >
                      {log.type}
                    </span>
                  </div>
                  <div className="font-semibold text-slate-200">{log.event}</div>
                  <div className="text-[11px] text-slate-400 mt-0.5">{log.details}</div>
                </div>
              ))}
            </div>
          </div>

          <button
            onClick={() => setActiveSubsystem('automation')}
            className="w-full mt-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs border border-slate-700 transition-all flex items-center justify-center gap-2"
          >
            <span>Buka Autonomous Decision System</span>
            <ChevronRight className="w-4 h-4 text-cyan-400" />
          </button>
        </div>
      </div>
    </div>
  );
};
