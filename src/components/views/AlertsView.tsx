'use client';

import React, { useState } from 'react';
import { useSmartCity } from '@/context/SmartCityContext';
import { MetricCard } from '@/components/common/MetricCard';
import {
  Bell,
  AlertTriangle,
  AlertCircle,
  Info,
  CheckCircle2,
  Trash2,
  Check,
  Eye,
  X,
  ShieldCheck,
  Clock,
  Radio,
} from 'lucide-react';
import { SystemAlert, AlertSeverity } from '@/types/iot';

export const AlertsView: React.FC = () => {
  const {
    alerts,
    markAlertAsRead,
    acknowledgeAlert,
    resolveAlert,
    clearResolvedAlerts,
  } = useSmartCity();

  const [filterSeverity, setFilterSeverity] = useState<string>('ALL');
  const [selectedAlertForModal, setSelectedAlertForModal] = useState<SystemAlert | null>(null);

  const criticalCount = alerts.filter((a) => a.severity === 'CRITICAL' && !a.isResolved).length;
  const warningCount = alerts.filter((a) => a.severity === 'WARNING' && !a.isResolved).length;
  const infoCount = alerts.filter((a) => a.severity === 'INFO' && !a.isResolved).length;
  const resolvedCount = alerts.filter((a) => a.isResolved).length;

  const filteredAlerts = alerts.filter((alert) => {
    if (filterSeverity === 'ALL') return true;
    if (filterSeverity === 'RESOLVED') return alert.isResolved;
    return alert.severity === filterSeverity && !alert.isResolved;
  });

  return (
    <div className="space-y-5">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Critical Incidents"
          value={criticalCount}
          unit="Aktif"
          statusText={criticalCount > 0 ? 'Tindakan Mendesak' : 'Semua Aman'}
          statusVariant={criticalCount > 0 ? 'danger' : 'success'}
          icon={<AlertCircle className="w-4 h-4" />}
          footerText="Prioritas Tingkat 1 (SOP Red)"
        />

        <MetricCard
          title="Warning Alerts"
          value={warningCount}
          unit="Peringatan"
          statusText={warningCount > 0 ? 'Pemantauan Aktif' : 'Normal'}
          statusVariant={warningCount > 0 ? 'warning' : 'success'}
          icon={<AlertTriangle className="w-4 h-4" />}
          footerText="Kepadatan Lalu Lintas & Polusi"
        />

        <MetricCard
          title="System Info Logs"
          value={infoCount}
          unit="Pemberitahuan"
          statusText="Otomasi Normal"
          statusVariant="info"
          icon={<Info className="w-4 h-4" />}
          footerText="PJU & Pelican Events"
        />

        <MetricCard
          title="Resolved Incidents"
          value={resolvedCount}
          unit="Selesai"
          statusText="100% Ditangani"
          statusVariant="success"
          icon={<CheckCircle2 className="w-4 h-4" />}
          footerText="Arsip Riwayat 24 Jam"
        />
      </div>

      {/* Filter and Actions Bar */}
      <div className="glass-panel rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Severity Tabs */}
        <div className="flex flex-wrap items-center gap-1.5 bg-slate-900/90 p-1 rounded-xl border border-slate-800 text-xs">
          <button
            onClick={() => setFilterSeverity('ALL')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
              filterSeverity === 'ALL'
                ? 'bg-cyan-500 text-white font-bold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Semua ({alerts.length})
          </button>
          <button
            onClick={() => setFilterSeverity('CRITICAL')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
              filterSeverity === 'CRITICAL'
                ? 'bg-rose-500 text-white font-bold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Critical ({criticalCount})
          </button>
          <button
            onClick={() => setFilterSeverity('WARNING')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
              filterSeverity === 'WARNING'
                ? 'bg-amber-500 text-black font-bold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Warning ({warningCount})
          </button>
          <button
            onClick={() => setFilterSeverity('RESOLVED')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
              filterSeverity === 'RESOLVED'
                ? 'bg-emerald-500 text-white font-bold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Resolved ({resolvedCount})
          </button>
        </div>

        {/* Clear Resolved Button */}
        {resolvedCount > 0 && (
          <button
            onClick={clearResolvedAlerts}
            className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 text-xs border border-slate-800 transition-colors flex items-center gap-1.5 self-start sm:self-auto"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Bersihkan Alert Selesai</span>
          </button>
        )}
      </div>

      {/* Alerts List */}
      <div className="space-y-3">
        {filteredAlerts.length === 0 ? (
          <div className="glass-panel rounded-2xl p-12 text-center flex flex-col items-center justify-center gap-3 text-slate-400">
            <CheckCircle2 className="w-10 h-10 text-emerald-400" />
            <h3 className="text-sm font-bold text-white">Tidak Ada Alert Dalam Kategori Ini</h3>
            <p className="text-xs text-slate-400 max-w-md">
              Seluruh jaringan sensor kota beroperasi dalam ambang batas aman tanpa anomali terdeteksi.
            </p>
          </div>
        ) : (
          filteredAlerts.map((alert) => (
            <div
              key={alert.id}
              className={`p-4 rounded-2xl border transition-all ${
                alert.isResolved
                  ? 'bg-slate-950/40 border-slate-900 opacity-60'
                  : alert.severity === 'CRITICAL'
                  ? 'bg-rose-950/20 border-rose-500/40 hover:border-rose-500 shadow-lg shadow-rose-500/5'
                  : alert.severity === 'WARNING'
                  ? 'bg-amber-950/20 border-amber-500/40 hover:border-amber-500 shadow-lg shadow-amber-500/5'
                  : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                {/* Left: Icon & Title */}
                <div className="flex items-start gap-3.5 flex-1">
                  <div
                    className={`p-2.5 rounded-xl border mt-0.5 ${
                      alert.isResolved
                        ? 'bg-slate-800 border-slate-700 text-slate-400'
                        : alert.severity === 'CRITICAL'
                        ? 'bg-rose-500/20 border-rose-500/40 text-rose-400'
                        : alert.severity === 'WARNING'
                        ? 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                        : 'bg-cyan-500/20 border-cyan-500/40 text-cyan-300'
                    }`}
                  >
                    {alert.isResolved ? (
                      <CheckCircle2 className="w-5 h-5" />
                    ) : alert.severity === 'CRITICAL' ? (
                      <AlertCircle className="w-5 h-5" />
                    ) : alert.severity === 'WARNING' ? (
                      <AlertTriangle className="w-5 h-5" />
                    ) : (
                      <Info className="w-5 h-5" />
                    )}
                  </div>

                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                          alert.isResolved
                            ? 'bg-slate-800 text-slate-400'
                            : alert.severity === 'CRITICAL'
                            ? 'bg-rose-500 text-white'
                            : alert.severity === 'WARNING'
                            ? 'bg-amber-500 text-black font-bold'
                            : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                        }`}
                      >
                        {alert.severity}
                      </span>
                      <span className="text-[11px] font-mono text-cyan-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                        {alert.timestamp}
                      </span>
                      <span className="text-xs text-slate-400 font-semibold">• {alert.location}</span>
                      <span className="text-[11px] text-slate-500 font-mono">({alert.sensor})</span>
                    </div>

                    <h3 className="text-sm font-bold text-white">{alert.title}</h3>
                    <p className="text-xs text-slate-300">{alert.description}</p>
                    
                    <div className="pt-1 text-[11px] text-emerald-400/90 font-medium flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Respon Otomatis: {alert.systemResponse}</span>
                    </div>
                  </div>
                </div>

                {/* Right: Actions */}
                <div className="flex items-center gap-2 self-end md:self-center">
                  <button
                    onClick={() => setSelectedAlertForModal(alert)}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-colors flex items-center gap-1.5"
                  >
                    <Eye className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Detail SOP</span>
                  </button>

                  {!alert.isResolved && (
                    <button
                      onClick={() => resolveAlert(alert.id)}
                      className="px-3 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 text-xs font-bold border border-emerald-500/40 transition-colors flex items-center gap-1.5"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Tandai Selesai</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Alert SOP Details Modal */}
      {selectedAlertForModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl bg-[#0D1527] border border-cyan-500/40 p-6 shadow-2xl space-y-4">
            <div className="flex items-start justify-between pb-3 border-b border-slate-800">
              <div>
                <span className="text-[10px] font-mono font-bold text-cyan-400 uppercase">
                  Incident Report & Operator Checklist
                </span>
                <h3 className="text-base font-bold text-white mt-0.5">{selectedAlertForModal.title}</h3>
              </div>
              <button
                onClick={() => setSelectedAlertForModal(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-300">
              <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 space-y-1">
                <div className="text-slate-400">Lokasi Kejadian:</div>
                <div className="font-bold text-white">{selectedAlertForModal.location}</div>
                <div className="text-slate-400 mt-2">Sensor Sumber:</div>
                <div className="font-mono text-cyan-300">{selectedAlertForModal.sensor}</div>
              </div>

              <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 space-y-1">
                <div className="font-bold text-emerald-400">Tindakan Mitigasi AI Terlaksana:</div>
                <p className="text-slate-300">{selectedAlertForModal.systemResponse}</p>
              </div>

              <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 space-y-2">
                <div className="font-bold text-slate-200">Checklist Operator Lapangan:</div>
                <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                  <input type="checkbox" defaultChecked className="accent-cyan-500" />
                  <span>Verifikasi keabsahan data telemetri MQTT</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                  <input type="checkbox" defaultChecked className="accent-cyan-500" />
                  <span>Pantau perubahan respon setelah otomatisasi berjalan</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                  <input type="checkbox" className="accent-cyan-500" />
                  <span>Konfirmasi situasi lapangan ke petugas Dishub / DLH</span>
                </label>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-800 flex justify-end gap-2">
              <button
                onClick={() => {
                  resolveAlert(selectedAlertForModal.id);
                  setSelectedAlertForModal(null);
                }}
                className="px-4 py-2 rounded-lg bg-emerald-500 text-black font-bold text-xs hover:bg-emerald-400"
              >
                Selesaikan Incident Ini
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
