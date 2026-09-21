'use client';

import React, { useState } from 'react';
import { useSmartCity } from '@/context/SmartCityContext';
import { X, Wifi, Cpu, Radio, RotateCw, CheckCircle2, AlertTriangle, Copy, Check } from 'lucide-react';

export const DeviceInspectorDrawer: React.FC = () => {
  const { selectedDeviceForInspection, setSelectedDeviceForInspection, restartIoTDevice, pingIoTDevice } = useSmartCity();
  const [copied, setCopied] = useState(false);

  if (!selectedDeviceForInspection) return null;

  const device = selectedDeviceForInspection;

  const mockPayload = {
    deviceId: device.id,
    type: device.type,
    location: device.location,
    firmware: device.firmwareVersion,
    telemetry: {
      rssi: `${device.signalRssi}%`,
      battery: device.isMainsPowered ? 'Mains Power (AC 220V)' : `${device.batteryLevel}%`,
      lastPing: device.lastPing,
      ip: device.ipAddress,
      status: device.status,
    },
    mqtt: {
      broker: 'mqtt.urbanpulse.smartcity.id:8883',
      topic: device.mqttTopic,
      qos: 1,
    },
    timestamp: new Date().toISOString(),
  };

  const handleCopyPayload = () => {
    navigator.clipboard.writeText(JSON.stringify(mockPayload, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full max-w-md bg-[#0c1426]/95 backdrop-blur-xl border-l border-cyan-500/30 shadow-2xl p-6 flex flex-col justify-between overflow-y-auto">
      <div>
        {/* Header */}
        <div className="flex items-start justify-between pb-4 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                {device.type}
              </span>
              <span
                className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                  device.status === 'Online'
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                }`}
              >
                {device.status}
              </span>
            </div>
            <h2 className="text-lg font-bold text-white mt-1.5">{device.name}</h2>
            <p className="text-xs text-slate-400 font-mono">{device.id} • {device.location}</p>
          </div>
          <button
            onClick={() => setSelectedDeviceForInspection(null)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Telemetry Grid */}
        <div className="grid grid-cols-2 gap-3 my-5">
          <div className="p-3 rounded-lg bg-slate-900/70 border border-slate-800">
            <div className="flex items-center gap-2 text-slate-400 text-xs mb-1">
              <Wifi className="w-3.5 h-3.5 text-cyan-400" />
              <span>Signal RSSI</span>
            </div>
            <div className="text-base font-bold text-white">{device.signalRssi}%</div>
            <div className="w-full bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden">
              <div
                className="bg-cyan-400 h-full rounded-full transition-all"
                style={{ width: `${device.signalRssi}%` }}
              />
            </div>
          </div>

          <div className="p-3 rounded-lg bg-slate-900/70 border border-slate-800">
            <div className="flex items-center gap-2 text-slate-400 text-xs mb-1">
              <Cpu className="w-3.5 h-3.5 text-emerald-400" />
              <span>Firmware</span>
            </div>
            <div className="text-base font-bold text-white font-mono text-xs">{device.firmwareVersion}</div>
            <div className="text-[10px] text-emerald-400 mt-2 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" /> Up to date
            </div>
          </div>

          <div className="p-3 rounded-lg bg-slate-900/70 border border-slate-800">
            <div className="flex items-center gap-2 text-slate-400 text-xs mb-1">
              <Radio className="w-3.5 h-3.5 text-amber-400" />
              <span>IP Address</span>
            </div>
            <div className="text-sm font-bold text-slate-200 font-mono">{device.ipAddress}</div>
            <div className="text-[10px] text-slate-400 mt-2">Static Subnet IPv4</div>
          </div>

          <div className="p-3 rounded-lg bg-slate-900/70 border border-slate-800">
            <div className="flex items-center gap-2 text-slate-400 text-xs mb-1">
              <AlertTriangle className="w-3.5 h-3.5 text-cyan-400" />
              <span>Last Heartbeat</span>
            </div>
            <div className="text-sm font-bold text-slate-200">{device.lastPing}</div>
            <div className="text-[10px] text-cyan-400/80 mt-2">MQTT Interval 3s</div>
          </div>
        </div>

        {/* MQTT Topic info */}
        <div className="p-3 rounded-lg bg-slate-900/80 border border-slate-800 mb-5">
          <div className="text-xs font-semibold text-slate-300 mb-1">MQTT Telemetry Topic</div>
          <div className="font-mono text-xs text-cyan-300 bg-slate-950 p-2 rounded border border-slate-800 break-all select-all">
            {device.mqttTopic}
          </div>
        </div>

        {/* Live Payload Stream */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Live JSON Telemetry</span>
            <button
              onClick={handleCopyPayload}
              className="flex items-center gap-1 text-[11px] text-cyan-400 hover:text-cyan-300 transition-colors"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? 'Copied' : 'Copy JSON'}
            </button>
          </div>
          <pre className="text-[11px] font-mono text-emerald-400 bg-slate-950/90 p-3 rounded-lg border border-slate-800 overflow-x-auto max-h-52">
            {JSON.stringify(mockPayload, null, 2)}
          </pre>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="pt-4 border-t border-slate-800 grid grid-cols-2 gap-3 mt-6">
        <button
          onClick={() => pingIoTDevice(device.id)}
          className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium text-xs border border-slate-700 transition-all flex items-center justify-center gap-2"
        >
          <Radio className="w-3.5 h-3.5 text-cyan-400" /> Ping Node
        </button>
        <button
          onClick={() => restartIoTDevice(device.id)}
          className="px-3 py-2 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 font-medium text-xs border border-rose-500/40 transition-all flex items-center justify-center gap-2"
        >
          <RotateCw className="w-3.5 h-3.5 text-rose-400" /> Soft Reboot
        </button>
      </div>
    </div>
  );
};
