'use client';

import React, { useState, useEffect } from 'react';
import { useSmartCity } from '@/context/SmartCityContext';
import { TerminalConsole } from '@/components/common/TerminalConsole';

export const AirQualityView: React.FC = () => {
  const { gas, buzzerMode, controlGasManual, testBuzzerAlarm } = useSmartCity();
  const [sliderVal, setSliderVal] = useState<number>(gas.gasValue);

  useEffect(() => {
    setSliderVal(gas.gasValue);
  }, [gas.gasValue]);

  const isTinggi = gas.gasValue >= 1500;
  const isSedang = gas.gasValue >= 1000 && gas.gasValue < 1500;
  const pct = Math.min(100, Math.round((gas.gasValue / 4095) * 100));

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left: LCD 16x2 & Gas ADC Readout */}
        <section aria-label="Pembacaan Sensor Gas dan LCD" className="lg:col-span-7 rack-panel flex flex-col">
          <div className="px-4 py-3 bg-[var(--bg-header)] border-b border-[var(--border-line)] flex items-center justify-between gap-2 rounded-t-[10px]">
            <div className="flex items-center gap-2">
              <h2 className="font-semibold text-sm text-[var(--text-primary)]">
                Sensor Polusi MQ &amp; LCD 16x2
              </h2>
              <span className="rack-tag">ADC PIN 39</span>
            </div>
            <span
              className="px-2.5 py-0.5 rounded-md text-xs font-mono font-bold border"
              style={{
                backgroundColor: isTinggi
                  ? 'var(--sig-red-bg)'
                  : isSedang
                  ? 'var(--sig-amber-bg)'
                  : 'var(--sig-green-bg)',
                borderColor: isTinggi
                  ? 'var(--sig-red-border)'
                  : isSedang
                  ? 'var(--sig-amber-border)'
                  : 'var(--sig-green-border)',
                color: isTinggi
                  ? 'var(--sig-red)'
                  : isSedang
                  ? 'var(--sig-amber)'
                  : 'var(--sig-green)',
              }}
            >
              {gas.statusPolusi}
            </span>
          </div>

          <div className="p-4 space-y-4 flex-1 flex flex-col justify-between">
            {/* 16x2 I2C LCD Hardware Display */}
            <div className="lcd-screen p-4 space-y-2">
              <div className="flex items-center justify-between text-[11px] opacity-75">
                <span>I2C LCD 16x2 (SoftI2C SCL 22 / SDA 21)</span>
                <span>0x27 · 100kHz</span>
              </div>
              <pre className="text-lg sm:text-xl font-bold tracking-widest leading-relaxed m-0 overflow-x-auto">
                {gas.lcdBaris1}
                {'\n'}
                {gas.lcdBaris2}
              </pre>
            </div>

            {/* Numerical & Bar Meter */}
            <div className="rack-well p-4 space-y-3">
              <div className="flex items-baseline justify-between font-mono">
                <span className="text-xs text-[var(--text-secondary)]">PEMBACAAN ADC PIN 39</span>
                <span
                  className="text-2xl sm:text-3xl font-bold"
                  style={{
                    color: isTinggi
                      ? 'var(--sig-red)'
                      : isSedang
                      ? 'var(--sig-amber)'
                      : 'var(--sig-green)',
                  }}
                >
                  {gas.gasValue} <span className="text-xs font-normal text-[var(--text-secondary)]">ADC</span>
                </span>
              </div>

              <div className="w-full h-2.5 bg-[var(--bg-panel)] rounded-full border border-[var(--border-line)] overflow-hidden">
                <div
                  className="h-full transition-all duration-150 rounded-full"
                  style={{
                    width: `${pct}%`,
                    backgroundColor: isTinggi
                      ? 'var(--sig-red-dot)'
                      : isSedang
                      ? 'var(--sig-amber-dot)'
                      : 'var(--sig-green-dot)',
                  }}
                />
              </div>

              <div className="grid grid-cols-3 gap-2 text-xs font-mono pt-1">
                <div className="p-2.5 rounded-md bg-[var(--bg-panel)] border border-[var(--border-line)]">
                  <span className="text-[10px] text-[var(--text-secondary)] block">&lt; 1000 ADC</span>
                  <span className="font-bold" style={{ color: 'var(--sig-green)' }}>UDARA BERSIH</span>
                </div>
                <div className="p-2.5 rounded-md bg-[var(--bg-panel)] border border-[var(--border-line)]">
                  <span className="text-[10px] text-[var(--text-secondary)] block">1000 - 1499 ADC</span>
                  <span className="font-bold" style={{ color: 'var(--sig-amber)' }}>POLUSI SEDANG</span>
                </div>
                <div className="p-2.5 rounded-md bg-[var(--bg-panel)] border border-[var(--border-line)]">
                  <span className="text-[10px] text-[var(--text-secondary)] block">&gt;= 1500 ADC</span>
                  <span className="font-bold" style={{ color: 'var(--sig-red)' }}>POLUSI TINGGI</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Right: Control Panel */}
        <section aria-label="Panel Kontrol Sensor Gas" className="lg:col-span-5 rack-panel flex flex-col">
          <div className="px-4 py-3 bg-[var(--bg-header)] border-b border-[var(--border-line)] flex items-center justify-between gap-2 rounded-t-[10px]">
            <h3 className="font-semibold text-sm text-[var(--text-primary)]">
              Kontrol Sensor &amp; Alarm
            </h3>
            <span className="rack-tag">MODE: {gas.gasMode}</span>
          </div>

          <div className="p-4 flex-1 flex flex-col justify-between gap-4">
            <div className="space-y-4">
              {/* Mode Switch */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => controlGasManual('AUTO')}
                  className={`ctrl-btn font-mono ${
                    gas.gasMode === 'AUTO' ? 'ctrl-btn-active' : ''
                  }`}
                >
                  Otomatis (Pin 39)
                </button>
                <button
                  type="button"
                  onClick={() => controlGasManual(sliderVal)}
                  className={`ctrl-btn font-mono ${
                    gas.gasMode === 'MANUAL' ? 'ctrl-btn-active' : ''
                  }`}
                >
                  Manual Override
                </button>
              </div>

              {/* Manual Slider */}
              <div className="rack-well p-3.5 space-y-2">
                <div className="flex justify-between text-xs font-mono">
                  <span className="text-[var(--text-secondary)]">Set Nilai ADC</span>
                  <span className="font-bold">{sliderVal} ADC</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="3000"
                  value={sliderVal}
                  onChange={(e) => setSliderVal(Number(e.target.value))}
                  onPointerUp={() => controlGasManual(sliderVal)}
                  onTouchEnd={() => controlGasManual(sliderVal)}
                  onKeyUp={() => controlGasManual(sliderVal)}
                  className="ctrl-range"
                  aria-label="Atur Nilai Gas MQ"
                />
              </div>

              {/* Preset Buttons */}
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => controlGasManual('BERSIH')}
                  className={`ctrl-btn font-mono ${
                    gas.gasMode === 'MANUAL' && gas.gasValue === 650 ? 'ctrl-btn-green' : ''
                  }`}
                >
                  Bersih (650)
                </button>
                <button
                  type="button"
                  onClick={() => controlGasManual('SEDANG')}
                  className={`ctrl-btn font-mono ${
                    gas.gasMode === 'MANUAL' && gas.gasValue === 1250 ? 'ctrl-btn-amber' : ''
                  }`}
                >
                  Sedang (1250)
                </button>
                <button
                  type="button"
                  onClick={() => controlGasManual('BAHAYA')}
                  className={`ctrl-btn font-mono ${
                    gas.gasMode === 'MANUAL' && gas.gasValue === 2100 ? 'ctrl-btn-red' : ''
                  }`}
                >
                  Tinggi (2100)
                </button>
              </div>
            </div>

            {/* Buzzer Pin 4 Status & Test */}
            <div className="pt-3 border-t border-[var(--border-line)] space-y-2.5">
              <div className="rack-well p-3 flex items-center justify-between font-mono text-xs">
                <span className="text-[var(--text-secondary)]">Buzzer Pin 4 (800ms)</span>
                <span
                  className="font-bold"
                  style={{
                    color:
                      buzzerMode === 'gas' || buzzerMode === 'both'
                        ? 'var(--sig-red)'
                        : 'var(--text-secondary)',
                  }}
                >
                  {buzzerMode === 'both'
                    ? 'BERGANTIAN'
                    : buzzerMode === 'gas'
                    ? 'ALARM AKTIF'
                    : 'SIAGA (OFF)'}
                </span>
              </div>

              <button
                type="button"
                onClick={testBuzzerAlarm}
                className="ctrl-btn ctrl-btn-amber w-full font-mono"
              >
                Uji Buzzer 300ms [CMD:BUZZER_TEST]
              </button>
            </div>
          </div>
        </section>
      </div>

      <TerminalConsole filterFeature="polusi" title="Log Serial: Sensor Gas MQ" maxHeight="max-h-60" />
    </div>
  );
};
