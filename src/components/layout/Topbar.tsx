'use client';

import React from 'react';
import { useSmartCity } from '@/context/SmartCityContext';
import { SubsystemType } from '@/types/iot';

const NAV_MODULES: { id: SubsystemType; label: string; shortLabel: string; code: string }[] = [
  { id: 'overview', label: 'Semua Modul', shortLabel: 'Semua', code: 'ALL' },
  { id: 'air-quality', label: 'Polusi & LCD', shortLabel: 'Gas', code: 'MQ' },
  { id: 'pedestrian', label: 'Penyeberangan', shortLabel: 'Zebra', code: 'US' },
  { id: 'lighting', label: 'Smart PJU', shortLabel: 'PJU', code: 'LDR' },
  { id: 'traffic', label: 'Kamera Simpang', shortLabel: 'Kamera', code: 'CAM' },
  { id: 'alerts', label: 'Serial & Log', shortLabel: 'Serial', code: 'COM' },
];

export const Topbar: React.FC = () => {
  const {
    activeSubsystem,
    setActiveSubsystem,
    isAudioMuted,
    toggleAudioMute,
    isLiveIoTMode,
    toggleLiveIoTMode,
    isHardwareConnected,
    isWebSerialSupported,
    isSerialConnected,
    isConnectingSerial,
    connectSerial,
    disconnectSerial,
    theme,
    toggleTheme,
    alerts,
  } = useSmartCity();

  const unreadAlerts = alerts.filter((a) => !a.isResolved).length;

  return (
    <>
      <header className="sticky top-0 z-30 h-14 bg-[var(--bg-panel)] border-b border-[var(--border-line)]">
        <div className="max-w-7xl mx-auto h-full px-3 sm:px-6 flex items-center justify-between gap-3">
          {/* Left: Brand Identity & Hardware Port Status */}
          <div className="flex items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={() => setActiveSubsystem('overview')}
              className="flex items-center gap-2.5 text-left cursor-pointer bg-transparent border-0 p-0"
            >
              <span
                className="w-7 h-7 rounded-md flex items-center justify-center font-mono font-bold text-xs tracking-tighter shrink-0"
                style={{
                  backgroundColor: 'var(--text-primary)',
                  color: 'var(--bg-panel)',
                }}
              >
                SC
              </span>
              <div className="flex items-center gap-1.5">
                <span className="font-semibold text-sm tracking-tight text-[var(--text-primary)] whitespace-nowrap">
                  SmartCity
                </span>
                <span className="rack-tag hidden sm:inline-block">ESP32</span>
              </div>
            </button>

            <span className="hidden sm:block h-4 w-px bg-[var(--border-line)]" />

            <div
              className="h-7 px-2.5 rounded-md border text-[11px] font-mono font-semibold inline-flex items-center gap-1.5 whitespace-nowrap"
              style={{
                backgroundColor:
                  isHardwareConnected || isSerialConnected ? 'var(--sig-green-bg)' : 'var(--bg-well)',
                borderColor:
                  isHardwareConnected || isSerialConnected
                    ? 'var(--sig-green-border)'
                    : 'var(--border-line)',
                color:
                  isHardwareConnected || isSerialConnected
                    ? 'var(--sig-green)'
                    : 'var(--text-secondary)',
              }}
            >
              <span
                className="w-1.5 h-1.5 rounded-full shrink-0"
                style={{
                  backgroundColor:
                    isHardwareConnected || isSerialConnected
                      ? 'var(--sig-green-dot)'
                      : 'var(--text-secondary)',
                }}
              />
              <span>
                {isSerialConnected
                  ? 'USB COM3 AKTIF'
                  : isHardwareConnected
                  ? 'COM3 ONLINE'
                  : 'SIMULASI'}
              </span>
            </div>

            {isWebSerialSupported && (
              <button
                type="button"
                onClick={isSerialConnected ? disconnectSerial : connectSerial}
                disabled={isConnectingSerial}
                className={`ctrl-btn ctrl-btn-sm font-mono ${
                  isSerialConnected ? 'ctrl-btn-red' : 'ctrl-btn-green'
                }`}
                title="Hubungkan ESP32 langsung lewat kabel USB (COM3) dari browser"
              >
                <span>
                  {isConnectingSerial
                    ? 'Membuka...'
                    : isSerialConnected
                    ? 'Putus USB'
                    : 'Hubungkan USB'}
                </span>
              </button>
            )}
          </div>

          {/* Center: Unified Segmented Module Track (Desktop) */}
          <nav
            aria-label="Pilih Modul Perangkat"
            className="hidden lg:flex items-center seg-group gap-0.5 shrink-0"
          >
            {NAV_MODULES.map((item) => {
              const isActive = activeSubsystem === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveSubsystem(item.id)}
                  className={`h-8 px-3 rounded-[6px] text-xs font-medium inline-flex items-center gap-1.5 whitespace-nowrap transition-colors cursor-pointer ${
                    isActive
                      ? 'bg-[var(--bg-panel)] text-[var(--text-primary)] font-semibold border border-[var(--border-strong)] shadow-2xs'
                      : 'bg-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-transparent'
                  }`}
                >
                  <span>{item.label}</span>
                  {item.id === 'alerts' && unreadAlerts > 0 && (
                    <span
                      className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold leading-none"
                      style={{
                        backgroundColor: 'var(--sig-red-bg)',
                        color: 'var(--sig-red)',
                      }}
                    >
                      {unreadAlerts}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Right: Proportional Hardware Utility Bar */}
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={toggleLiveIoTMode}
              className={`ctrl-btn ctrl-btn-sm font-mono ${
                isLiveIoTMode ? 'ctrl-btn-green' : ''
              }`}
              title={isLiveIoTMode ? 'Sinkronisasi telemetri aktif' : 'Sinkronisasi telemetri dijeda'}
            >
              <span
                className="w-1.5 h-1.5 rounded-full shrink-0"
                style={{
                  backgroundColor: isLiveIoTMode ? 'var(--sig-green-dot)' : 'var(--text-secondary)',
                }}
              />
              <span>{isLiveIoTMode ? 'SYNC ON' : 'PAUSED'}</span>
            </button>

            <button
              type="button"
              onClick={toggleAudioMute}
              className={`ctrl-btn ctrl-btn-sm font-mono ${
                !isAudioMuted ? 'ctrl-btn-active' : ''
              }`}
              aria-label={isAudioMuted ? 'Nyalakan suara alarm' : 'Bisukan suara alarm'}
            >
              <span>{isAudioMuted ? 'MUTE' : 'AUDIO'}</span>
            </button>

            <button
              type="button"
              onClick={toggleTheme}
              className="ctrl-btn ctrl-btn-sm font-mono"
              aria-label={theme === 'light' ? 'Ganti ke tema gelap' : 'Ganti ke tema terang'}
            >
              <span>{theme === 'light' ? 'GELAP' : 'TERANG'}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Bottom Dock (Proportional 6-column Segmented Bar) */}
      <nav
        aria-label="Navigasi Modul Mobile"
        className="lg:hidden fixed bottom-0 left-0 right-0 z-30 bg-[var(--bg-panel)] border-t border-[var(--border-line)] px-2 py-1.5 grid grid-cols-6 gap-1"
      >
        {NAV_MODULES.map((item) => {
          const isActive = activeSubsystem === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setActiveSubsystem(item.id)}
              className={`flex flex-col items-center justify-center rounded-md py-1.5 px-1 min-h-[44px] transition-colors cursor-pointer ${
                isActive
                  ? 'bg-[var(--accent-bg)] text-[var(--accent-text)] border border-[var(--accent-border)] font-semibold'
                  : 'bg-transparent text-[var(--text-secondary)] border border-transparent'
              }`}
            >
              <span className="font-mono text-[10px] font-bold leading-none mb-1 opacity-80">
                {item.code}
              </span>
              <span className="text-[11px] leading-none truncate max-w-full">
                {item.shortLabel}
              </span>
            </button>
          );
        })}
      </nav>
    </>
  );
};
