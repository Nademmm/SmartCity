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

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left: Live Camera & Vision Feed */}
        <div className="lg:col-span-8">
          <LiveWebcamFeed />
        </div>

        {/* Right: Signal Controller & Vehicle Counter */}
        <section aria-label="Panel Kontrol Sinyal Simpang" className="lg:col-span-4 rack-panel flex flex-col">
          <div className="px-4 py-3 bg-[var(--bg-header)] border-b border-[var(--border-line)] flex items-center justify-between gap-2 rounded-t-[10px]">
            <h2 className="font-semibold text-sm text-[var(--text-primary)]">
              Kontrol Sinyal Simpang
            </h2>
            <span className="rack-tag">
              {traffic.isAutomatic ? 'AUTO' : 'MANUAL'}
            </span>
          </div>

          <div className="p-4 flex-1 flex flex-col justify-between gap-4">
            <div className="space-y-4">
              {/* 3-Lamp Signal Display */}
              <div className="rack-well p-3.5 flex items-center justify-between font-mono">
                <div className="flex items-center gap-2.5">
                  <div
                    className="w-10 h-10 rounded-full border-2 flex items-center justify-center text-xs font-bold"
                    style={{
                      backgroundColor:
                        traffic.currentLight === 'red' ? 'var(--sig-red-bg)' : 'var(--bg-panel)',
                      borderColor:
                        traffic.currentLight === 'red' ? 'var(--sig-red-dot)' : 'var(--border-strong)',
                      color:
                        traffic.currentLight === 'red' ? 'var(--sig-red)' : 'var(--text-secondary)',
                    }}
                  >
                    {traffic.currentLight === 'red' ? `${traffic.countdownSeconds}s` : 'M'}
                  </div>

                  <div
                    className="w-10 h-10 rounded-full border-2 flex items-center justify-center text-xs font-bold"
                    style={{
                      backgroundColor:
                        traffic.currentLight === 'yellow' ? 'var(--sig-amber-bg)' : 'var(--bg-panel)',
                      borderColor:
                        traffic.currentLight === 'yellow' ? 'var(--sig-amber-dot)' : 'var(--border-strong)',
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
                        traffic.currentLight === 'green' ? 'var(--sig-green-bg)' : 'var(--bg-panel)',
                      borderColor:
                        traffic.currentLight === 'green' ? 'var(--sig-green-dot)' : 'var(--border-strong)',
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
                  <span className="text-[10px] text-[var(--text-secondary)] block">FASE AKTIF</span>
                  <span className="text-sm font-bold uppercase">{traffic.currentLight}</span>
                </div>
              </div>

              {/* Mode & Phase Controls */}
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
                  Prioritas Hijau Darurat (45s)
                </button>
              </div>
            </div>

            {/* Vehicle Classification Grid */}
            <div className="pt-3 border-t border-[var(--border-line)] space-y-2.5 font-mono">
              <div className="flex justify-between text-xs">
                <span className="text-[var(--text-secondary)]">Kepadatan Simpang</span>
                <span className="font-bold">
                  {traffic.density}% ({traffic.statusText})
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="rack-well p-3">
                  <span className="text-[10px] text-[var(--text-secondary)] block">MOBIL</span>
                  <span className="text-lg font-bold">{traffic.vehicleCounts?.mobil ?? 0}</span>
                </div>
                <div className="rack-well p-3">
                  <span className="text-[10px] text-[var(--text-secondary)] block">MOTOR</span>
                  <span className="text-lg font-bold">{traffic.vehicleCounts?.motor ?? 0}</span>
                </div>
                <div className="rack-well p-3">
                  <span className="text-[10px] text-[var(--text-secondary)] block">BUS</span>
                  <span className="text-lg font-bold">{traffic.vehicleCounts?.bus ?? 0}</span>
                </div>
                <div className="rack-well p-3">
                  <span className="text-[10px] text-[var(--text-secondary)] block">TRUK</span>
                  <span className="text-lg font-bold">{traffic.vehicleCounts?.truk ?? 0}</span>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};
