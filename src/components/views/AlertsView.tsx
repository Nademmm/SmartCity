'use client';

import React from 'react';
import { useSmartCity } from '@/context/SmartCityContext';
import { MetricCard } from '@/components/common/MetricCard';
import {
  Bell,
  CheckCircle2,
  AlertTriangle,
  Clock,
} from 'lucide-react';

export const AlertsView: React.FC = () => {
  const {
    alerts,
    eventLogs,
    resolveAlert,
  } = useSmartCity();

  const unreadCount = alerts.filter((a) => !a.isRead && !a.isResolved).length;
  const criticalCount = alerts.filter((a) => a.severity === 'CRITICAL' && !a.isResolved).length;
  const resolvedCount = alerts.filter((a) => a.isResolved).length;

  return (
    <div className="space-y-4">
      {/* 4 Telemetry Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <MetricCard
          title="Total Notifikasi"
          value={alerts.length}
          unit="Pesan"
          statusText={unreadCount > 0 ? `${unreadCount} Baru` : 'Semua Terbaca'}
          statusVariant={unreadCount > 0 ? 'warning' : 'success'}
          icon={<Bell className="w-4 h-4" />}
          footerText="Sensor Miniatur & Kamera AI"
        />

        <MetricCard
          title="Peringatan Kritis"
          value={criticalCount}
          statusText={criticalCount > 0 ? 'Perlu Ditangani' : 'Aman'}
          statusVariant={criticalCount > 0 ? 'danger' : 'success'}
          icon={<AlertTriangle className="w-4 h-4" />}
          footerText="Polusi Tinggi / Macet"
        />

        <MetricCard
          title="Notifikasi Selesai"
          value={resolvedCount}
          statusText="Resolved"
          statusVariant="success"
          icon={<CheckCircle2 className="w-4 h-4" />}
          footerText="Tindakan Operator"
        />

        <MetricCard
          title="Log Peristiwa"
          value={eventLogs.length}
          unit="Event"
          statusText="Live Logging"
          statusVariant="info"
          icon={<Clock className="w-4 h-4" />}
          footerText="Aksi Otomasi & Hardware"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left: Active Alerts List */}
        <div className="lg:col-span-7 rounded-xl bg-slate-900/60 border border-slate-800/80 p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
              <h3 className="text-xs font-semibold text-white uppercase tracking-wider">
                Daftar Peringatan dan Notifikasi
              </h3>
              <p className="text-[11px] font-mono text-slate-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                {alerts.length} Total
              </p>
            </div>

            <div className="my-3 space-y-2">
              {alerts.length === 0 ? (
                <div className="text-center py-10 text-slate-400 text-xs flex flex-col items-center gap-2">
                  <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                  <p>Tidak ada peringatan aktif. Semua sensor bekerja normal.</p>
                </div>
              ) : (
                alerts.map((alert) => (
                  <div
                    key={alert.id}
                    className={`p-3.5 rounded-xl border text-xs transition-colors ${
                      alert.isResolved
                        ? 'bg-slate-950/40 border-slate-800/60 opacity-60'
                        : alert.severity === 'CRITICAL'
                        ? 'bg-rose-950/20 border-rose-500/30'
                        : alert.severity === 'WARNING'
                        ? 'bg-amber-950/20 border-amber-500/30'
                        : 'bg-slate-900/60 border-slate-800'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <p
                            className={`px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase ${
                              alert.severity === 'CRITICAL'
                                ? 'bg-rose-500/20 text-rose-300'
                                : alert.severity === 'WARNING'
                                ? 'bg-amber-500/20 text-amber-300'
                                : 'bg-slate-800 text-slate-300'
                            }`}
                          >
                            {alert.severity}
                          </p>
                          <p className="text-[11px] font-mono text-slate-400">{alert.timestamp}</p>
                          <p className="text-[11px] text-slate-400 font-medium">• {alert.subsystem}</p>
                        </div>
                        <h4 className="text-xs font-semibold text-white">{alert.title}</h4>
                        <p className="text-xs text-slate-400 mt-0.5">{alert.description}</p>
                      </div>

                      {!alert.isResolved && (
                        <button
                          onClick={() => resolveAlert(alert.id)}
                          className="px-2.5 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-medium transition-colors shrink-0 cursor-pointer"
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
        <div className="lg:col-span-5 rounded-xl bg-slate-900/60 border border-slate-800/80 p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
              <h3 className="text-xs font-semibold text-white uppercase tracking-wider">
                Log Peristiwa Sistem
              </h3>
              <p className="text-[11px] font-mono text-slate-400">{eventLogs.length} Log</p>
            </div>

            <div className="my-3 space-y-2 max-h-[460px] overflow-y-auto pr-1">
              {eventLogs.map((log) => (
                <div
                  key={log.id}
                  className="p-3 rounded-lg bg-slate-950/70 border border-slate-800/80 text-xs"
                >
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-[10px] font-mono text-slate-400">
                      {log.timestamp}
                    </p>
                    <p
                      className={`text-[10px] font-mono font-medium px-1.5 py-0.5 rounded ${
                        log.type === 'HARDWARE'
                          ? 'bg-amber-500/10 text-amber-300'
                          : log.type === 'AUTO'
                          ? 'bg-emerald-500/10 text-emerald-400'
                          : 'bg-slate-800 text-slate-300'
                      }`}
                    >
                      {log.type}
                    </p>
                  </div>
                  <p className="font-medium text-white">{log.event}</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">{log.details}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
