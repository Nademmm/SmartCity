'use client';

import React, { useState } from 'react';
import { useSmartCity } from '@/context/SmartCityContext';
import { MetricCard } from '@/components/common/MetricCard';
import { TerminalConsole } from '@/components/common/TerminalConsole';
import {
  Cpu,
  Radio,
  Search,
  CheckCircle2,
  Server,
  Zap,
} from 'lucide-react';

export const IoTDevicesView: React.FC = () => {
  const { devices, lastTelemetryTimestamp, isHardwareConnected, isCameraConnected } = useSmartCity();
  const [searchQuery, setSearchQuery] = useState<string>('');

  const filteredDevices = devices.filter((device) => {
    return (
      device.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      device.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      device.pinout.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  return (
    <div className="space-y-5">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Total Modul Terdaftar"
          value={devices.length}
          unit="Node / Sensor"
          statusText="Konfigurasi Nyata"
          statusVariant="info"
          icon={<Cpu className="w-4 h-4" />}
          footerText="1 Miniatur + 1 AI Cam + 3 Sensor"
        />

        <MetricCard
          title="Status Miniatur"
          value={isHardwareConnected ? 'ONLINE' : 'OFFLINE'}
          statusText={isHardwareConnected ? 'ESP32 Terhubung' : 'Belum Terhubung ke PC'}
          statusVariant={isHardwareConnected ? 'success' : 'danger'}
          icon={<CheckCircle2 className="w-4 h-4" />}
          footerText="ESP32 MicroPython Thonny"
        />

        <MetricCard
          title="Kamera AI YOLO11"
          value={isCameraConnected ? 'AKTIF' : 'STANDBY'}
          statusText={isCameraConnected ? 'Live Stream Port 8088' : 'Menunggu Feed Python'}
          statusVariant={isCameraConnected ? 'success' : 'neutral'}
          icon={<Server className="w-4 h-4" />}
          footerText="Computer Vision OpenCV"
        />

        <MetricCard
          title="Sinkronisasi Telemetri"
          value={lastTelemetryTimestamp || 'Menunggu'}
          statusText="Endpoint /api/iot/telemetry"
          statusVariant={isHardwareConnected ? 'success' : 'neutral'}
          icon={<Radio className="w-4 h-4" />}
          footerText="Metode HTTP POST JSON"
        />
      </div>

      {/* Filter and Search Bar */}
      <div className="glass-panel rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-2 bg-slate-900/90 border border-slate-800 rounded-xl px-3 py-2 flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Cari Device ID, nama sensor, atau nomor pin..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-transparent text-xs text-white placeholder-slate-500 focus:outline-none w-full"
          />
        </div>

        <div className="text-xs text-slate-400 font-mono">
          Menampilkan {filteredDevices.length} dari {devices.length} Perangkat Terdaftar
        </div>
      </div>

      {/* Main Grid: Hardware Devices Table & Terminal Output */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left: Hardware Devices Table */}
        <div className="lg:col-span-7 glass-panel rounded-2xl overflow-hidden border border-slate-800 flex flex-col justify-between">
          <div>
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Cpu className="w-4 h-4 text-cyan-400" />
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                  Daftar Perangkat Fisik & Pemetaan Pin ESP32
                </h3>
              </div>
              <span className="text-xs font-mono text-cyan-400">Firmware: MicroPython</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-900/60 text-slate-400 font-mono text-[11px] uppercase">
                    <th className="py-3 px-4">Device ID</th>
                    <th className="py-3 px-4">Nama Perangkat</th>
                    <th className="py-3 px-4">Pemetaan Pin</th>
                    <th className="py-3 px-4">Koneksi</th>
                    <th className="py-3 px-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filteredDevices.map((dev) => (
                    <tr key={dev.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-cyan-400">{dev.id}</td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-white">{dev.name}</div>
                        <div className="text-[10px] text-slate-400">{dev.description}</div>
                      </td>
                      <td className="py-3 px-4 font-mono text-amber-300 bg-slate-900/50 rounded">{dev.pinout}</td>
                      <td className="py-3 px-4 font-mono text-slate-400">{dev.connectionType}</td>
                      <td className="py-3 px-4">
                        {dev.status === 'Online' ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                            Online
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                            Offline (Terputus)
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="p-4 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
            <span>Total GPIO Terpakai: 10 Pin</span>
            <span className="font-mono text-cyan-400">Baud Rate: 115200</span>
          </div>
        </div>

        {/* Right: Full Terminal Output Stream */}
        <div className="lg:col-span-5">
          <TerminalConsole
            filterFeature="all"
            title="Live Thonny Serial Diagnostic"
            maxHeight="max-h-[460px]"
          />
        </div>
      </div>
    </div>
  );
};
