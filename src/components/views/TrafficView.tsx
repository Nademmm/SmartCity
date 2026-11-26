'use client';

import React from 'react';
import { useSmartCity } from '@/context/SmartCityContext';
import { LiveWebcamFeed } from '@/components/common/LiveWebcamFeed';

export const TrafficView: React.FC = () => {
  const {
    traffic,
    triggerTrafficEmergency,
    setTrafficModeAuto,
    setTrafficLightManual,
  } = useSmartCity();

  const carCount = traffic.vehicleCount;
  const isMacet = carCount >= 6;
  const isPadat = carCount >= 3 && carCount < 6;
  const progressPct = Math.min(100, Math.round((carCount / 6) * 100));

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left: Live Camera & Vision Feed */}
        <div className="lg:col-span-8">
          <LiveWebcamFeed />
        </div>

        {/* Right: Congestion Status & Signal Controller */}
        <section
          aria-label="Panel Status Kemacetan dan Kontrol Sinyal"
          className="lg:col-span-4 rack-panel flex flex-col"
        >
          <div className="px-4 py-3 bg-[var(--bg-header)] border-b border-[var(--border-line)] flex items-center justify-between gap-2 rounded-t-[10px]">
            <h2 className="font-semibold text-sm text-[var(--text-primary)]">
              Status Kemacetan &amp; Lampu
            </h2>
            <span className="rack-tag">
              {traffic.isAutomatic ? 'AUTO' : 'MANUAL'}
            </span>
          </div>

          <div className="p-4 flex-1 flex flex-col justify-between gap-4">
            {/* Live Car Congestion Readout (Strictly from Current Camera Frame) */}
            <div className="space-y-3 font-mono">
              <div
                className="p-4 rounded-lg border flex items-center justify-between"
                style={{
                  backgroundColor: isMacet
                    ? 'var(--sig-red-bg)'
                    : isPadat
                    ? 'var(--sig-amber-bg)'
                    : 'var(--sig-green-bg)',
                  borderColor: isMacet
                    ? 'var(--sig-red-border)'
                    : isPadat
                    ? 'var(--sig-amber-border)'
                    : 'var(--sig-green-border)',
                }}
              >
                <div>
                  <span className="text-[11px] text-[var(--text-secondary)] block">
                    MOBIL TAMPIL DI KAMERA
                  </span>
                  <span
                    className="text-3xl font-bold tracking-tight"
                    style={{
                      color: isMacet
                        ? 'var(--sig-red)'
                        : isPadat
                        ? 'var(--sig-amber)'
                        : 'var(--sig-green)',
                    }}
                  >
                    {carCount} <span className="text-sm font-semibold">Mobil</span>
                  </span>
                </div>

                <div className="text-right">
                  <span className="text-[11px] text-[var(--text-secondary)] block">
                    KONDISI JALAN
                  </span>
                  <span
                    className="text-base font-bold"
                    style={{
                      color: isMacet
                        ? 'var(--sig-red)'
                        : isPadat
                        ? 'var(--sig-amber)'
                        : 'var(--sig-green)',
                    }}
                  >
                    {isMacet ? 'MACET TOTAL' : isPadat ? 'PADAT' : 'LANCAR'}
                  </span>
                </div>
              </div>

              {/* 6-Car Congestion Meter */}
              <div className="rack-well p-3.5 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[var(--text-secondary)]">Ambang Kemacetan</span>
                  <span className="font-bold">
                    {carCount} / 6 Mobil ({traffic.density}%)
                  </span>
                </div>

                <div className="w-full h-2.5 bg-[var(--bg-panel)] rounded-full border border-[var(--border-line)] overflow-hidden">
                  <div
                    className="h-full transition-all duration-150 rounded-full"
                    style={{
                      width: `${progressPct}%`,
                      backgroundColor: isMacet
                        ? 'var(--sig-red-dot)'
                        : isPadat
                        ? 'var(--sig-amber-dot)'
                        : 'var(--sig-green-dot)',
                    }}
                  />
                </div>

                <div className="grid grid-cols-3 gap-1.5 pt-1 text-[11px]">
                  <div className="p-2 rounded bg-[var(--bg-panel)] border border-[var(--border-line)] text-center">
                    <span className="text-[10px] text-[var(--text-secondary)] block">0 - 2 Mobil</span>
                    <span className="font-bold" style={{ color: 'var(--sig-green)' }}>
                      LANCAR
                    </span>
                  </div>
                  <div className="p-2 rounded bg-[var(--bg-panel)] border border-[var(--border-line)] text-center">
                    <span className="text-[10px] text-[var(--text-secondary)] block">3 - 5 Mobil</span>
                    <span className="font-bold" style={{ color: 'var(--sig-amber)' }}>
                      PADAT
                    </span>
                  </div>
                  <div className="p-2 rounded bg-[var(--bg-panel)] border border-[var(--border-line)] text-center">
                    <span className="text-[10px] text-[var(--text-secondary)] block">&gt;= 6 Mobil</span>
                    <span className="font-bold" style={{ color: 'var(--sig-red)' }}>
                      MACET
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* 3-Lamp Intersection Signal Controller */}
            <div className="pt-3 border-t border-[var(--border-line)] space-y-3">
              <div className="rack-well p-3.5 flex items-center justify-between font-mono">
                <div className="flex items-center gap-2.5">
                  <div
                    className="w-10 h-10 rounded-full border-2 flex items-center justify-center text-xs font-bold"
                    style={{
                      backgroundColor:
                        traffic.currentLight === 'red' ? 'var(--sig-red-bg)' : 'var(--bg-panel)',
                      borderColor:
                        traffic.currentLight === 'red'
                          ? 'var(--sig-red-dot)'
                          : 'var(--border-strong)',
                      color:
                        traffic.currentLight === 'red'
                          ? 'var(--sig-red)'
                          : 'var(--text-secondary)',
                    }}
                  >
                    {traffic.currentLight === 'red' ? `${traffic.countdownSeconds}s` : 'M'}
                  </div>

                  <div
                    className="w-10 h-10 rounded-full border-2 flex items-center justify-center text-xs font-bold"
                    style={{
                      backgroundColor:
                        traffic.currentLight === 'yellow'
                          ? 'var(--sig-amber-bg)'
                          : 'var(--bg-panel)',
                      borderColor:
                        traffic.currentLight === 'yellow'
                          ? 'var(--sig-amber-dot)'
                          : 'var(--border-strong)',
                      color:
                        traffic.currentLight === 'yellow'
                          ? 'var(--sig-amber)'
                          : 'var(--text-secondary)',
                    }}
                  >
                    {traffic.currentLight === 'yellow' ? `${traffic.countdownSeconds}s` : 'K'}
                  </div>

                  <div
                    className="w-10 h-10 rounded-full border-2 flex items-center justify-center text-xs font-bold"
                    style={{
                      backgroundColor:
                        traffic.currentLight === 'green'
                          ? 'var(--sig-green-bg)'
                          : 'var(--bg-panel)',
                      borderColor:
                        traffic.currentLight === 'green'
                          ? 'var(--sig-green-dot)'
                          : 'var(--border-strong)',
                      color:
                        traffic.currentLight === 'green'
                          ? 'var(--sig-green)'
                          : 'var(--text-secondary)',
                    }}
                  >
                    {traffic.currentLight === 'green' ? `${traffic.countdownSeconds}s` : 'H'}
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[10px] text-[var(--text-secondary)] block">
                    SINYAL SIMPANG
                  </span>
                  <span className="text-sm font-bold uppercase">{traffic.currentLight}</span>
                </div>
              </div>

              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setTrafficModeAuto(true)}
                    className={`ctrl-btn font-mono ${
                      traffic.isAutomatic ? 'ctrl-btn-active' : ''
                    }`}
                  >
                    Mode Auto
                  </button>
                  <button
                    type="button"
                    onClick={() => setTrafficModeAuto(false)}
                    className={`ctrl-btn font-mono ${
                      !traffic.isAutomatic ? 'ctrl-btn-active' : ''
                    }`}
                  >
                    Mode Manual
                  </button>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setTrafficLightManual('green')}
                    className={`ctrl-btn font-mono ${
                      traffic.currentLight === 'green' ? 'ctrl-btn-green' : ''
                    }`}
                  >
                    Hijau
                  </button>
                  <button
                    type="button"
                    onClick={() => setTrafficLightManual('yellow')}
                    className={`ctrl-btn font-mono ${
                      traffic.currentLight === 'yellow' ? 'ctrl-btn-amber' : ''
                    }`}
                  >
                    Kuning
                  </button>
                  <button
                    type="button"
                    onClick={() => setTrafficLightManual('red')}
                    className={`ctrl-btn font-mono ${
                      traffic.currentLight === 'red' ? 'ctrl-btn-red' : ''
                    }`}
                  >
                    Merah
                  </button>
                </div>

                <button
                  type="button"
                  onClick={triggerTrafficEmergency}
                  className="ctrl-btn ctrl-btn-green w-full font-mono"
                >
                  Prioritas Hijau Pengurai Macet (45s)
                </button>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};
