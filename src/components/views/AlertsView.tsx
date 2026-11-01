'use client';

import React from 'react';
import { useSmartCity } from '@/context/SmartCityContext';
import { TerminalConsole } from '@/components/common/TerminalConsole';

export const AlertsView: React.FC = () => {
  const { alerts, eventLogs, resolveAlert, clearEventLogs } = useSmartCity();

  return (
    <div className="space-y-4">
      {/* Direct Serial Terminal Console */}
      <TerminalConsole
        filterFeature="all"
        title="Terminal Serial ESP32 (COM3 · 115200 Baud)"
        maxHeight="max-h-96"
      />

      {/* Event Logs & Active Alerts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left: Active Alerts */}
        <section aria-label="Daftar Peringatan Sistem" className="lg:col-span-6 rack-panel flex flex-col">
          <div className="px-4 py-3 bg-[var(--bg-header)] border-b border-[var(--border-line)] flex items-center justify-between gap-2 rounded-t-[10px]">
            <h3 className="font-semibold text-sm text-[var(--text-primary)]">
              Peringatan Aktif ({alerts.length})
            </h3>
            <span className="rack-tag">ALARM LOG</span>
          </div>

          <div className="p-4 space-y-2 max-h-80 overflow-y-auto">
            {alerts.length === 0 ? (
              <div className="rack-well p-6 text-center font-mono text-xs text-[var(--text-secondary)]">
                Tidak ada peringatan bahaya aktif. Semua sensor dalam batas aman.
              </div>
            ) : (
              alerts.map((alert) => (
                <div
                  key={alert.id}
                  className="p-3 rounded-lg border font-mono text-xs flex items-center justify-between gap-3"
                  style={{
                    backgroundColor: alert.isResolved ? 'var(--bg-well)' : 'var(--sig-red-bg)',
                    borderColor: alert.isResolved ? 'var(--border-line)' : 'var(--sig-red-border)',
                    opacity: alert.isResolved ? 0.65 : 1,
                  }}
                >
                  <div>
                    <div className="flex items-center gap-2 text-[10px] text-[var(--text-secondary)]">
                      <span>{alert.timestamp}</span>
                      <span>·</span>
                      <span>{alert.subsystem}</span>
                    </div>
                    <p className="font-bold mt-0.5">{alert.title}</p>
                    <p className="text-[11px] text-[var(--text-secondary)]">{alert.description}</p>
                  </div>

                  {!alert.isResolved && (
                    <button
                      type="button"
                      onClick={() => resolveAlert(alert.id)}
                      className="ctrl-btn ctrl-btn-sm font-mono shrink-0"
                    >
                      Selesai
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        </section>

        {/* Right: Command & Hardware Event History */}
        <section aria-label="Riwayat Perintah Perangkat" className="lg:col-span-6 rack-panel flex flex-col">
          <div className="px-4 py-3 bg-[var(--bg-header)] border-b border-[var(--border-line)] flex items-center justify-between gap-2 rounded-t-[10px]">
            <h3 className="font-semibold text-sm text-[var(--text-primary)]">
              Riwayat Perintah ({eventLogs.length})
            </h3>
            {eventLogs.length > 0 && (
              <button
                type="button"
                onClick={clearEventLogs}
                className="ctrl-btn ctrl-btn-sm font-mono"
              >
                Hapus Log
              </button>
            )}
          </div>

          <div className="p-4 space-y-2 max-h-80 overflow-y-auto">
            {eventLogs.length === 0 ? (
              <div className="rack-well p-6 text-center font-mono text-xs text-[var(--text-secondary)]">
                Belum ada perintah manual yang dikirim pada sesi ini. Gunakan tombol kontrol di panel untuk mengirim perintah.
              </div>
            ) : (
              eventLogs.map((log) => (
                <div key={log.id} className="rack-well p-3 font-mono text-xs space-y-1">
                  <div className="flex items-center justify-between text-[10px] text-[var(--text-secondary)]">
                    <span>
                      {log.timestamp} · {log.subsystem}
                    </span>
                    <span className="font-bold">{log.type}</span>
                  </div>
                  <p className="font-bold">{log.event}</p>
                  <p className="text-[11px] text-[var(--text-secondary)]">{log.details}</p>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  );
};
