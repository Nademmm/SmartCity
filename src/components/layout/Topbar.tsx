'use client';

import React from 'react';
import { Volume2, VolumeX, Moon, Sun, Radio } from 'lucide-react';
import { useSmartCity } from '@/context/SmartCityContext';
import { SubsystemType } from '@/types/iot';

const NAV_MODULES: { id: SubsystemType; label: string; shortLabel: string; code: string }[] = [
  { id: 'overview', label: 'Semua Modul', shortLabel: 'Semua', code: 'ALL' },
  { id: 'diorama', label: '3D Miniatur', shortLabel: '3D', code: '3D' },
  { id: 'air-quality', label: 'Polusi & LCD', shortLabel: 'Gas', code: 'MQ' },
  { id: 'pedestrian', label: 'Penyeberangan', shortLabel: 'Touch', code: 'TCH' },
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
      <header className="sticky top-0 z-30 w-full bg-[var(--bg-panel)] border-b border-[var(--border-line)]">
        <div className="max-w-7xl mx-auto min-h-13 px-3 sm:px-6 py-2 flex items-center justify-between gap-2 sm:gap-3">
          {/* Left: Brand Identity & Hardware Port Status */}
          <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
            <button
              type="button"
              onClick={() => setActiveSubsystem('overview')}
              className="flex items-center gap-1.5 sm:gap-2 text-left cursor-pointer bg-transparent border-0 p-0 shrink-0"
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
              <span className="font-semibold text-xs sm:text-sm tracking-tight text-[var(--text-primary)] whitespace-nowrap">
                SmartCity
              </span>
            </button>

            <span className="hidden sm:block h-4 w-px bg-[var(--border-line)] shrink-0" />

            <div
              className="h-7 px-2 rounded-md border text-[10px] sm:text-[11px] font-mono font-semibold inline-flex items-center gap-1 whitespace-nowrap shrink-0"
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
              <span className="sm:hidden">
                {isSerialConnected ? 'USB' : isHardwareConnected ? 'WIFI' : 'SIM'}
              </span>
              <span className="hidden sm:inline">
                {isSerialConnected
                  ? 'USB AKTIF'
                  : isHardwareConnected
                  ? 'WIFI AKTIF'
                  : 'SIMULASI'}
              </span>
            </div>

            {isWebSerialSupported && (
              <button
                type="button"
                onClick={isSerialConnected ? disconnectSerial : connectSerial}
                disabled={isConnectingSerial}
                className={`hidden sm:inline-flex ctrl-btn ctrl-btn-sm font-mono ${
                  isSerialConnected ? 'ctrl-btn-red' : 'ctrl-btn-green'
                }`}
                title="Hubungkan ESP32 langsung lewat kabel USB dari browser"
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

          {/* Right: Compact Utility Bar (Clean Icon Buttons on Mobile, Full Labels on Desktop) */}
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={toggleLiveIoTMode}
              className={`ctrl-btn ctrl-btn-sm font-mono !min-w-[38px] !px-2 sm:!px-2.5 ${
                isLiveIoTMode ? 'ctrl-btn-green' : ''
              }`}
              title={isLiveIoTMode ? 'Sinkronisasi telemetri aktif' : 'Sinkronisasi telemetri dijeda'}
              aria-label={isLiveIoTMode ? 'Sinkronisasi aktif' : 'Sinkronisasi dijeda'}
            >
              <Radio className="w-3.5 h-3.5 sm:hidden shrink-0" />
              <span
                className="hidden sm:inline-block w-1.5 h-1.5 rounded-full shrink-0"
                style={{
                  backgroundColor: isLiveIoTMode ? 'var(--sig-green-dot)' : 'var(--text-secondary)',
                }}
              />
              <span className="hidden sm:inline">{isLiveIoTMode ? 'SYNC' : 'PAUSE'}</span>
            </button>

            <button
              type="button"
              onClick={toggleAudioMute}
              className={`ctrl-btn ctrl-btn-sm font-mono !min-w-[38px] !px-2 sm:!px-2.5 ${
                !isAudioMuted ? 'ctrl-btn-active' : ''
              }`}
              title={isAudioMuted ? 'Nyalakan suara alarm' : 'Bisukan suara alarm'}
              aria-label={isAudioMuted ? 'Nyalakan suara alarm' : 'Bisukan suara alarm'}
            >
              {isAudioMuted ? (
                <VolumeX className="w-3.5 h-3.5 sm:hidden shrink-0" />
              ) : (
                <Volume2 className="w-3.5 h-3.5 sm:hidden shrink-0" />
              )}
              <span className="hidden sm:inline">{isAudioMuted ? 'MUTE' : 'AUDIO'}</span>
            </button>

            <button
              type="button"
              onClick={toggleTheme}
              className="ctrl-btn ctrl-btn-sm font-mono !min-w-[38px] !px-2 sm:!px-2.5"
              title={theme === 'light' ? 'Ganti ke tema gelap' : 'Ganti ke tema terang'}
              aria-label={theme === 'light' ? 'Ganti ke tema gelap' : 'Ganti ke tema terang'}
            >
              {theme === 'light' ? (
                <Moon className="w-3.5 h-3.5 sm:hidden shrink-0" />
              ) : (
                <Sun className="w-3.5 h-3.5 sm:hidden shrink-0" />
              )}
              <span className="hidden sm:inline">{theme === 'light' ? 'GELAP' : 'TERANG'}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Bottom Dock (Clean Scroll-Safe Bar with 44px Tap Targets & Zero Overlap) */}
      <nav
        aria-label="Navigasi Modul Mobile"
        className="lg:hidden fixed bottom-0 left-0 right-0 z-30 w-full max-w-[100vw] bg-[var(--bg-panel)] border-t border-[var(--border-line)] px-2 pt-1.5 pb-[max(0.375rem,env(safe-area-inset-bottom))] flex items-center gap-1 overflow-x-auto"
      >
        {NAV_MODULES.map((item) => {
          const isActive = activeSubsystem === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setActiveSubsystem(item.id)}
              className={`flex-1 min-w-[54px] shrink-0 flex flex-col items-center justify-center rounded-md py-1.5 px-1 min-h-[44px] transition-colors cursor-pointer ${
                isActive
                  ? 'bg-[var(--accent-bg)] text-[var(--accent-text)] border border-[var(--accent-border)] font-semibold'
                  : 'bg-transparent text-[var(--text-secondary)] border border-transparent'
              }`}
            >
              <span className="font-mono text-[10px] font-bold leading-none mb-1 opacity-80">
                {item.code}
              </span>
              <span className="text-[10px] leading-none whitespace-nowrap">
                {item.shortLabel}
              </span>
            </button>
          );
        })}
      </nav>
    </>
  );
};
