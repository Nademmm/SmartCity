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
  Video,
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
    <div className="space-y-4">
      {/* 4 Telemetry Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <MetricCard
          title="Modul Miniatur Terdaftar"
          value={devices.length}
          unit="Node"
          statusText="Konfigurasi Aktif"
          statusVariant="info"
          icon={<Cpu className="w-4 h-4" />}
          footerText="ESP32 Miniatur dan Sensor Fisik"
        />

        <MetricCard
          title="Status Board ESP32"
          value={isHardwareConnected ? 'TERHUBUNG' : 'STANDBY'}
          statusText={isHardwareConnected ? 'Online' : 'Offline'}
          statusVariant={isHardwareConnected ? 'success' : 'neutral'}
          icon={<CheckCircle2 className="w-4 h-4" />}
          footerText="Firmware MicroPython Thonny"
        />

        <MetricCard
          title="Kamera AI Komputer"
          value={isCameraConnected ? 'AKTIF' : 'STANDBY'}
          statusText={isCameraConnected ? 'Terhubung' : 'Siap'}
          statusVariant={isCameraConnected ? 'success' : 'neutral'}
          icon={<Video className="w-4 h-4" />}
          footerText="Webcam Laptop Langsung"
        />

        <MetricCard
          title="Sinkronisasi Telemetri"
          value={lastTelemetryTimestamp || 'Menunggu'}
          statusText="Polling Aktif"
          statusVariant={isHardwareConnected ? 'success' : 'neutral'}
          icon={<Radio className="w-4 h-4" />}
          footerText="Format Payload JSON"
        />
      </div>

      {/* Filter and Search Bar */}
      <div className="rounded-xl bg-slate-900/60 border border-slate-800/80 p-3.5 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-500" />
          <input
            type="text"
            placeholder="Cari ID perangkat, nama sensor, atau nomor pin..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-transparent text-xs text-white placeholder-slate-500 focus:outline-none w-full"
          />
        </div>

        <p className="text-slate-400 font-mono text-[11px]">
          {filteredDevices.length} dari {devices.length} Perangkat Terdaftar
        </p>
      </div>

      {/* Main Grid: Devices Table & Terminal Output */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Hardware Devices Table */}
        <div className="lg:col-span-7 rounded-xl bg-slate-900/60 border border-slate-800/80 overflow-hidden flex flex-col justify-between">
          <div>
            <div className="p-3.5 border-b border-slate-800/80 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Cpu className="w-4 h-4 text-slate-400" />
                <h3 className="text-xs font-semibold text-white uppercase tracking-wider">
                  Daftar Perangkat Fisik dan Pinout ESP32
                </h3>
              </div>
              <p className="text-[11px] font-mono text-slate-400">MicroPython</p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-950/60 text-slate-400 font-mono text-[11px]">
                    <th className="py-2.5 px-3.5">Device ID</th>
                    <th className="py-2.5 px-3.5">Perangkat</th>
                    <th className="py-2.5 px-3.5">Pemetaan Pin</th>
                    <th className="py-2.5 px-3.5">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  {filteredDevices.map((dev) => (
                    <tr key={dev.id} className="hover:bg-slate-900/50 transition-colors">
                      <td className="py-2.5 px-3.5 font-mono text-cyan-400 font-medium">{dev.id}</td>
                      <td className="py-2.5 px-3.5">
                        <p className="font-medium text-white">{dev.name}</p>
                        <p className="text-[10px] text-slate-400 line-clamp-1">{dev.description}</p>
                      </td>
                      <td className="py-2.5 px-3.5 font-mono text-slate-300 text-[11px]">{dev.pinout}</td>
                      <td className="py-2.5 px-3.5">
                        <div
                          className={`inline-flex px-2 py-0.5 rounded text-[10px] font-medium border ${
                            dev.status === 'Online'
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25'
                              : 'bg-slate-800/40 text-slate-400 border-slate-700/50'
                          }`}
                        >
                          {dev.status}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="p-3.5 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
            <p>Total GPIO Digunakan: 10 Pin</p>
            <p className="font-mono text-slate-400">Baud Rate: 115200</p>
          </div>
        </div>

        {/* Live Terminal Output Stream */}
        <div className="lg:col-span-5">
          <TerminalConsole
            filterFeature="all"
            title="Thonny Serial Diagnostic"
            maxHeight="max-h-[460px]"
          />
        </div>
      </div>
    </div>
  );
};
