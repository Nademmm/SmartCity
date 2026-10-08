'use client';

import React from 'react';
import { useSmartCity } from '@/context/SmartCityContext';
import { MetricCard } from '@/components/common/MetricCard';
import {
  Bell,
  CheckCircle2,
  AlertTriangle,
  Info,
  Clock,
  Radio,
  Trash2,
} from 'lucide-react';

export const AlertsView: React.FC = () => {
  const {
    alerts,
    eventLogs,
    markAlertAsRead,
    resolveAlert,
  } = useSmartCity();

  const unreadCount = alerts.filter((a) => !a.isRead && !a.isResolved).length;
  const criticalCount = alerts.filter((a) => a.severity === 'CRITICAL' && !a.isResolved).length;
  const resolvedCount = alerts.filter((a) => a.isResolved).length;

  return (
    <div className="space-y-5">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Total Notifikasi Aktif"
          value={alerts.length}
          unit="Pesan"
          statusText={unreadCount > 0 ? `${unreadCount} Belum Dibaca` : 'Semua Terbaca'}
          statusVariant={unreadCount > 0 ? 'warning' : 'success'}
          icon={<Bell className="w-4 h-4" />}
          footerText="Sensor Miniatur & Kamera"
        />

        <MetricCard
          title="Peringatan Kritis"
          value={criticalCount}
          statusText={criticalCount > 0 ? 'Perlu Ditangani' : 'Aman'}
          statusVariant={criticalCount > 0 ? 'danger' : 'success'}
          icon={<AlertTriangle className="w-4 h-4" />}
          footerText="Polusi Tinggi / Kemacetan"
        />

        <MetricCard
          title="Notifikasi Diselesaikan"
          value={resolvedCount}
          statusText="Resolved"
          statusVariant="success"
          icon={<CheckCircle2 className="w-4 h-4" />}
          footerText="Tindakan Operator"
        />

        <MetricCard
          title="Log Peristiwa Sistem"
          value={eventLogs.length}
          unit="Event"
          statusText="Live Logging"
          statusVariant="info"
          icon={<Clock className="w-4 h-4" />}
          footerText="Hardware & Auto Actions"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left: Active Alerts List */}
        <div className="lg:col-span-7 glass-panel rounded-2xl p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-cyan-400" />
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                  Daftar Peringatan & Notifikasi
                </h3>
              </div>
              <span className="text-xs font-mono text-cyan-400 bg-slate-900 px-2.5 py-0.5 rounded border border-slate-800">
                {alerts.length} Notifikasi
              </span>
            </div>

            <div className="my-4 space-y-3">
              {alerts.length === 0 ? (
                <div className="text-center py-10 text-slate-400 text-xs flex flex-col items-center gap-2">
                  <CheckCircle2 className="w-8 h-8 text-emerald-400" />
                  <span>Tidak ada peringatan aktif saat ini. Semua sensor bekerja normal.</span>
                </div>
              ) : (
                alerts.map((alert) => (
                  <div
                    key={alert.id}
                    className={`p-4 rounded-xl border transition-all ${
                      alert.isResolved
                        ? 'bg-slate-900/40 border-slate-800 opacity-60'
                        : alert.severity === 'CRITICAL'
                        ? 'bg-rose-950/20 border-rose-500/40'
                        : alert.severity === 'WARNING'
                        ? 'bg-amber-950/20 border-amber-500/40'
                        : 'bg-slate-900/70 border-slate-800'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                              alert.severity === 'CRITICAL'
                                ? 'bg-rose-500 text-white'
                                : alert.severity === 'WARNING'
                                ? 'bg-amber-400 text-black'
                                : 'bg-cyan-500/20 text-cyan-300'
                            }`}
                          >
                            {alert.severity}
                          </span>
                          <span className="text-xs font-mono text-slate-400">{alert.timestamp}</span>
                          <span className="text-xs text-cyan-400 font-semibold">• {alert.subsystem}</span>
                        </div>
                        <h4 className="text-sm font-bold text-white">{alert.title}</h4>
                        <p className="text-xs text-slate-300 mt-1">{alert.description}</p>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {!alert.isResolved && (
                          <button
                            onClick={() => resolveAlert(alert.id)}
                            className="px-2.5 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-xs font-semibold transition-colors"
                          >
                            Selesai
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right: Hardware Event Log stream */}
        <div className="lg:col-span-5 glass-panel rounded-2xl p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-cyan-400" />
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                  Log Peristiwa Riil Miniatur
                </h3>
              </div>
              <span className="text-xs font-mono text-slate-400">Total: {eventLogs.length}</span>
            </div>

            <div className="my-4 space-y-2.5 max-h-[460px] overflow-y-auto pr-1">
              {eventLogs.map((log) => (
                <div
                  key={log.id}
                  className="p-3 rounded-xl bg-slate-900/70 border border-slate-800 text-xs"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-mono text-cyan-400 bg-cyan-500/10 px-1.5 py-0.5 rounded">
                      {log.timestamp}
                    </span>
                    <span
                      className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${
                        log.type === 'HARDWARE'
                          ? 'bg-amber-500/20 text-amber-300'
                          : log.type === 'AUTO'
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : 'bg-blue-500/20 text-blue-300'
                      }`}
                    >
                      {log.type}
                    </span>
                  </div>
                  <div className="font-semibold text-white">{log.event}</div>
                  <div className="text-[11px] text-slate-400 mt-0.5">{log.details}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
