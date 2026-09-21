'use client';

import React, { useState } from 'react';
import { useSmartCity } from '@/context/SmartCityContext';
import { MetricCard } from '@/components/common/MetricCard';
import {
  Cpu,
  Radio,
  Wifi,
  RotateCw,
  Eye,
  Sliders,
  Power,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  Server,
  Zap,
} from 'lucide-react';
import { DeviceType, DeviceStatus } from '@/types/iot';

export const IoTDevicesView: React.FC = () => {
  const {
    devices,
    setSelectedDeviceForInspection,
    restartIoTDevice,
    pingIoTDevice,
  } = useSmartCity();

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Filter logic
  const filteredDevices = devices.filter((device) => {
    const matchesSearch =
      device.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      device.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      device.location.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesType = typeFilter === 'ALL' || device.type === typeFilter;
    const matchesStatus = statusFilter === 'ALL' || device.status === statusFilter;

    return matchesSearch && matchesType && matchesStatus;
  });

  const onlineCount = devices.filter((d) => d.status === 'Online').length;
  const warningCount = devices.filter((d) => d.status === 'Warning').length;
  const avgSignal = Math.round(
    devices.reduce((acc, curr) => acc + curr.signalRssi, 0) / (devices.length || 1)
  );

  return (
    <div className="space-y-5">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Total IoT Nodes"
          value={`${devices.length}`}
          unit="Nodes"
          statusText="ESP32 Mesh Topology"
          statusVariant="info"
          icon={<Cpu className="w-4 h-4" />}
          footerText="Protocol: MQTT v3.1.1 JSON"
        />

        <MetricCard
          title="Online Telemetry"
          value={`${onlineCount}/${devices.length}`}
          statusText={`${Math.round((onlineCount / devices.length) * 100)}% Avail`}
          statusVariant="success"
          icon={<CheckCircle2 className="w-4 h-4" />}
          footerText="Heartbeat interval: 3 detik"
        />

        <MetricCard
          title="Average Signal RSSI"
          value={`${avgSignal}%`}
          statusText="Strong Mesh Link"
          statusVariant="success"
          icon={<Wifi className="w-4 h-4" />}
          footerText="WiFi 2.4GHz / LoRa WAN"
        />

        <MetricCard
          title="Gateway Core Health"
          value="100%"
          statusText="Master Online"
          statusVariant="success"
          icon={<Server className="w-4 h-4" />}
          footerText="IP: 192.168.10.1 (Broker Local)"
        />
      </div>

      {/* Filter and Search Bar */}
      <div className="glass-panel rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-2 bg-slate-900/90 border border-slate-800 rounded-xl px-3 py-2 flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Cari Device ID, nama, atau lokasi jalan..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-transparent text-xs text-white placeholder-slate-500 focus:outline-none w-full"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          {/* Type Filter */}
          <div className="flex items-center gap-1.5 bg-slate-900/90 border border-slate-800 rounded-xl p-1">
            <span className="text-slate-400 text-[11px] pl-2">Tipe:</span>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="bg-transparent text-slate-200 text-xs font-semibold focus:outline-none cursor-pointer pr-2"
            >
              <option value="ALL" className="bg-slate-900">Semua Tipe</option>
              <option value="Traffic Sensor" className="bg-slate-900">Traffic Sensor</option>
              <option value="PJU Sensor" className="bg-slate-900">PJU Sensor</option>
              <option value="Air Sensor" className="bg-slate-900">Air Sensor</option>
              <option value="Pedestrian Radar" className="bg-slate-900">Pedestrian Radar</option>
              <option value="IoT Gateway" className="bg-slate-900">IoT Gateway</option>
            </select>
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-1.5 bg-slate-900/90 border border-slate-800 rounded-xl p-1">
            <span className="text-slate-400 text-[11px] pl-2">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-transparent text-slate-200 text-xs font-semibold focus:outline-none cursor-pointer pr-2"
            >
              <option value="ALL" className="bg-slate-900">Semua Status</option>
              <option value="Online" className="bg-slate-900">Online</option>
              <option value="Warning" className="bg-slate-900">Warning</option>
              <option value="Offline" className="bg-slate-900">Offline</option>
              <option value="Maintenance" className="bg-slate-900">Maintenance</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Hardware Devices Table */}
      <div className="glass-panel rounded-2xl overflow-hidden border border-slate-800">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Cpu className="w-4 h-4 text-cyan-400" />
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              Daftar Perangkat Hardware ESP32 & Node Sensor
            </h3>
          </div>
          <span className="text-xs font-mono text-slate-400">
            Menampilkan {filteredDevices.length} dari {devices.length} Perangkat
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-900/60 text-slate-400 font-mono text-[11px] uppercase">
                <th className="py-3 px-4">Device ID</th>
                <th className="py-3 px-4">Tipe Hardware</th>
                <th className="py-3 px-4">Lokasi Lapangan</th>
                <th className="py-3 px-4">Status Node</th>
                <th className="py-3 px-4">Signal RSSI</th>
                <th className="py-3 px-4">Last Update</th>
                <th className="py-3 px-4 text-right">Aksi Operator</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredDevices.map((dev) => (
                <tr
                  key={dev.id}
                  className="hover:bg-slate-800/40 transition-colors group"
                >
                  <td className="py-3 px-4 font-mono font-bold text-cyan-400">
                    {dev.id}
                  </td>
                  <td className="py-3 px-4">
                    <div className="font-semibold text-white">{dev.name}</div>
                    <div className="text-[10px] text-slate-400 font-mono">{dev.mqttTopic}</div>
                  </td>
                  <td className="py-3 px-4 text-slate-300">
                    {dev.location}
                  </td>
                  <td className="py-3 px-4">
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        dev.status === 'Online'
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : dev.status === 'Warning'
                          ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                          : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                      }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          dev.status === 'Online' ? 'bg-emerald-400' : 'bg-amber-400'
                        }`}
                      />
                      {dev.status}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <div className="w-16 bg-slate-800 h-1.5 rounded-full overflow-hidden">
                        <div
                          className="bg-cyan-400 h-full rounded-full"
                          style={{ width: `${dev.signalRssi}%` }}
                        />
                      </div>
                      <span className="font-mono text-[11px] text-slate-300">{dev.signalRssi}%</span>
                    </div>
                  </td>
                  <td className="py-3 px-4 font-mono text-slate-400">
                    {dev.lastPing}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => setSelectedDeviceForInspection(dev)}
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-slate-700 transition-colors"
                        title="Buka Inspeksi Telemetri"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => pingIoTDevice(dev.id)}
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
                        title="Ping Node"
                      >
                        <Radio className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => restartIoTDevice(dev.id)}
                        className="p-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 transition-colors"
                        title="Soft Reboot ESP32"
                      >
                        <RotateCw className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
