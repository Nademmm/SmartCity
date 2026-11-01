'use client';

import React from 'react';
import { useSmartCity } from '@/context/SmartCityContext';
import { TerminalConsole } from '@/components/common/TerminalConsole';

export const LightingView: React.FC = () => {
  const { pju, setLdrValue, controlPjuManual } = useSmartCity();

  const isMenyala = pju.pjuStatus === 'MENYALA';
  const ldrPct = Math.min(100, Math.round((pju.ldrValue / 4095) * 100));

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left: LDR Readout & Dual LED Actuators */}
        <section aria-label="Status Sensor LDR dan Lampu PJU" className="lg:col-span-7 rack-panel flex flex-col">
          <div className="px-4 py-3 bg-[var(--bg-header)] border-b border-[var(--border-line)] flex items-center justify-between gap-2 rounded-t-[10px]">
            <div className="flex items-center gap-2">
              <h2 className="font-semibold text-sm text-[var(--text-primary)]">
                Smart PJU (Sensor LDR &amp; Kontrol Web)
              </h2>
              <span className="rack-tag">ADC PIN 36</span>
            </div>
            <span
              className="px-2.5 py-0.5 rounded-md text-xs font-mono font-bold border"
              style={{
                backgroundColor: isMenyala ? 'var(--sig-amber-bg)' : 'var(--bg-well)',
                borderColor: isMenyala ? 'var(--sig-amber-border)' : 'var(--border-line)',
                color: isMenyala ? 'var(--sig-amber)' : 'var(--text-secondary)',
              }}
            >
              PJU: {pju.pjuStatus} ({pju.pjuMode})
            </span>
          </div>

          <div className="p-4 space-y-4 flex-1 flex flex-col justify-between">
            {/* Dual Physical LED Readouts (Pin 25 & Pin 26) */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 font-mono">
              <div className="rack-well p-3.5 flex flex-col justify-between">
                <span className="text-[11px] text-[var(--text-secondary)]">KONDISI CAHAYA</span>
                <span className="text-lg font-bold mt-1.5">{pju.kondisi}</span>
                <span className="text-[11px] text-[var(--text-secondary)] mt-1">
                  Mode: {pju.pjuMode}
                </span>
              </div>

              <div
                className="p-3.5 rounded-lg border flex flex-col justify-between"
                style={{
                  backgroundColor: pju.ledMerah ? 'var(--sig-red-bg)' : 'var(--bg-well)',
                  borderColor: pju.ledMerah ? 'var(--sig-red-border)' : 'var(--border-line)',
                }}
              >
                <span className="text-[11px] text-[var(--text-secondary)]">LED MERAH PJU</span>
                <span
                  className="text-lg font-bold mt-1.5"
                  style={{ color: pju.ledMerah ? 'var(--sig-red)' : 'var(--text-secondary)' }}
                >
                  {pju.ledMerah ? 'ON (MENYALA)' : 'OFF (MATI)'}
                </span>
                <span className="text-[11px] text-[var(--text-secondary)] mt-1">GPIO PIN 25</span>
              </div>

              <div
                className="p-3.5 rounded-lg border flex flex-col justify-between"
                style={{
                  backgroundColor: pju.ledPutih ? 'var(--sig-amber-bg)' : 'var(--bg-well)',
                  borderColor: pju.ledPutih ? 'var(--sig-amber-border)' : 'var(--border-line)',
                }}
              >
                <span className="text-[11px] text-[var(--text-secondary)]">LED PUTIH PJU</span>
                <span
                  className="text-lg font-bold mt-1.5"
                  style={{ color: pju.ledPutih ? 'var(--sig-amber)' : 'var(--text-secondary)' }}
                >
                  {pju.ledPutih ? 'ON (MENYALA)' : 'OFF (MATI)'}
                </span>
                <span className="text-[11px] text-[var(--text-secondary)] mt-1">GPIO PIN 26</span>
              </div>
            </div>

            {/* LDR Meter Bar */}
            <div className="rack-well p-4 space-y-2.5 font-mono">
              <div className="flex items-baseline justify-between">
                <span className="text-xs text-[var(--text-secondary)]">
                  SENSOR LDR PIN 36 (THRESHOLD: {pju.thresholdLdr})
                </span>
                <span className="text-2xl font-bold">
                  {pju.ldrValue}{' '}
                  <span className="text-xs font-normal text-[var(--text-secondary)]">
                    ADC ({ldrPct}%)
                  </span>
                </span>
              </div>

              <div className="w-full h-2.5 bg-[var(--bg-panel)] rounded-full border border-[var(--border-line)] overflow-hidden">
                <div
                  className="h-full transition-all duration-150 rounded-full"
                  style={{
                    width: `${ldrPct}%`,
                    backgroundColor:
                      pju.ldrValue > pju.thresholdLdr ? 'var(--sig-amber-dot)' : 'var(--accent-primary)',
                  }}
                />
              </div>

              <div className="flex justify-between text-[11px] text-[var(--text-secondary)]">
                <span>0 (Terang · Mati)</span>
                <span>2000 (Threshold)</span>
                <span>4095 (Gelap · Menyala)</span>
              </div>
            </div>
          </div>
        </section>

        {/* Right: Direct PJU Controls */}
        <section aria-label="Panel Kontrol Smart PJU" className="lg:col-span-5 rack-panel flex flex-col">
          <div className="px-4 py-3 bg-[var(--bg-header)] border-b border-[var(--border-line)] flex items-center justify-between gap-2 rounded-t-[10px]">
            <h3 className="font-semibold text-sm text-[var(--text-primary)]">
              Kontrol Perintah PJU
            </h3>
            <span className="rack-tag">MODE: {pju.pjuMode}</span>
          </div>

          <div className="p-4 flex-1 flex flex-col justify-between gap-4">
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => controlPjuManual('ON')}
                className={`ctrl-btn w-full font-mono justify-between px-3.5 ${
                  pju.pjuMode === 'ON' ? 'ctrl-btn-amber' : ''
                }`}
              >
                <span>Nyalakan PJU Manual</span>
                <span className="text-[11px] opacity-80">CMD:PJU_ON</span>
              </button>

              <button
                type="button"
                onClick={() => controlPjuManual('OFF')}
                className={`ctrl-btn w-full font-mono justify-between px-3.5 ${
                  pju.pjuMode === 'OFF' ? 'ctrl-btn-active' : ''
                }`}
              >
                <span>Matikan PJU Manual</span>
                <span className="text-[11px] opacity-80">CMD:PJU_OFF</span>
              </button>

              <button
                type="button"
                onClick={() => controlPjuManual('AUTO')}
                className={`ctrl-btn w-full font-mono justify-between px-3.5 ${
                  pju.pjuMode === 'AUTO' ? 'ctrl-btn-green' : ''
                }`}
              >
                <span>Otomatis Sensor LDR</span>
                <span className="text-[11px] opacity-80">CMD:PJU_AUTO</span>
              </button>
            </div>

            {/* LDR Simulation Slider */}
            <div className="rack-well p-3.5 space-y-2.5">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-[var(--text-secondary)]">Uji Nilai LDR</span>
                <span className="font-bold">{pju.ldrValue} ADC</span>
              </div>
              <input
                type="range"
                min="0"
                max="4095"
                value={pju.ldrValue}
                onChange={(e) => setLdrValue(Number(e.target.value))}
                className="ctrl-range"
                aria-label="Atur Nilai Sensor LDR"
              />
              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    controlPjuManual('AUTO');
                    setLdrValue(800);
                  }}
                  className="ctrl-btn font-mono"
                >
                  Set Terang (800)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    controlPjuManual('AUTO');
                    setLdrValue(3200);
                  }}
                  className="ctrl-btn font-mono"
                >
                  Set Gelap (3200)
                </button>
              </div>
            </div>
          </div>
        </section>
      </div>

      <TerminalConsole filterFeature="pju" title="Log Serial: Smart PJU" maxHeight="max-h-60" />
    </div>
  );
};
