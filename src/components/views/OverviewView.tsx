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

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => setActiveSubsystem('diorama')}
            className="ctrl-btn ctrl-btn-sm ctrl-btn-active font-mono"
          >
            Buka 3D Miniatur
          </button>
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
            UNIT 02: PENYEBERANGAN SENSOR TOUCH & DUAL TRAFFIC LIGHT
        ============================================================ */}
        <section aria-label="Unit Penyeberangan Pejalan Kaki" className="rack-panel flex flex-col">
          {/* Header */}
          <div className="px-4 py-3 bg-[var(--bg-header)] border-b border-[var(--border-line)] flex items-center justify-between gap-2 rounded-t-[10px]">
            <div className="flex items-center gap-2 min-w-0">
              <span className="w-6 h-6 rounded bg-[var(--bg-well)] border border-[var(--border-line)] flex items-center justify-center font-mono text-[11px] font-bold text-[var(--text-secondary)] shrink-0">
                02
              </span>
              <h2 className="font-semibold text-sm text-[var(--text-primary)] truncate">
                Penyeberangan Sensor Touch
              </h2>
              <span className="rack-tag hidden sm:inline-block">TOUCH 16/17 · DUAL TL</span>
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
            {/* Dual Traffic Light Housing & Active Phase */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {/* TL Kendaraan */}
              <div className="rack-well px-3 py-2.5 space-y-2">
                <div className="flex items-center justify-between font-mono text-[10px] text-[var(--text-secondary)]">
                  <span>TL KENDARAAN</span>
                  <span>32/14/12</span>
                </div>
                <div className="flex items-center gap-2">
                  <div
                    className="w-8 h-8 rounded-full border-2 flex items-center justify-center font-mono text-[11px] font-bold"
                    style={{
                      backgroundColor:
                        crossing.lampuKendaraan === 'MERAH' ? 'var(--sig-red-bg)' : 'var(--bg-panel)',
                      borderColor:
                        crossing.lampuKendaraan === 'MERAH' ? 'var(--sig-red-dot)' : 'var(--border-strong)',
                      color:
                        crossing.lampuKendaraan === 'MERAH' ? 'var(--sig-red)' : 'var(--text-secondary)',
                    }}
                  >
                    M
                  </div>
                  <div
                    className="w-8 h-8 rounded-full border-2 flex items-center justify-center font-mono text-[11px] font-bold"
                    style={{
                      backgroundColor:
                        crossing.lampuKendaraan === 'KUNING' ? 'var(--sig-amber-bg)' : 'var(--bg-panel)',
                      borderColor:
                        crossing.lampuKendaraan === 'KUNING' ? 'var(--sig-amber-dot)' : 'var(--border-strong)',
                      color:
                        crossing.lampuKendaraan === 'KUNING' ? 'var(--sig-amber)' : 'var(--text-secondary)',
                    }}
                  >
                    {crossing.lampu === 'KUNING_KENDARAAN' ? `${crossing.countdownSeconds}s` : 'K'}
                  </div>
                  <div
                    className="w-8 h-8 rounded-full border-2 flex items-center justify-center font-mono text-[11px] font-bold"
                    style={{
                      backgroundColor:
                        crossing.lampuKendaraan === 'HIJAU' ? 'var(--sig-green-bg)' : 'var(--bg-panel)',
                      borderColor:
                        crossing.lampuKendaraan === 'HIJAU' ? 'var(--sig-green-dot)' : 'var(--border-strong)',
                      color:
                        crossing.lampuKendaraan === 'HIJAU' ? 'var(--sig-green)' : 'var(--text-secondary)',
                    }}
                  >
                    H
                  </div>
                </div>
              </div>

              {/* TL Pejalan Kaki */}
              <div className="rack-well px-3 py-2.5 space-y-2">
                <div className="flex items-center justify-between font-mono text-[10px] text-[var(--text-secondary)]">
                  <span>TL PEJALAN KAKI</span>
                  <span>27/33/23</span>
                </div>
                <div className="flex items-center gap-2">
                  <div
                    className="w-8 h-8 rounded-full border-2 flex items-center justify-center font-mono text-[11px] font-bold"
                    style={{
                      backgroundColor:
                        crossing.lampuPejalan === 'MERAH' ? 'var(--sig-red-bg)' : 'var(--bg-panel)',
                      borderColor:
                        crossing.lampuPejalan === 'MERAH' ? 'var(--sig-red-dot)' : 'var(--border-strong)',
                      color:
                        crossing.lampuPejalan === 'MERAH' ? 'var(--sig-red)' : 'var(--text-secondary)',
                    }}
                  >
                    M
                  </div>
                  <div
                    className="w-8 h-8 rounded-full border-2 flex items-center justify-center font-mono text-[11px] font-bold"
                    style={{
                      backgroundColor:
                        crossing.lampuPejalan === 'KUNING' ? 'var(--sig-amber-bg)' : 'var(--bg-panel)',
                      borderColor:
                        crossing.lampuPejalan === 'KUNING' ? 'var(--sig-amber-dot)' : 'var(--border-strong)',
                      color:
                        crossing.lampuPejalan === 'KUNING' ? 'var(--sig-amber)' : 'var(--text-secondary)',
                    }}
                  >
                    {crossing.lampuPejalan === 'KUNING' ? `${crossing.countdownSeconds}s` : 'K'}
                  </div>
                  <div
                    className="w-8 h-8 rounded-full border-2 flex items-center justify-center font-mono text-[11px] font-bold"
                    style={{
                      backgroundColor:
                        crossing.lampuPejalan === 'HIJAU' ? 'var(--sig-green-bg)' : 'var(--bg-panel)',
                      borderColor:
                        crossing.lampuPejalan === 'HIJAU' ? 'var(--sig-green-dot)' : 'var(--border-strong)',
                      color:
                        crossing.lampuPejalan === 'HIJAU' ? 'var(--sig-green)' : 'var(--text-secondary)',
                    }}
                  >
                    {crossing.lampu === 'MENYEBRANG' ? `${crossing.countdownSeconds}s` : 'H'}
                  </div>
                </div>
              </div>
            </div>

            {/* Dual Sensor Touch Status & Phase Readout */}
            <div className="grid grid-cols-3 gap-2">
              <div className="rack-well p-2.5 font-mono">
                <span className="text-[10px] text-[var(--text-secondary)] block">TOUCH KANAN</span>
                <span
                  className="text-xs font-bold mt-0.5 block truncate"
                  style={{ color: crossing.touchKanan ? 'var(--sig-amber)' : 'var(--sig-green)' }}
                >
                  {crossing.touchKanan ? 'DISENTUH' : 'SIAGA (17)'}
                </span>
              </div>
              <div className="rack-well p-2.5 font-mono">
                <span className="text-[10px] text-[var(--text-secondary)] block">TOUCH KIRI</span>
                <span
                  className="text-xs font-bold mt-0.5 block truncate"
                  style={{ color: crossing.touchKiri ? 'var(--sig-amber)' : 'var(--sig-green)' }}
                >
                  {crossing.touchKiri ? 'DISENTUH' : 'SIAGA (16)'}
                </span>
              </div>
              <div className="rack-well p-2.5 font-mono">
                <span className="text-[10px] text-[var(--text-secondary)] block">FASE AKTIF</span>
                <span className="text-xs font-bold mt-0.5 block truncate text-[var(--text-primary)]">
                  {crossing.lampu}
                </span>
              </div>
            </div>

            {/* Trigger Buttons */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
              <button
                type="button"
                onClick={() => triggerCrossingDetection('force')}
                className="ctrl-btn ctrl-btn-red font-mono"
              >
                Seberang
              </button>
              <button
                type="button"
                onClick={() => triggerCrossingDetection('kanan')}
                className="ctrl-btn font-mono"
              >
                Touch 17
              </button>
              <button
                type="button"
                onClick={() => triggerCrossingDetection('kiri')}
                className="ctrl-btn font-mono"
              >
                Touch 16
              </button>
              <button
                type="button"
                onClick={resetCrossingToSafe}
                className="ctrl-btn ctrl-btn-green font-mono"
              >
                Normal
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
                Kamera Deteksi Kemacetan Mobil
              </h2>
              <span className="rack-tag hidden sm:inline-block">WEBCAM AI</span>
            </div>
            <button
              type="button"
              onClick={() => setActiveSubsystem('traffic')}
              className="ctrl-btn ctrl-btn-sm font-mono"
            >
              Buka Kamera
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
                <span className="text-[10px] text-[var(--text-secondary)] block">MOBIL DI KAMERA</span>
                <span className="text-sm sm:text-base font-bold mt-0.5 block truncate">
                  {traffic.vehicleCount} / 6 Mobil
                </span>
              </div>

              <div className="rack-well p-3 font-mono">
                <span className="text-[10px] text-[var(--text-secondary)] block">STATUS JALAN</span>
                <span
                  className="text-sm sm:text-base font-bold mt-0.5 block truncate"
                  style={{
                    color:
                      traffic.vehicleCount >= 6
                        ? 'var(--sig-red)'
                        : traffic.vehicleCount >= 3
                        ? 'var(--sig-amber)'
                        : 'var(--sig-green)',
                  }}
                >
                  {traffic.statusText}
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
