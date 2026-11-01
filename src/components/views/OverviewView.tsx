'use client';

import React, { useState, useEffect } from 'react';
import { useSmartCity } from '@/context/SmartCityContext';

export const OverviewView: React.FC = () => {
  const {
    gas,
    crossing,
    pju,
    traffic,
    buzzerMode,
    controlGasManual,
    triggerCrossingDetection,
    resetCrossingToSafe,
    updateUltrasonicDistances,
    controlPjuManual,
    setLdrValue,
    testBuzzerAlarm,
    setTrafficModeAuto,
    setTrafficLightManual,
    triggerTrafficEmergency,
    setActiveSubsystem,
  } = useSmartCity();

  const [gasSlider, setGasSlider] = useState<number>(gas.gasValue);

  useEffect(() => {
    setGasSlider(gas.gasValue);
  }, [gas.gasValue]);

  const isGasHigh = gas.gasValue >= 1500;
  const isGasMed = gas.gasValue >= 1000 && gas.gasValue < 1500;
  const gasPct = Math.min(100, Math.round((gas.gasValue / 4095) * 100));

  const isPjuOn = pju.pjuStatus === 'MENYALA';
  const ldrPct = Math.min(100, Math.round((pju.ldrValue / 4095) * 100));

  const kananVal = crossing.jarakKanan ?? 40;
  const kiriVal = crossing.jarakKiri ?? 40;

  return (
    <div className="space-y-4">
      {/* Top Status Strip: Buzzer Pin 4 Dual-Function & Serial Quick Access */}
      <section
        aria-label="Kontrol Buzzer Utama"
        className="rack-panel px-4 py-2.5 flex flex-wrap items-center justify-between gap-3"
      >
        <div className="flex items-center gap-3 flex-wrap">
          <span className="rack-tag">GPIO 4 · BUZZER</span>
          <div className="flex items-center gap-2">
            <span
              className="w-2 h-2 rounded-full shrink-0"
              style={{
                backgroundColor:
                  buzzerMode !== 'none' ? 'var(--sig-red-dot)' : 'var(--text-secondary)',
              }}
            />
            <span className="font-mono text-xs font-semibold text-[var(--text-primary)]">
              {buzzerMode === 'both'
                ? 'AKTIF: GAS + SEBERANG (2.5s)'
                : buzzerMode === 'gas'
                ? 'AKTIF: ALARM GAS (800ms)'
                : buzzerMode === 'seberang'
                ? 'AKTIF: POLA SEBERANG'
                : 'BUZZER SIAGA (OFF)'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={testBuzzerAlarm}
            className="ctrl-btn ctrl-btn-sm ctrl-btn-amber font-mono"
          >
            Uji Buzzer
          </button>
          <button
            type="button"
            onClick={() => setActiveSubsystem('alerts')}
            className="ctrl-btn ctrl-btn-sm font-mono"
          >
            Terminal Serial
          </button>
        </div>
      </section>

      {/* Main 2x2 Hardware Control Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* ============================================================
            UNIT 01: SENSOR GAS MQ (PIN 39) & LCD I2C 16x2
        ============================================================ */}
        <section aria-label="Unit Sensor Gas dan LCD" className="rack-panel flex flex-col">
          {/* Header */}
          <div className="px-4 py-3 bg-[var(--bg-header)] border-b border-[var(--border-line)] flex items-center justify-between gap-2 rounded-t-[10px]">
            <div className="flex items-center gap-2 min-w-0">
              <span className="w-6 h-6 rounded bg-[var(--bg-well)] border border-[var(--border-line)] flex items-center justify-center font-mono text-[11px] font-bold text-[var(--text-secondary)] shrink-0">
                01
              </span>
              <h2 className="font-semibold text-sm text-[var(--text-primary)] truncate">
                Polusi MQ &amp; LCD 16x2
              </h2>
              <span className="rack-tag hidden sm:inline-block">ADC 39</span>
            </div>
            <button
              type="button"
              onClick={() => setActiveSubsystem('air-quality')}
              className="ctrl-btn ctrl-btn-sm font-mono"
            >
              Detail
            </button>
          </div>

          {/* Body */}
          <div className="p-4 flex-1 flex flex-col justify-between gap-4">
            {/* LCD + ADC Readout */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-stretch">
              <div className="sm:col-span-7 lcd-screen px-3.5 py-3 flex flex-col justify-between">
                <div className="text-[10px] opacity-75 flex justify-between">
                  <span>I2C LCD 16x2</span>
                  <span>SCL 22 / SDA 21</span>
                </div>
                <pre className="text-sm font-bold leading-snug m-0 mt-1.5 overflow-hidden">
                  {gas.lcdBaris1}
                  {'\n'}
                  {gas.lcdBaris2}
                </pre>
              </div>

              <div className="sm:col-span-5 rack-well px-3.5 py-3 flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-mono text-[var(--text-secondary)]">
                    ADC PIN 39
                  </span>
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{
                      backgroundColor: isGasHigh
                        ? 'var(--sig-red-dot)'
                        : isGasMed
                        ? 'var(--sig-amber-dot)'
                        : 'var(--sig-green-dot)',
                    }}
                  />
                </div>
                <div
                  className="text-2xl font-mono font-bold tracking-tight my-1"
                  style={{
                    color: isGasHigh
                      ? 'var(--sig-red)'
                      : isGasMed
                      ? 'var(--sig-amber)'
                      : 'var(--sig-green)',
                  }}
                >
                  {gas.gasValue}{' '}
                  <span className="text-xs font-normal text-[var(--text-secondary)]">ADC</span>
                </div>
                <span className="text-[11px] font-mono font-semibold text-[var(--text-primary)] truncate">
                  {gas.statusPolusi}
                </span>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="space-y-1.5">
              <div className="w-full h-2 rounded-full bg-[var(--bg-well)] border border-[var(--border-line)] overflow-hidden">
                <div
                  className="h-full transition-all duration-150 rounded-full"
                  style={{
                    width: `${gasPct}%`,
                    backgroundColor: isGasHigh
                      ? 'var(--sig-red-dot)'
                      : isGasMed
                      ? 'var(--sig-amber-dot)'
                      : 'var(--sig-green-dot)',
                  }}
                />
              </div>
              <div className="flex justify-between text-[11px] font-mono text-[var(--text-secondary)]">
                <span>0</span>
                <span>1000 (Sedang)</span>
                <span>1500 (Batas Alarm)</span>
                <span>4095</span>
              </div>
            </div>

            {/* Controls */}
            <div className="rack-well p-3 space-y-2.5">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-[var(--text-secondary)]">
                  Mode: <strong className="text-[var(--text-primary)]">{gas.gasMode}</strong>
                </span>
                <span className="font-bold text-[var(--text-primary)]">{gasSlider} ADC</span>
              </div>

              <input
                type="range"
                min="0"
                max="3000"
                value={gasSlider}
                onChange={(e) => setGasSlider(Number(e.target.value))}
                onPointerUp={() => controlGasManual(gasSlider)}
                onTouchEnd={() => controlGasManual(gasSlider)}
                onKeyUp={() => controlGasManual(gasSlider)}
                className="ctrl-range"
                aria-label="Slider Nilai Gas MQ"
              />

              <div className="grid grid-cols-4 gap-1.5">
                <button
                  type="button"
                  onClick={() => controlGasManual('AUTO')}
                  className={`ctrl-btn font-mono ${
                    gas.gasMode === 'AUTO' ? 'ctrl-btn-active' : ''
                  }`}
                >
                  AUTO
                </button>
                <button
                  type="button"
                  onClick={() => controlGasManual('BERSIH')}
                  className={`ctrl-btn font-mono ${
                    gas.gasMode === 'MANUAL' && gas.gasValue < 1000 ? 'ctrl-btn-green' : ''
                  }`}
                >
                  650
                </button>
                <button
                  type="button"
                  onClick={() => controlGasManual('SEDANG')}
                  className={`ctrl-btn font-mono ${
                    gas.gasMode === 'MANUAL' && isGasMed ? 'ctrl-btn-amber' : ''
                  }`}
                >
                  1250
                </button>
                <button
                  type="button"
                  onClick={() => controlGasManual('BAHAYA')}
                  className={`ctrl-btn font-mono ${
                    gas.gasMode === 'MANUAL' && isGasHigh ? 'ctrl-btn-red' : ''
                  }`}
                >
                  2100
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* ============================================================
            UNIT 02: PENYEBERANGAN DUAL ULTRASONIK & LAMPU
        ============================================================ */}
        <section aria-label="Unit Penyeberangan Pejalan Kaki" className="rack-panel flex flex-col">
          {/* Header */}
          <div className="px-4 py-3 bg-[var(--bg-header)] border-b border-[var(--border-line)] flex items-center justify-between gap-2 rounded-t-[10px]">
            <div className="flex items-center gap-2 min-w-0">
              <span className="w-6 h-6 rounded bg-[var(--bg-well)] border border-[var(--border-line)] flex items-center justify-center font-mono text-[11px] font-bold text-[var(--text-secondary)] shrink-0">
                02
              </span>
              <h2 className="font-semibold text-sm text-[var(--text-primary)] truncate">
                Penyeberangan Ultrasonik
              </h2>
              <span className="rack-tag hidden sm:inline-block">GPIO 12/14/27</span>
            </div>
            <button
              type="button"
              onClick={() => setActiveSubsystem('pedestrian')}
              className="ctrl-btn ctrl-btn-sm font-mono"
            >
              Detail
            </button>
          </div>

          {/* Body */}
          <div className="p-4 flex-1 flex flex-col justify-between gap-4">
            {/* Signal Housing & Active Phase */}
            <div className="rack-well px-3.5 py-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                {/* Red LED (Pin 27) */}
                <div
                  className="w-10 h-10 rounded-full border-2 flex items-center justify-center font-mono text-xs font-bold transition-colors"
                  style={{
                    backgroundColor:
                      crossing.lampu === 'MERAH' ? 'var(--sig-red-bg)' : 'var(--bg-panel)',
                    borderColor:
                      crossing.lampu === 'MERAH' ? 'var(--sig-red-dot)' : 'var(--border-strong)',
                    color:
                      crossing.lampu === 'MERAH' ? 'var(--sig-red)' : 'var(--text-secondary)',
                  }}
                >
                  {crossing.lampu === 'MERAH' ? `${crossing.countdownSeconds}s` : 'M'}
                </div>

                {/* Yellow LED (Pin 14) */}
                <div
                  className="w-10 h-10 rounded-full border-2 flex items-center justify-center font-mono text-xs font-bold transition-colors"
                  style={{
                    backgroundColor:
                      crossing.lampu === 'KUNING' ? 'var(--sig-amber-bg)' : 'var(--bg-panel)',
                    borderColor:
                      crossing.lampu === 'KUNING' ? 'var(--sig-amber-dot)' : 'var(--border-strong)',
                    color:
                      crossing.lampu === 'KUNING' ? 'var(--sig-amber)' : 'var(--text-secondary)',
                  }}
                >
                  {crossing.lampu === 'KUNING' ? '1s' : 'K'}
                </div>

                {/* Green LED (Pin 12) */}
                <div
                  className="w-10 h-10 rounded-full border-2 flex items-center justify-center font-mono text-xs font-bold transition-colors"
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
                  H
                </div>
              </div>

              <div className="text-right font-mono">
                <span className="text-[10px] text-[var(--text-secondary)] block">
                  FASE AKTIF
                </span>
                <span className="text-sm font-bold text-[var(--text-primary)]">
                  {crossing.lampu}
                </span>
              </div>
            </div>

            {/* Dual Ultrasonic Sliders */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="rack-well p-3 space-y-1.5">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-[var(--text-secondary)]">Kanan (&lt;=17cm)</span>
                  <span
                    className="font-bold"
                    style={{
                      color: crossing.orangKanan ? 'var(--sig-red)' : 'var(--sig-green)',
                    }}
                  >
                    {crossing.jarakKanan !== null ? `${crossing.jarakKanan.toFixed(1)} cm` : 'NULL'}
                  </span>
                </div>
                <input
                  type="range"
                  min="2"
                  max="60"
                  value={kananVal}
                  onChange={(e) =>
                    updateUltrasonicDistances(Number(e.target.value), crossing.jarakKiri)
                  }
                  className="ctrl-range"
                  aria-label="Jarak Ultrasonik Kanan"
                />
              </div>

              <div className="rack-well p-3 space-y-1.5">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-[var(--text-secondary)]">Kiri (&lt;=25cm)</span>
                  <span
                    className="font-bold"
                    style={{
                      color: crossing.orangKiri ? 'var(--sig-red)' : 'var(--sig-green)',
                    }}
                  >
                    {crossing.jarakKiri !== null ? `${crossing.jarakKiri.toFixed(1)} cm` : 'NULL'}
                  </span>
                </div>
                <input
                  type="range"
                  min="2"
                  max="60"
                  value={kiriVal}
                  onChange={(e) =>
                    updateUltrasonicDistances(crossing.jarakKanan, Number(e.target.value))
                  }
                  className="ctrl-range"
                  aria-label="Jarak Ultrasonik Kiri"
                />
              </div>
            </div>

            {/* Trigger Buttons */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
              <button
                type="button"
                onClick={() => triggerCrossingDetection('force')}
                className="ctrl-btn ctrl-btn-red font-mono"
              >
                Paksa Merah
              </button>
              <button
                type="button"
                onClick={() => triggerCrossingDetection('kanan')}
                className="ctrl-btn font-mono"
              >
                Kanan 12cm
              </button>
              <button
                type="button"
                onClick={() => triggerCrossingDetection('kiri')}
                className="ctrl-btn font-mono"
              >
                Kiri 18cm
              </button>
              <button
                type="button"
                onClick={resetCrossingToSafe}
                className="ctrl-btn ctrl-btn-green font-mono"
              >
                Reset Hijau
              </button>
            </div>
          </div>
        </section>

        {/* ============================================================
            UNIT 03: SMART PJU (LDR PIN 36 & LED PIN 25/26)
        ============================================================ */}
        <section aria-label="Unit Smart PJU" className="rack-panel flex flex-col">
          {/* Header */}
          <div className="px-4 py-3 bg-[var(--bg-header)] border-b border-[var(--border-line)] flex items-center justify-between gap-2 rounded-t-[10px]">
            <div className="flex items-center gap-2 min-w-0">
              <span className="w-6 h-6 rounded bg-[var(--bg-well)] border border-[var(--border-line)] flex items-center justify-center font-mono text-[11px] font-bold text-[var(--text-secondary)] shrink-0">
                03
              </span>
              <h2 className="font-semibold text-sm text-[var(--text-primary)] truncate">
                Smart PJU Otomatis &amp; Manual
              </h2>
              <span className="rack-tag hidden sm:inline-block">LDR 36 · LED 25/26</span>
            </div>
            <button
              type="button"
              onClick={() => setActiveSubsystem('lighting')}
              className="ctrl-btn ctrl-btn-sm font-mono"
            >
              Detail
            </button>
          </div>

          {/* Body */}
          <div className="p-4 flex-1 flex flex-col justify-between gap-4">
            {/* 3 Metric Tiles */}
            <div className="grid grid-cols-3 gap-2.5">
              <div className="rack-well p-3 font-mono">
                <span className="text-[10px] text-[var(--text-secondary)] block">STATUS PJU</span>
                <span
                  className="text-sm sm:text-base font-bold mt-0.5 block truncate"
                  style={{ color: isPjuOn ? 'var(--sig-amber)' : 'var(--text-primary)' }}
                >
                  {pju.pjuStatus}
                </span>
              </div>

              <div className="rack-well p-3 font-mono">
                <span className="text-[10px] text-[var(--text-secondary)] block">CAHAYA</span>
                <span className="text-sm sm:text-base font-bold mt-0.5 block truncate">
                  {pju.kondisi}
                </span>
              </div>

              <div className="rack-well p-3 font-mono">
                <span className="text-[10px] text-[var(--text-secondary)] block">PIN 25 &amp; 26</span>
                <span
                  className="text-sm sm:text-base font-bold mt-0.5 block truncate"
                  style={{ color: isPjuOn ? 'var(--sig-green)' : 'var(--text-secondary)' }}
                >
                  {pju.ledMerah && pju.ledPutih ? 'ON / ON' : 'OFF / OFF'}
                </span>
              </div>
            </div>

            {/* LDR Slider */}
            <div className="rack-well p-3 space-y-2">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-[var(--text-secondary)]">Sensor LDR (Batas &gt; 2000)</span>
                <span className="font-bold text-[var(--text-primary)]">
                  {pju.ldrValue} ADC ({ldrPct}%)
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="4095"
                value={pju.ldrValue}
                onChange={(e) => setLdrValue(Number(e.target.value))}
                className="ctrl-range"
                aria-label="Slider Sensor Cahaya LDR"
              />
            </div>

            {/* 3-Way Hardware Switch */}
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => controlPjuManual('ON')}
                className={`ctrl-btn font-mono ${
                  pju.pjuMode === 'ON' ? 'ctrl-btn-amber' : ''
                }`}
              >
                PJU ON
              </button>
              <button
                type="button"
                onClick={() => controlPjuManual('OFF')}
                className={`ctrl-btn font-mono ${
                  pju.pjuMode === 'OFF' ? 'ctrl-btn-active' : ''
                }`}
              >
                PJU OFF
              </button>
              <button
                type="button"
                onClick={() => controlPjuManual('AUTO')}
                className={`ctrl-btn font-mono ${
                  pju.pjuMode === 'AUTO' ? 'ctrl-btn-green' : ''
                }`}
              >
                PJU AUTO
              </button>
            </div>
          </div>
        </section>

        {/* ============================================================
            UNIT 04: KAMERA SIMPANG & LAMPU LALU LINTAS
        ============================================================ */}
        <section aria-label="Unit Lalu Lintas dan Kamera" className="rack-panel flex flex-col">
          {/* Header */}
          <div className="px-4 py-3 bg-[var(--bg-header)] border-b border-[var(--border-line)] flex items-center justify-between gap-2 rounded-t-[10px]">
            <div className="flex items-center gap-2 min-w-0">
              <span className="w-6 h-6 rounded bg-[var(--bg-well)] border border-[var(--border-line)] flex items-center justify-center font-mono text-[11px] font-bold text-[var(--text-secondary)] shrink-0">
                04
              </span>
              <h2 className="font-semibold text-sm text-[var(--text-primary)] truncate">
                Simpang &amp; Kamera AI
              </h2>
              <span className="rack-tag hidden sm:inline-block">PORT 8088</span>
            </div>
            <button
              type="button"
              onClick={() => setActiveSubsystem('traffic')}
              className="ctrl-btn ctrl-btn-sm font-mono"
            >
              Kamera
            </button>
          </div>

          {/* Body */}
          <div className="p-4 flex-1 flex flex-col justify-between gap-4">
            {/* 3 Metric Tiles */}
            <div className="grid grid-cols-3 gap-2.5">
              <div className="rack-well p-3 font-mono">
                <span className="text-[10px] text-[var(--text-secondary)] block">SINYAL</span>
                <span
                  className="text-sm sm:text-base font-bold uppercase mt-0.5 block truncate"
                  style={{
                    color:
                      traffic.currentLight === 'green'
                        ? 'var(--sig-green)'
                        : traffic.currentLight === 'yellow'
                        ? 'var(--sig-amber)'
                        : 'var(--sig-red)',
                  }}
                >
                  {traffic.currentLight} ({traffic.countdownSeconds}s)
                </span>
              </div>

              <div className="rack-well p-3 font-mono">
                <span className="text-[10px] text-[var(--text-secondary)] block">KENDARAAN</span>
                <span className="text-sm sm:text-base font-bold mt-0.5 block truncate">
                  {traffic.vehicleCount} Unit
                </span>
              </div>

              <div className="rack-well p-3 font-mono">
                <span className="text-[10px] text-[var(--text-secondary)] block">KEPADATAN</span>
                <span className="text-sm sm:text-base font-bold mt-0.5 block truncate">
                  {traffic.density}% ({traffic.statusText})
                </span>
              </div>
            </div>

            {/* Signal Mode & Override */}
            <div className="rack-well p-3 space-y-2.5">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-[var(--text-secondary)]">
                  Mode Sinyal:{' '}
                  <strong className="text-[var(--text-primary)]">
                    {traffic.isAutomatic ? 'OTOMATIS' : 'MANUAL'}
                  </strong>
                </span>
                <div className="flex gap-1.5">
                  <button
                    type="button"
                    onClick={() => setTrafficModeAuto(true)}
                    className={`ctrl-btn ctrl-btn-sm font-mono ${
                      traffic.isAutomatic ? 'ctrl-btn-active' : ''
                    }`}
                  >
                    AUTO
                  </button>
                  <button
                    type="button"
                    onClick={() => setTrafficModeAuto(false)}
                    className={`ctrl-btn ctrl-btn-sm font-mono ${
                      !traffic.isAutomatic ? 'ctrl-btn-active' : ''
                    }`}
                  >
                    MANUAL
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-4 gap-1.5">
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
                <button
                  type="button"
                  onClick={triggerTrafficEmergency}
                  className="ctrl-btn ctrl-btn-active font-mono"
                >
                  Prioritas
                </button>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};
