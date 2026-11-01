'use client';

import React from 'react';
import { useSmartCity } from '@/context/SmartCityContext';
import { TerminalConsole } from '@/components/common/TerminalConsole';
import { CrossingPhase } from '@/types/iot';

const PHASES: { id: CrossingPhase; label: string; detail: string }[] = [
  { id: 'HIJAU', label: 'HIJAU', detail: 'LED 12 ON · Siap Deteksi' },
  { id: 'KUNING', label: 'KUNING', detail: 'LED 14 ON · Transisi 1000ms' },
  { id: 'MERAH', label: 'MERAH', detail: 'LED 27 ON · Menyeberang 5000ms' },
  { id: 'TUNGGU_KOSONG', label: 'TUNGGU_KOSONG', detail: 'LED 12 ON · Tunggu Area Kosong' },
];

export const PedestrianView: React.FC = () => {
  const {
    crossing,
    buzzerMode,
    triggerCrossingDetection,
    resetCrossingToSafe,
    updateUltrasonicDistances,
    testBuzzerAlarm,
  } = useSmartCity();

  const kananVal = crossing.jarakKanan ?? 40;
  const kiriVal = crossing.jarakKiri ?? 40;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left: 4-Stage State Machine & Ultrasonic Sensors */}
        <section aria-label="Status Siklus Penyeberangan" className="lg:col-span-7 rack-panel flex flex-col">
          <div className="px-4 py-3 bg-[var(--bg-header)] border-b border-[var(--border-line)] flex items-center justify-between gap-2 rounded-t-[10px]">
            <div className="flex items-center gap-2">
              <h2 className="font-semibold text-sm text-[var(--text-primary)]">
                Siklus Lampu Penyeberangan
              </h2>
              <span className="rack-tag">LED 12 · 14 · 27</span>
            </div>
            <span className="rack-tag">FASE: {crossing.lampu}</span>
          </div>

          <div className="p-4 space-y-4 flex-1 flex flex-col justify-between">
            {/* 3-Lamp Signal Head & Phase Stepper */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-stretch">
              <div className="sm:col-span-5 rack-well p-4 flex items-center justify-around">
                {/* MERAH (Pin 27) */}
                <div className="flex flex-col items-center gap-1.5 font-mono">
                  <div
                    className="w-12 h-12 rounded-full border-2 flex items-center justify-center text-xs font-bold"
                    style={{
                      backgroundColor:
                        crossing.lampu === 'MERAH' ? 'var(--sig-red-bg)' : 'var(--bg-panel)',
                      borderColor:
                        crossing.lampu === 'MERAH' ? 'var(--sig-red-dot)' : 'var(--border-strong)',
                      color:
                        crossing.lampu === 'MERAH' ? 'var(--sig-red)' : 'var(--text-secondary)',
                    }}
                  >
                    {crossing.lampu === 'MERAH' ? `${crossing.countdownSeconds}s` : 'OFF'}
                  </div>
                  <span className="text-[10px] text-[var(--text-secondary)]">PIN 27</span>
                </div>

                {/* KUNING (Pin 14) */}
                <div className="flex flex-col items-center gap-1.5 font-mono">
                  <div
                    className="w-12 h-12 rounded-full border-2 flex items-center justify-center text-xs font-bold"
                    style={{
                      backgroundColor:
                        crossing.lampu === 'KUNING' ? 'var(--sig-amber-bg)' : 'var(--bg-panel)',
                      borderColor:
                        crossing.lampu === 'KUNING' ? 'var(--sig-amber-dot)' : 'var(--border-strong)',
                      color:
                        crossing.lampu === 'KUNING' ? 'var(--sig-amber)' : 'var(--text-secondary)',
                    }}
                  >
                    {crossing.lampu === 'KUNING' ? '1s' : 'OFF'}
                  </div>
                  <span className="text-[10px] text-[var(--text-secondary)]">PIN 14</span>
                </div>

                {/* HIJAU (Pin 12) */}
                <div className="flex flex-col items-center gap-1.5 font-mono">
                  <div
                    className="w-12 h-12 rounded-full border-2 flex items-center justify-center text-xs font-bold"
                    style={{
                      backgroundColor:
                        crossing.lampu === 'HIJAU' || crossing.lampu === 'TUNGGU_KOSONG'
                          ? 'var(--sig-green-bg)'
                          : 'var(--bg-panel)',
                      borderColor:
                        crossing.lampu === 'HIJAU' || crossing.lampu === 'TUNGGU_KOSONG'
                          ? 'var(--sig-green-dot)'
                          : 'var(--border-strong)',
                      color:
                        crossing.lampu === 'HIJAU' || crossing.lampu === 'TUNGGU_KOSONG'
                          ? 'var(--sig-green)'
                          : 'var(--text-secondary)',
                    }}
                  >
                    {crossing.lampu === 'HIJAU' || crossing.lampu === 'TUNGGU_KOSONG' ? 'ON' : 'OFF'}
                  </div>
                  <span className="text-[10px] text-[var(--text-secondary)]">PIN 12</span>
                </div>
              </div>

              {/* 4-Stage Firmware State Machine */}
              <div className="sm:col-span-7 grid grid-cols-2 gap-2">
                {PHASES.map((phase) => {
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
                      <div className="text-xs font-bold text-[var(--text-primary)]">{phase.label}</div>
                      <div className="text-[10px] text-[var(--text-secondary)] mt-0.5">
                        {phase.detail}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Dual Ultrasonic Distance Readouts & Sliders */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Sensor Kanan */}
              <div className="rack-well p-3.5 space-y-2">
                <div className="flex items-center justify-between font-mono">
                  <span className="text-xs font-semibold">Kanan (Pin 32/34)</span>
                  <span
                    className="text-[11px] font-bold px-2 py-0.5 rounded border"
                    style={{
                      backgroundColor: crossing.orangKanan ? 'var(--sig-red-bg)' : 'var(--sig-green-bg)',
                      borderColor: crossing.orangKanan ? 'var(--sig-red-border)' : 'var(--sig-green-border)',
                      color: crossing.orangKanan ? 'var(--sig-red)' : 'var(--sig-green)',
                    }}
                  >
                    {crossing.orangKanan ? 'TERDETEKSI' : 'KOSONG'}
                  </span>
                </div>

                <div className="flex items-baseline justify-between font-mono">
                  <span className="text-2xl font-bold">
                    {crossing.jarakKanan !== null ? `${crossing.jarakKanan.toFixed(1)} cm` : 'NULL'}
                  </span>
                  <span className="text-xs text-[var(--text-secondary)]">Batas &lt;= 17 cm</span>
                </div>

                <input
                  type="range"
                  min="2"
                  max="80"
                  value={kananVal}
                  onChange={(e) =>
                    updateUltrasonicDistances(Number(e.target.value), crossing.jarakKiri)
                  }
                  className="ctrl-range"
                  aria-label="Simulasi Jarak Ultrasonik Kanan"
                />
              </div>

              {/* Sensor Kiri */}
              <div className="rack-well p-3.5 space-y-2">
                <div className="flex items-center justify-between font-mono">
                  <span className="text-xs font-semibold">Kiri (Pin 33/35)</span>
                  <span
                    className="text-[11px] font-bold px-2 py-0.5 rounded border"
                    style={{
                      backgroundColor: crossing.orangKiri ? 'var(--sig-red-bg)' : 'var(--sig-green-bg)',
                      borderColor: crossing.orangKiri ? 'var(--sig-red-border)' : 'var(--sig-green-border)',
                      color: crossing.orangKiri ? 'var(--sig-red)' : 'var(--sig-green)',
                    }}
                  >
                    {crossing.orangKiri ? 'TERDETEKSI' : 'KOSONG'}
                  </span>
                </div>

                <div className="flex items-baseline justify-between font-mono">
                  <span className="text-2xl font-bold">
                    {crossing.jarakKiri !== null ? `${crossing.jarakKiri.toFixed(1)} cm` : 'NULL'}
                  </span>
                  <span className="text-xs text-[var(--text-secondary)]">Batas &lt;= 25 cm</span>
                </div>

                <input
                  type="range"
                  min="2"
                  max="80"
                  value={kiriVal}
                  onChange={(e) =>
                    updateUltrasonicDistances(crossing.jarakKanan, Number(e.target.value))
                  }
                  className="ctrl-range"
                  aria-label="Simulasi Jarak Ultrasonik Kiri"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Right: Direct Controls */}
        <section aria-label="Panel Kontrol Penyeberangan" className="lg:col-span-5 rack-panel flex flex-col">
          <div className="px-4 py-3 bg-[var(--bg-header)] border-b border-[var(--border-line)] flex items-center justify-between gap-2 rounded-t-[10px]">
            <h3 className="font-semibold text-sm text-[var(--text-primary)]">
              Kontrol Penyeberangan
            </h3>
            <span className="rack-tag">
              SIAP: {crossing.siapMenyeberang ? 'TRUE' : 'FALSE'}
            </span>
          </div>

          <div className="p-4 flex-1 flex flex-col justify-between gap-4">
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => triggerCrossingDetection('force')}
                className="ctrl-btn ctrl-btn-red w-full font-mono justify-between px-3.5"
              >
                <span>Paksa Penyeberangan</span>
                <span className="text-[11px] opacity-80">CMD:FORCE_CROSSING</span>
              </button>

              <button
                type="button"
                onClick={() => triggerCrossingDetection('kanan')}
                className="ctrl-btn w-full font-mono justify-between px-3.5"
              >
                <span>Uji Objek Kanan (12 cm)</span>
                <span className="text-[11px] text-[var(--text-secondary)]">&lt;= 17 cm</span>
              </button>

              <button
                type="button"
                onClick={() => triggerCrossingDetection('kiri')}
                className="ctrl-btn w-full font-mono justify-between px-3.5"
              >
                <span>Uji Objek Kiri (18 cm)</span>
                <span className="text-[11px] text-[var(--text-secondary)]">&lt;= 25 cm</span>
              </button>

              <button
                type="button"
                onClick={() => triggerCrossingDetection('kedua')}
                className="ctrl-btn w-full font-mono justify-between px-3.5"
              >
                <span>Uji Kedua Sisi Serentak</span>
                <span className="text-[11px] text-[var(--text-secondary)]">12 cm &amp; 18 cm</span>
              </button>

              <button
                type="button"
                onClick={resetCrossingToSafe}
                className="ctrl-btn ctrl-btn-green w-full font-mono justify-between px-3.5"
              >
                <span>Kosongkan Area &amp; Reset Hijau</span>
                <span className="text-[11px] opacity-80">35 cm &amp; 42 cm</span>
              </button>
            </div>

            <div className="pt-3 border-t border-[var(--border-line)] space-y-2.5">
              <div className="rack-well p-3 flex items-center justify-between font-mono text-xs">
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
                    ? 'AKTIF (MERAH)'
                    : 'SIAGA (OFF)'}
                </span>
              </div>

              <button
                type="button"
                onClick={testBuzzerAlarm}
                className="ctrl-btn ctrl-btn-amber w-full font-mono"
              >
                Uji Buzzer [CMD:BUZZER_TEST]
              </button>
            </div>
          </div>
        </section>
      </div>

      <TerminalConsole
        filterFeature="penyeberangan"
        title="Log Serial: Penyeberangan Ultrasonik"
        maxHeight="max-h-60"
      />
    </div>
  );
};
