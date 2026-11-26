'use client';

import React from 'react';
import { useSmartCity } from '@/context/SmartCityContext';
import { TerminalConsole } from '@/components/common/TerminalConsole';
import { CrossingPhase } from '@/types/iot';

const PHASES: { id: CrossingPhase; label: string; duration: string; detail: string }[] = [
  {
    id: 'NORMAL',
    label: 'NORMAL',
    duration: 'Siaga',
    detail: 'Kendaraan Hijau (12) · Pejalan Merah (27)',
  },
  {
    id: 'KUNING_KENDARAAN',
    label: 'KUNING KENDARAAN',
    duration: '3 detik',
    detail: 'Kendaraan Kuning (14) · Pejalan Merah (27)',
  },
  {
    id: 'KUNING_PEJALAN',
    label: 'KUNING PEJALAN',
    duration: '2 detik',
    detail: 'Kendaraan Merah (32) · Pejalan Kuning (33)',
  },
  {
    id: 'MENYEBRANG',
    label: 'MENYEBRANG',
    duration: '10 detik',
    detail: 'Kendaraan Merah (32) · Pejalan Hijau (23) + Buzzer',
  },
  {
    id: 'KUNING_PENUTUP',
    label: 'KUNING PENUTUP',
    duration: '2 detik',
    detail: 'Kendaraan Merah (32) · Pejalan Kuning (33)',
  },
];

export const PedestrianView: React.FC = () => {
  const {
    crossing,
    buzzerMode,
    triggerCrossingDetection,
    resetCrossingToSafe,
    testBuzzerAlarm,
  } = useSmartCity();

  const isVehicleRed = crossing.lampuKendaraan === 'MERAH';
  const isVehicleYellow = crossing.lampuKendaraan === 'KUNING';
  const isVehicleGreen = crossing.lampuKendaraan === 'HIJAU';

  const isPedRed = crossing.lampuPejalan === 'MERAH';
  const isPedYellow = crossing.lampuPejalan === 'KUNING';
  const isPedGreen = crossing.lampuPejalan === 'HIJAU';

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left: Dual Traffic Light & 5-Stage State Machine + Dual Touch Sensors */}
        <section
          aria-label="Status Dual Traffic Light dan Sensor Touch"
          className="lg:col-span-7 rack-panel flex flex-col"
        >
          <div className="px-4 py-3 bg-[var(--bg-header)] border-b border-[var(--border-line)] flex flex-wrap items-center justify-between gap-2 rounded-t-[10px]">
            <div className="flex items-center gap-2">
              <h2 className="font-semibold text-sm text-[var(--text-primary)]">
                Dual Traffic Light &amp; Sensor Touch
              </h2>
              <span className="rack-tag">TOUCH 16 · 17</span>
            </div>
            <span className="rack-tag">
              FASE: {crossing.lampu}
              {crossing.countdownSeconds > 0 ? ` (${crossing.countdownSeconds}s)` : ''}
            </span>
          </div>

          <div className="p-4 space-y-4 flex-1 flex flex-col justify-between">
            {/* Dual Traffic Light Heads: Kendaraan vs Pejalan Kaki */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Traffic Light 1: Kendaraan */}
              <div className="rack-well p-3.5 space-y-3">
                <div className="flex items-center justify-between font-mono">
                  <span className="text-xs font-semibold text-[var(--text-primary)]">
                    TL 1: Kendaraan
                  </span>
                  <span className="text-[10px] text-[var(--text-secondary)]">
                    PIN 32 · 14 · 12
                  </span>
                </div>

                <div className="flex items-center justify-around py-1">
                  {/* Merah Pin 32 */}
                  <div className="flex flex-col items-center gap-1.5 font-mono">
                    <div
                      className="w-12 h-12 rounded-full border-2 flex items-center justify-center text-xs font-bold transition-colors"
                      style={{
                        backgroundColor: isVehicleRed ? 'var(--sig-red-bg)' : 'var(--bg-panel)',
                        borderColor: isVehicleRed ? 'var(--sig-red-dot)' : 'var(--border-strong)',
                        color: isVehicleRed ? 'var(--sig-red)' : 'var(--text-secondary)',
                      }}
                    >
                      {isVehicleRed
                        ? crossing.countdownSeconds > 0
                          ? `${crossing.countdownSeconds}s`
                          : 'ON'
                        : 'OFF'}
                    </div>
                    <span className="text-[10px] text-[var(--text-secondary)]">M · 32</span>
                  </div>

                  {/* Kuning Pin 14 */}
                  <div className="flex flex-col items-center gap-1.5 font-mono">
                    <div
                      className="w-12 h-12 rounded-full border-2 flex items-center justify-center text-xs font-bold transition-colors"
                      style={{
                        backgroundColor: isVehicleYellow ? 'var(--sig-amber-bg)' : 'var(--bg-panel)',
                        borderColor: isVehicleYellow ? 'var(--sig-amber-dot)' : 'var(--border-strong)',
                        color: isVehicleYellow ? 'var(--sig-amber)' : 'var(--text-secondary)',
                      }}
                    >
                      {isVehicleYellow ? `${crossing.countdownSeconds}s` : 'OFF'}
                    </div>
                    <span className="text-[10px] text-[var(--text-secondary)]">K · 14</span>
                  </div>

                  {/* Hijau Pin 12 */}
                  <div className="flex flex-col items-center gap-1.5 font-mono">
                    <div
                      className="w-12 h-12 rounded-full border-2 flex items-center justify-center text-xs font-bold transition-colors"
                      style={{
                        backgroundColor: isVehicleGreen ? 'var(--sig-green-bg)' : 'var(--bg-panel)',
                        borderColor: isVehicleGreen ? 'var(--sig-green-dot)' : 'var(--border-strong)',
                        color: isVehicleGreen ? 'var(--sig-green)' : 'var(--text-secondary)',
                      }}
                    >
                      {isVehicleGreen ? 'ON' : 'OFF'}
                    </div>
                    <span className="text-[10px] text-[var(--text-secondary)]">H · 12</span>
                  </div>
                </div>
              </div>

              {/* Traffic Light 2: Pejalan Kaki */}
              <div className="rack-well p-3.5 space-y-3">
                <div className="flex items-center justify-between font-mono">
                  <span className="text-xs font-semibold text-[var(--text-primary)]">
                    TL 2: Pejalan Kaki
                  </span>
                  <span className="text-[10px] text-[var(--text-secondary)]">
                    PIN 27 · 33 · 23
                  </span>
                </div>

                <div className="flex items-center justify-around py-1">
                  {/* Merah Pin 27 */}
                  <div className="flex flex-col items-center gap-1.5 font-mono">
                    <div
                      className="w-12 h-12 rounded-full border-2 flex items-center justify-center text-xs font-bold transition-colors"
                      style={{
                        backgroundColor: isPedRed ? 'var(--sig-red-bg)' : 'var(--bg-panel)',
                        borderColor: isPedRed ? 'var(--sig-red-dot)' : 'var(--border-strong)',
                        color: isPedRed ? 'var(--sig-red)' : 'var(--text-secondary)',
                      }}
                    >
                      {isPedRed ? 'ON' : 'OFF'}
                    </div>
                    <span className="text-[10px] text-[var(--text-secondary)]">M · 27</span>
                  </div>

                  {/* Kuning Pin 33 */}
                  <div className="flex flex-col items-center gap-1.5 font-mono">
                    <div
                      className="w-12 h-12 rounded-full border-2 flex items-center justify-center text-xs font-bold transition-colors"
                      style={{
                        backgroundColor: isPedYellow ? 'var(--sig-amber-bg)' : 'var(--bg-panel)',
                        borderColor: isPedYellow ? 'var(--sig-amber-dot)' : 'var(--border-strong)',
                        color: isPedYellow ? 'var(--sig-amber)' : 'var(--text-secondary)',
                      }}
                    >
                      {isPedYellow ? `${crossing.countdownSeconds}s` : 'OFF'}
                    </div>
                    <span className="text-[10px] text-[var(--text-secondary)]">K · 33</span>
                  </div>

                  {/* Hijau Pin 23 */}
                  <div className="flex flex-col items-center gap-1.5 font-mono">
                    <div
                      className="w-12 h-12 rounded-full border-2 flex items-center justify-center text-xs font-bold transition-colors"
                      style={{
                        backgroundColor: isPedGreen ? 'var(--sig-green-bg)' : 'var(--bg-panel)',
                        borderColor: isPedGreen ? 'var(--sig-green-dot)' : 'var(--border-strong)',
                        color: isPedGreen ? 'var(--sig-green)' : 'var(--text-secondary)',
                      }}
                    >
                      {isPedGreen ? `${crossing.countdownSeconds}s` : 'OFF'}
                    </div>
                    <span className="text-[10px] text-[var(--text-secondary)]">H · 23</span>
                  </div>
                </div>
              </div>
            </div>

            {/* 5-Stage Firmware State Machine */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {PHASES.map((phase, idx) => {
                const active = crossing.lampu === phase.id;
                return (
                  <div
                    key={phase.id}
                    className="p-2.5 rounded-lg border font-mono flex flex-col justify-center"
                    style={{
                      backgroundColor: active ? 'var(--accent-bg)' : 'var(--bg-well)',
                      borderColor: active ? 'var(--accent-border)' : 'var(--border-line)',
                    }}
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-[11px] font-bold text-[var(--text-primary)] truncate">
                        {idx + 1}. {phase.label}
                      </span>
                      <span className="text-[10px] text-[var(--text-secondary)] shrink-0">
                        {phase.duration}
                      </span>
                    </div>
                    <div className="text-[10px] text-[var(--text-secondary)] mt-1">
                      {phase.detail}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Dual Capacitive Touch Sensor Status Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Touch Kanan (Pin 17) */}
              <div className="rack-well p-3.5 space-y-2.5">
                <div className="flex items-center justify-between font-mono">
                  <span className="text-xs font-semibold">Touch Kanan (GPIO 17)</span>
                  <span
                    className="text-[11px] font-bold px-2 py-0.5 rounded border"
                    style={{
                      backgroundColor: crossing.touchKanan ? 'var(--sig-amber-bg)' : 'var(--sig-green-bg)',
                      borderColor: crossing.touchKanan ? 'var(--sig-amber-border)' : 'var(--sig-green-border)',
                      color: crossing.touchKanan ? 'var(--sig-amber)' : 'var(--sig-green)',
                    }}
                  >
                    {crossing.touchKanan ? 'DISENTUH (HIGH)' : 'SIAGA (LOW)'}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => triggerCrossingDetection('kanan')}
                  className="ctrl-btn w-full min-h-[44px] font-mono justify-between px-3"
                >
                  <span>Sentuh Sensor Kanan</span>
                  <span className="text-[11px] text-[var(--text-secondary)]">PIN 17</span>
                </button>
              </div>

              {/* Touch Kiri (Pin 16) */}
              <div className="rack-well p-3.5 space-y-2.5">
                <div className="flex items-center justify-between font-mono">
                  <span className="text-xs font-semibold">Touch Kiri (GPIO 16)</span>
                  <span
                    className="text-[11px] font-bold px-2 py-0.5 rounded border"
                    style={{
                      backgroundColor: crossing.touchKiri ? 'var(--sig-amber-bg)' : 'var(--sig-green-bg)',
                      borderColor: crossing.touchKiri ? 'var(--sig-amber-border)' : 'var(--sig-green-border)',
                      color: crossing.touchKiri ? 'var(--sig-amber)' : 'var(--sig-green)',
                    }}
                  >
                    {crossing.touchKiri ? 'DISENTUH (HIGH)' : 'SIAGA (LOW)'}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => triggerCrossingDetection('kiri')}
                  className="ctrl-btn w-full min-h-[44px] font-mono justify-between px-3"
                >
                  <span>Sentuh Sensor Kiri</span>
                  <span className="text-[11px] text-[var(--text-secondary)]">PIN 16</span>
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Right: Direct Controls & Buzzer Status */}
        <section aria-label="Panel Kontrol Penyeberangan" className="lg:col-span-5 rack-panel flex flex-col">
          <div className="px-4 py-3 bg-[var(--bg-header)] border-b border-[var(--border-line)] flex items-center justify-between gap-2 rounded-t-[10px]">
            <h3 className="font-semibold text-sm text-[var(--text-primary)]">
              Kontrol Penyeberangan
            </h3>
            <span className="rack-tag">
              STATUS: {crossing.statusRingkasan}
            </span>
          </div>

          <div className="p-4 flex-1 flex flex-col justify-between gap-4">
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => triggerCrossingDetection('force')}
                className="ctrl-btn ctrl-btn-red w-full min-h-[44px] font-mono justify-between px-3.5"
              >
                <span>Mulai Siklus Penyeberangan</span>
                <span className="text-[11px] opacity-80">CMD:FORCE_CROSSING</span>
              </button>

              <button
                type="button"
                onClick={() => triggerCrossingDetection('kanan')}
                className="ctrl-btn w-full min-h-[44px] font-mono justify-between px-3.5"
              >
                <span>Uji Touch Kanan (Pin 17)</span>
                <span className="text-[11px] text-[var(--text-secondary)]">CMD:TOUCH_KANAN</span>
              </button>

              <button
                type="button"
                onClick={() => triggerCrossingDetection('kiri')}
                className="ctrl-btn w-full min-h-[44px] font-mono justify-between px-3.5"
              >
                <span>Uji Touch Kiri (Pin 16)</span>
                <span className="text-[11px] text-[var(--text-secondary)]">CMD:TOUCH_KIRI</span>
              </button>

              <button
                type="button"
                onClick={resetCrossingToSafe}
                className="ctrl-btn ctrl-btn-green w-full min-h-[44px] font-mono justify-between px-3.5"
              >
                <span>Reset ke Kondisi Normal</span>
                <span className="text-[11px] opacity-80">CMD:CROSSING_RESET</span>
              </button>
            </div>

            <div className="pt-3 border-t border-[var(--border-line)] space-y-2.5">
              <div className="rack-well p-3 space-y-1.5 font-mono text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-[var(--text-secondary)]">Pemicu Terakhir</span>
                  <span className="font-semibold text-[var(--text-primary)]">
                    {crossing.sumberTerakhir || 'Belum ada'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[var(--text-secondary)]">Buzzer Seberang (Pin 4)</span>
                  <span
                    className="font-bold"
                    style={{
                      color:
                        buzzerMode === 'seberang' || buzzerMode === 'both'
                          ? 'var(--sig-red)'
                          : 'var(--text-secondary)',
                    }}
                  >
                    {buzzerMode === 'both'
                      ? 'BERGANTIAN (2.5s)'
                      : buzzerMode === 'seberang'
                      ? 'AKTIF (MENYEBRANG)'
                      : 'SIAGA (OFF)'}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={testBuzzerAlarm}
                className="ctrl-btn ctrl-btn-amber w-full min-h-[44px] font-mono"
              >
                Uji Buzzer [CMD:BUZZER_TEST]
              </button>
            </div>
          </div>
        </section>
      </div>

      <TerminalConsole
        filterFeature="penyeberangan"
        title="Log Serial: Penyeberangan Sensor Touch"
        maxHeight="max-h-60"
      />
    </div>
  );
};
