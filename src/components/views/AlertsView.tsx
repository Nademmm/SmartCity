'use client';

import React, { useState } from 'react';
import { useSmartCity } from '@/context/SmartCityContext';
import { MetricCard } from '@/components/common/MetricCard';
import { TerminalConsole } from '@/components/common/TerminalConsole';
import {
  Bell,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Terminal,
  ListFilter,
  Cpu,
} from 'lucide-react';

export const AlertsView: React.FC = () => {
  const {
    alerts,
    eventLogs,
    resolveAlert,
    isHardwareConnected,
  } = useSmartCity();

  const [activeTab, setActiveTab] = useState<'alerts' | 'terminal'>('alerts');

  const unreadCount = alerts.filter((a) => !a.isRead && !a.isResolved).length;
  const criticalCount = alerts.filter((a) => a.severity === 'CRITICAL' && !a.isResolved).length;
  const resolvedCount = alerts.filter((a) => a.isResolved).length;

  return (
    <div className="space-y-6">
      {/* 4 Clean Telemetry Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Total Notifikasi"
          value={alerts.length}
          unit="Pesan"
          colorScheme={unreadCount > 0 ? 'amber' : 'emerald'}
          icon={<Bell className="w-5 h-5" />}
          subtitle={unreadCount > 0 ? `${unreadCount} Baru` : 'Semua Terbaca'}
        />

        <MetricCard
          title="Peringatan Bahaya"
          value={criticalCount}
          colorScheme={criticalCount > 0 ? 'rose' : 'emerald'}
          icon={<AlertTriangle className="w-5 h-5" />}
          subtitle={criticalCount > 0 ? 'Perlu Tindakan' : 'Aman'}
        />

        <MetricCard
          title="Notifikasi Selesai"
          value={resolvedCount}
          colorScheme="emerald"
          icon={<CheckCircle2 className="w-5 h-5" />}
          subtitle="Tindakan Operator"
        />

        <MetricCard
          title="Log Peristiwa"
          value={eventLogs.length}
          unit="Event"
          colorScheme="indigo"
          icon={<Clock className="w-5 h-5" />}
          subtitle="Pencatatan Otomasi"
        />
      </div>

      {/* Tab Switcher: Peringatan & Log Sistem vs Terminal Serial ESP32 */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-3 rounded-2xl neu-raised border border-white/80">
        <div className="flex items-center gap-2 neu-inset p-1.5 rounded-xl">
          <button
            type="button"
            onClick={() => setActiveTab('alerts')}
            className={`px-4 py-2.5 rounded-lg text-xs font-bold flex items-center gap-2 transition-all min-h-[44px] ${
              activeTab === 'alerts'
                ? 'neu-btn-active text-[#0284c7]'
                : 'text-[#4e5d71]'
            }`}
          >
            <ListFilter className="w-4 h-4" />
            <span>Peringatan & Riwayat Aktivitas</span>
            {unreadCount > 0 && (
              <span className="px-2 py-0.5 rounded-full text-[10px] bg-[#ffe4e6] text-[#e11d48] font-mono font-bold">
                {unreadCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('terminal')}
            className={`px-4 py-2.5 rounded-lg text-xs font-bold flex items-center gap-2 transition-all min-h-[44px] ${
              activeTab === 'terminal'
                ? 'neu-btn-active text-[#0284c7]'
                : 'text-[#4e5d71]'
            }`}
          >
            <Terminal className="w-4 h-4" />
            <span>Konsol Terminal Serial</span>
            <span
              className={`w-2 h-2 rounded-full ${
                isHardwareConnected ? 'bg-[#059669]' : 'bg-[#8e9eaf]'
              }`}
            />
          </button>
        </div>

        <div className="flex items-center gap-2 px-3 text-xs text-[#4e5d71]">
          <Cpu className="w-4 h-4 text-[#0284c7]" />
          <span className="font-mono text-xs font-bold text-[#19212d]">
            {isHardwareConnected ? 'ESP32 COM3 Online (115200)' : 'ESP32 Siaga'}
          </span>
        </div>
      </div>

      {/* Tab 1: Peringatan & Aktivitas Sistem */}
      {activeTab === 'alerts' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left: Active Alerts List */}
          <div className="lg:col-span-7 neu-raised rounded-3xl p-6 border border-white/80 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-[#d3dde9] mb-4">
                <h3 className="text-xs font-bold text-[#4e5d71] uppercase tracking-wider">
                  Daftar Peringatan
                </h3>
                <span className="font-mono text-xs text-[#0284c7] font-bold">
                  {alerts.length} Total
                </span>
              </div>

              <div className="space-y-3">
                {alerts.length === 0 ? (
                  <div className="text-center py-12 text-[#6e7e93] text-xs flex flex-col items-center gap-2">
                    <CheckCircle2 className="w-8 h-8 text-[#059669]" />
                    <p className="font-bold text-sm text-[#19212d]">Semua Parameter Normal</p>
                    <p className="text-xs">Tidak ada peringatan aktif saat ini.</p>
                  </div>
                ) : (
                  alerts.map((alert) => (
                    <div
                      key={alert.id}
                      className={`p-4 rounded-2xl border text-xs transition-colors ${
                        alert.isResolved
                          ? 'neu-inset border-transparent opacity-60'
                          : alert.severity === 'CRITICAL'
                          ? 'bg-[#ffe4e6] border-[#fecdd3]'
                          : alert.severity === 'WARNING'
                          ? 'bg-[#fef3c7] border-[#fde68a]'
                          : 'neu-raised border-white/70'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                                alert.severity === 'CRITICAL'
                                  ? 'bg-[#e11d48] text-white'
                                  : alert.severity === 'WARNING'
                                  ? 'bg-[#d97706] text-white'
                                  : 'bg-[#dbe3ee] text-[#4e5d71]'
                              }`}
                            >
                              {alert.severity}
                            </span>
                            <span className="text-[11px] font-mono text-[#6e7e93]">{alert.timestamp}</span>
                            <span className="text-[11px] text-[#6e7e93] font-medium">• {alert.subsystem}</span>
                          </div>
                          <h4 className="text-xs font-bold text-[#19212d]">{alert.title}</h4>
                          <p className="text-xs text-[#4e5d71] mt-0.5">{alert.description}</p>
                        </div>

                        {!alert.isResolved && (
                          <button
                            type="button"
                            onClick={() => resolveAlert(alert.id)}
                            className="neu-btn px-3 py-1.5 rounded-lg text-xs font-bold text-[#19212d] shrink-0 min-h-[44px]"
                          >
                            Selesai
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Right: Hardware Event Log stream */}
          <div className="lg:col-span-5 neu-raised rounded-3xl p-6 border border-white/80 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-[#d3dde9] mb-4">
                <h3 className="text-xs font-bold text-[#4e5d71] uppercase tracking-wider">
                  Log Peristiwa Sistem
                </h3>
                <span className="font-mono text-xs text-[#0284c7] font-bold">
                  {eventLogs.length} Log
                </span>
              </div>

              <div className="space-y-2.5 max-h-[480px] overflow-y-auto pr-1">
                {eventLogs.map((log) => (
                  <div
                    key={log.id}
                    className="p-3.5 rounded-2xl neu-inset text-xs"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] font-mono text-[#6e7e93]">
                        {log.timestamp}
                      </span>
                      <span
                        className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${
                          log.type === 'HARDWARE'
                            ? 'bg-[#fef3c7] text-[#d97706]'
                            : log.type === 'AUTO'
                            ? 'bg-[#d1fae5] text-[#059669]'
                            : 'bg-[#e0e7ff] text-[#4f46e5]'
                        }`}
                      >
                        {log.type}
                      </span>
                    </div>
                    <p className="font-bold text-[#19212d]">{log.event}</p>
                    <p className="text-[11px] text-[#4e5d71] mt-0.5">{log.details}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Konsol Terminal Serial ESP32 Terpusat */}
      {activeTab === 'terminal' && (
        <div className="space-y-4">
          <TerminalConsole
            filterFeature="all"
            title="Konsol Terminal Serial Terpusat (ESP32)"
            maxHeight="max-h-[560px]"
          />
        </div>
      )}
    </div>
  );
};
