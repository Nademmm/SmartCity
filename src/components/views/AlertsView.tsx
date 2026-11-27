'use client';

import React, { useState } from 'react';
import { useSmartCity } from '@/context/SmartCityContext';
import { TerminalConsole } from '@/components/common/TerminalConsole';

export const AlertsView: React.FC = () => {
  const { alerts, eventLogs, resolveAlert, clearEventLogs, sendCommand, isSerialConnected, isHardwareConnected } =
    useSmartCity();
  const [wifiSsid, setWifiSsid] = useState<string>('');
  const [wifiPass, setWifiPass] = useState<string>('');
  const [wifiNotice, setWifiNotice] = useState<string | null>(null);

  const handleSaveWifiToEsp32 = async (e: React.FormEvent) => {
    e.preventDefault();
    const ssid = wifiSsid.trim();
    if (!ssid) {
      setWifiNotice('Masukkan nama Wi-Fi (SSID) terlebih dahulu.');
      return;
    }
    await sendCommand(`CMD:WIFI_SET:${ssid}|${wifiPass}`);
    setWifiNotice(
      `Konfigurasi Wi-Fi "${ssid}" dikirim ke ESP32. Setelah muncul status Wi-Fi terhubung di log, kabel USB bisa langsung dicabut dan ESP32 cukup diberi daya powerbank/adaptor.`
    );
  };

  return (
    <div className="space-y-4">
      {/* ESP32 Wireless Wi-Fi Setup Card */}
      <section aria-label="Pengaturan Wi-Fi ESP32" className="rack-panel">
        <div className="px-4 py-3 bg-[var(--bg-header)] border-b border-[var(--border-line)] flex flex-wrap items-center justify-between gap-2 rounded-t-[10px]">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-sm text-[var(--text-primary)]">
              Koneksi Wi-Fi ESP32 (Tanpa Kabel USB)
            </h3>
            <span
              className="rack-tag"
              style={{
                backgroundColor:
                  isHardwareConnected && !isSerialConnected ? 'var(--sig-green-bg)' : 'var(--bg-well)',
                color:
                  isHardwareConnected && !isSerialConnected ? 'var(--sig-green)' : 'var(--text-secondary)',
              }}
            >
              {isHardwareConnected && !isSerialConnected
                ? 'WIFI CLOUD AKTIF'
                : isSerialConnected
                ? 'USB TERHUBUNG (SIAP SET WIFI)'
                : 'SIAGA WIFI'}
            </span>
          </div>
          <span className="font-mono text-[11px] text-[var(--text-secondary)]">
            Portal AP Cadangan: SmartCity-ESP32-Setup (192.168.4.1)
          </span>
        </div>

        <form onSubmit={handleSaveWifiToEsp32} className="p-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
            <div className="sm:col-span-5">
              <label className="block text-[11px] font-mono text-[var(--text-secondary)] mb-1">
                Nama Wi-Fi / Hotspot HP (2.4 GHz)
              </label>
              <input
                type="text"
                value={wifiSsid}
                onChange={(e) => setWifiSsid(e.target.value)}
                placeholder="Contoh: Hotspot_HP atau Nama_WiFi"
                className="w-full h-9 px-3 rounded-lg border border-[var(--border-line)] bg-[var(--bg-well)] text-xs font-mono text-[var(--text-primary)]"
              />
            </div>
            <div className="sm:col-span-4">
              <label className="block text-[11px] font-mono text-[var(--text-secondary)] mb-1">
                Password Wi-Fi
              </label>
              <input
                type="password"
                value={wifiPass}
                onChange={(e) => setWifiPass(e.target.value)}
                placeholder="Kosongkan jika tanpa password"
                className="w-full h-9 px-3 rounded-lg border border-[var(--border-line)] bg-[var(--bg-well)] text-xs font-mono text-[var(--text-primary)]"
              />
            </div>
            <div className="sm:col-span-3 flex items-end">
              <button
                type="submit"
                className="w-full h-9 ctrl-btn ctrl-btn-green font-mono text-xs justify-center"
              >
                Simpan Wi-Fi ke ESP32
              </button>
            </div>
          </div>

          {wifiNotice && (
            <div className="rack-well px-3 py-2 font-mono text-[11px] text-[var(--sig-green)]">
              {wifiNotice}
            </div>
          )}

          <p className="font-mono text-[11px] text-[var(--text-secondary)] leading-relaxed">
            Cara pakai tanpa USB: (1) Simpan Wi-Fi 2.4 GHz di atas saat USB terhubung, ATAU saat ESP32 dinyalakan
            memakai powerbank/adaptor dan belum terhubung Wi-Fi, sambungkan HP ke Wi-Fi{' '}
            <span className="font-semibold text-[var(--text-primary)]">SmartCity-ESP32-Setup</span> (sandi:{' '}
            <span className="font-semibold text-[var(--text-primary)]">12345678</span>) lalu buka{' '}
            <span className="font-semibold text-[var(--text-primary)]">http://192.168.4.1</span> untuk memasukkan
            Wi-Fi/Hotspot Anda.
          </p>
        </form>
      </section>

      {/* Direct Serial Terminal Console */}
      <TerminalConsole
        filterFeature="all"
        title="Terminal Serial & Wi-Fi ESP32 (Auto-COM · 115200 Baud)"
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
