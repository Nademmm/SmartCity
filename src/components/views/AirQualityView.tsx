'use client';

import React, { useState, useEffect } from 'react';
import { useSmartCity } from '@/context/SmartCityContext';
import { MetricCard } from '@/components/common/MetricCard';
import {
  Wind,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  Info,
  Terminal,
  ArrowRight,
  Cpu,
  Sliders,
  RotateCcw,
} from 'lucide-react';

export const AirQualityView: React.FC = () => {
  const { gas, controlGasManual, testBuzzerAlarm, isHardwareConnected, setActiveSubsystem } = useSmartCity();

  const [localSliderVal, setLocalSliderVal] = useState<number>(gas.gasValue);

  useEffect(() => {
    setLocalSliderVal(gas.gasValue);
  }, [gas.gasValue]);

  const isTinggi = gas.statusPolusi === 'POLUSI TINGGI';
  const isSedang = gas.statusPolusi === 'POLUSI SEDANG';
  const isManual = gas.gasMode === 'MANUAL';

  return (
    <div className="space-y-4">
      {/* Offline Hardware Banner */}
      {!isHardwareConnected && (
        <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800/80 flex items-center justify-between text-xs text-slate-300">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-slate-500" />
            <p>
              Perangkat ESP32 belum terhubung. Nilai sensor gas saat ini berada dalam mode simulasi interaktif.
            </p>
          </div>
          <div className="font-mono text-[11px] text-slate-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800 shrink-0">
            Standby
          </div>
        </div>
      )}

      {/* Status Warning Banner (Sedang & Tinggi) */}
      {(isTinggi || isSedang) && (
        <div
          className={`p-3.5 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs ${
            isTinggi
              ? 'bg-rose-950/30 border-rose-500/40'
              : 'bg-amber-950/30 border-amber-500/40'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <AlertTriangle
              className={`w-4 h-4 shrink-0 ${isTinggi ? 'text-rose-400' : 'text-amber-400'}`}
            />
            <div>
              <p className="font-semibold text-white">
                {isTinggi ? 'Peringatan: Polusi Udara Tinggi' : 'Pemberitahuan: Polusi Udara Sedang'} ({gas.gasValue} ADC)
              </p>
              <p className="text-slate-400">
                {isTinggi
                  ? 'Nilai gas melebihi ambang 1500 ADC. Alarm darurat aktif.'
                  : 'Nilai gas terdeteksi antara 1000 sampai 1499 ADC.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button
              onClick={() => controlGasManual('BERSIH')}
              className="px-3 py-1.5 rounded-lg bg-emerald-600/30 hover:bg-emerald-600/40 text-emerald-200 border border-emerald-500/40 font-medium text-xs cursor-pointer transition-colors"
            >
              Reset ke Bersih
            </button>
            <button
              onClick={() => controlGasManual('AUTO')}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-medium text-xs cursor-pointer transition-colors"
            >
              Sensor Fisik (Auto)
            </button>
          </div>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <MetricCard
          title="Nilai Sensor Gas (MQ)"
          value={gas.gasValue}
          unit="ADC"
          statusText={gas.statusPolusi}
          statusVariant={isTinggi ? 'danger' : isSedang ? 'warning' : 'success'}
          icon={<Wind className="w-4 h-4" />}
          footerText={`ADC Pin ${gas.pinGas} • Mode: ${gas.gasMode || 'AUTO'}`}
        />

        <MetricCard
          title="Status Kategori Udara"
          value={gas.statusPolusi}
          statusText={
            gas.gasValue < 1000
              ? 'Aman (< 1000)'
              : gas.gasValue < 1500
              ? 'Waspada (1000-1499)'
              : 'Bahaya (>= 1500)'
          }
          statusVariant={isTinggi ? 'danger' : isSedang ? 'warning' : 'success'}
          icon={<ShieldCheck className="w-4 h-4" />}
          footerText="Klasifikasi Program MicroPython"
        />

        <MetricCard
          title="Ambang Udara Bersih"
          value="< 1000"
          unit="ADC"
          statusText="Batas Aman"
          statusVariant="success"
          icon={<CheckCircle2 className="w-4 h-4" />}
          footerText="Threshold Level 1"
        />

        <MetricCard
          title="Ambang Polusi Tinggi"
          value=">= 1500"
          unit="ADC"
          statusText="Batas Alarm"
          statusVariant="danger"
          icon={<AlertTriangle className="w-4 h-4" />}
          footerText="Threshold Level 2"
        />
      </div>

      {/* Gauge and Hardware Display */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Gauge & Control Card */}
        <div className="lg:col-span-6 rounded-xl bg-slate-900/60 border border-slate-800/80 p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
              <h3 className="text-xs font-semibold text-white uppercase tracking-wider">
                Kontrol & Pembacaan Sensor Gas
              </h3>
              <span className={`text-[11px] font-mono px-2 py-0.5 rounded border ${
                isManual 
                  ? 'bg-cyan-500/10 text-cyan-300 border-cyan-500/30' 
                  : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
              }`}>
                {isManual ? 'Simulasi Manual (Web)' : 'Sensor Fisik (Pin 39)'}
              </span>
            </div>

            {/* Mode Switcher Buttons */}
            <div className="grid grid-cols-2 gap-2 mt-3 mb-2 p-1 rounded-lg bg-slate-950/80 border border-slate-800">
              <button
                onClick={() => controlGasManual('AUTO')}
                className={`py-2 px-3 rounded-md text-xs font-medium flex items-center justify-center gap-1.5 cursor-pointer transition-colors ${
                  !isManual
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Cpu className="w-3.5 h-3.5" />
                <span>Sensor Fisik (Auto)</span>
              </button>

              <button
                onClick={() => controlGasManual(localSliderVal)}
                className={`py-2 px-3 rounded-md text-xs font-medium flex items-center justify-center gap-1.5 cursor-pointer transition-colors ${
                  isManual
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Sliders className="w-3.5 h-3.5" />
                <span>Simulasi Manual</span>
              </button>
            </div>

            {/* Value Display */}
            <div className="my-3 p-4 rounded-xl bg-slate-950/80 border border-slate-800/80 flex flex-col items-center justify-center">
              <div
                className="w-16 h-16 rounded-full border-2 flex items-center justify-center transition-colors"
                style={{
                  borderColor: isTinggi ? '#F43F5E' : isSedang ? '#F59E0B' : '#10B981',
                }}
              >
                <Wind
                  className="w-7 h-7"
                  style={{
                    color: isTinggi ? '#FB7185' : isSedang ? '#FBBF24' : '#34D399',
                  }}
                />
              </div>

              <div className="mt-2.5 text-center">
                <p className="text-3xl font-bold text-white font-mono">{gas.gasValue}</p>
                <p
                  className="text-xs font-semibold uppercase mt-0.5"
                  style={{ color: isTinggi ? '#FB7185' : isSedang ? '#FBBF24' : '#34D399' }}
                >
                  {gas.statusPolusi}
                </p>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  {isManual ? 'Nilai diset secara manual dari perangkat' : 'Membaca langsung dari pin ADC 39 ESP32'}
                </p>
              </div>
            </div>

            {/* Slider with Commit on pointer/touch end */}
            <div className="p-3.5 rounded-lg bg-slate-900 border border-slate-800 space-y-2">
              <div className="flex justify-between text-xs text-slate-300 font-medium">
                <p>Pengaturan Manual Nilai Gas:</p>
                <p className="font-mono text-cyan-400 font-bold">{localSliderVal} ADC</p>
              </div>
              <input
                type="range"
                min="0"
                max="4095"
                value={localSliderVal}
                onChange={(e) => setLocalSliderVal(Number(e.target.value))}
                onPointerUp={() => controlGasManual(localSliderVal)}
                onTouchEnd={() => controlGasManual(localSliderVal)}
                onKeyUp={() => controlGasManual(localSliderVal)}
                className="w-full accent-cyan-400 cursor-pointer h-2 bg-slate-800 rounded-lg"
              />
              <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                <p className="text-emerald-400">&lt; 1000 (Bersih)</p>
                <p className="text-amber-400">1000 - 1499 (Sedang)</p>
                <p className="text-rose-400">&gt;= 1500 (Tinggi)</p>
              </div>
            </div>

            {/* Presets */}
            <div className="mt-3 space-y-1.5">
              <p className="text-[11px] font-medium text-slate-400">Uji Coba Cepat Preset Ambang Batas:</p>
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => controlGasManual('BERSIH')}
                  className={`py-2 px-2 rounded-lg border text-xs font-medium cursor-pointer transition-colors ${
                    isManual && gas.gasValue === 650
                      ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300'
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
                  }`}
                >
                  Bersih (650)
                </button>
                <button
                  onClick={() => controlGasManual('SEDANG')}
                  className={`py-2 px-2 rounded-lg border text-xs font-medium cursor-pointer transition-colors ${
                    isManual && gas.gasValue === 1250
                      ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
                  }`}
                >
                  Sedang (1250)
                </button>
                <button
                  onClick={() => controlGasManual('BAHAYA')}
                  className={`py-2 px-2 rounded-lg border text-xs font-medium cursor-pointer transition-colors ${
                    isManual && gas.gasValue === 2100
                      ? 'bg-rose-500/20 border-rose-500 text-rose-300'
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
                  }`}
                >
                  Tinggi (2100)
                </button>
              </div>

              <div className="pt-2">
                <button
                  onClick={testBuzzerAlarm}
                  className="w-full py-2.5 px-3 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-xs font-medium transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <AlertTriangle className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Uji Alarm Buzzer Fisik (ESP32 Pin 13)</span>
                </button>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800/80 text-[11px] text-slate-400 flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <p>Perintah kontrol otomatis disinkronkan ke ESP32 dan perangkat lain.</p>
            </div>
            {isManual && (
              <button
                onClick={() => controlGasManual('AUTO')}
                className="text-[10px] text-cyan-400 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset Otomatis</span>
              </button>
            )}
          </div>
        </div>

        {/* Right Card: Monitor Hijau LCD 16x2, LED Fisik & Tabel Logika */}
        <div className="lg:col-span-6 flex flex-col justify-between rounded-xl bg-slate-900/60 border border-slate-800/80 p-4">
          <div className="space-y-4">
            {/* Monitor Hijau (LCD 16x2 I2C) & 2 LED Tambahan */}
            <div>
              <div className="flex items-center justify-between pb-2 border-b border-slate-800/80">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                  <h3 className="text-xs font-semibold text-white uppercase tracking-wider">
                    Hardware Output: Monitor Hijau & 2 LED
                  </h3>
                </div>
                <span className="text-[11px] font-mono text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/50">
                  I2C: Pin 21 (SDA) / 22 (SCL)
                </span>
              </div>

              {/* Simulasi Layar LCD 16x2 Green Backlight */}
              <div className="my-3 p-3.5 rounded-lg bg-emerald-950/80 border-2 border-emerald-700/60 shadow-inner flex flex-col justify-center relative overflow-hidden">
                <div className="absolute top-1 right-2 text-[9px] font-mono text-emerald-400/70 tracking-widest uppercase">
                  LCD 1602 I2C (0x27)
                </div>
                <div className="font-mono text-sm sm:text-base font-black text-emerald-300 tracking-wider select-none bg-emerald-900/40 p-2.5 rounded border border-emerald-800/40 shadow-sm space-y-1">
                  <p className="truncate">
                    {gas.lcdBaris1 || (isTinggi ? 'STATUS: BAHAYA!' : isSedang ? 'STATUS: WASPADA' : 'Selamat Datang')}
                  </p>
                  <p className="truncate">
                    {gas.lcdBaris2 || (isTinggi ? 'Polusi: TINGGI' : isSedang ? `Gas: ${gas.gasValue} Sedang` : 'Di Kota Pintar')}
                  </p>
                </div>
              </div>

              {/* Status 2 LED Tambahan Fisik */}
              <div className="grid grid-cols-2 gap-2.5">
                {/* LED 1: Peringatan Polusi (Pin 18) */}
                <div
                  className={`p-2.5 rounded-lg border transition-all flex items-center justify-between ${
                    gas.ledPolusi || isTinggi
                      ? 'bg-rose-950/40 border-rose-500/60 text-rose-200 shadow-sm shadow-rose-950'
                      : 'bg-slate-950/60 border-slate-800 text-slate-500'
                  }`}
                >
                  <div className="space-y-0.5">
                    <p className="text-[11px] font-semibold">LED Peringatan</p>
                    <p className="text-[10px] font-mono opacity-80">GPIO Pin 18</p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div
                      className={`w-3.5 h-3.5 rounded-full border ${
                        gas.ledPolusi || isTinggi
                          ? 'bg-rose-500 border-rose-300 shadow-[0_0_8px_#f43f5e]'
                          : 'bg-slate-800 border-slate-700'
                      }`}
                    />
                    <span className="text-[10px] font-mono font-bold">
                      {gas.ledPolusi || isTinggi ? 'ON' : 'OFF'}
                    </span>
                  </div>
                </div>

                {/* LED 2: Udara Bersih (Pin 19) */}
                <div
                  className={`p-2.5 rounded-lg border transition-all flex items-center justify-between ${
                    gas.ledBersih !== false && !isTinggi
                      ? 'bg-emerald-950/40 border-emerald-500/60 text-emerald-200 shadow-sm shadow-emerald-950'
                      : 'bg-slate-950/60 border-slate-800 text-slate-500'
                  }`}
                >
                  <div className="space-y-0.5">
                    <p className="text-[11px] font-semibold">LED Udara Bersih</p>
                    <p className="text-[10px] font-mono opacity-80">GPIO Pin 19</p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div
                      className={`w-3.5 h-3.5 rounded-full border ${
                        gas.ledBersih !== false && !isTinggi
                          ? 'bg-emerald-500 border-emerald-300 shadow-[0_0_8px_#10b981]'
                          : 'bg-slate-800 border-slate-700'
                      }`}
                    />
                    <span className="text-[10px] font-mono font-bold">
                      {gas.ledBersih !== false && !isTinggi ? 'ON' : 'OFF'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Matrix Klasifikasi & Tindakan Otomasi */}
            <div className="p-3 rounded-lg bg-slate-950/80 border border-slate-800/80 space-y-2 text-xs">
              <p className="font-semibold text-white">Logika Klasifikasi Kualitas Udara:</p>
              <div className="space-y-1.5 text-[11px]">
                <div className="flex items-center justify-between p-1.5 rounded bg-slate-900 border border-slate-800/60">
                  <span className="text-emerald-400 font-medium">&lt; 1000 ADC (Bersih):</span>
                  <span className="text-slate-300 font-mono">LCD Sambutan • LED 19 ON</span>
                </div>
                <div className="flex items-center justify-between p-1.5 rounded bg-slate-900 border border-slate-800/60">
                  <span className="text-amber-300 font-medium">1000 - 1499 ADC (Sedang):</span>
                  <span className="text-slate-300 font-mono">LCD Nilai Gas • Siaga</span>
                </div>
                <div className="flex items-center justify-between p-1.5 rounded bg-slate-900 border border-slate-800/60">
                  <span className="text-rose-400 font-medium">&gt;= 1500 ADC (Bahaya):</span>
                  <span className="text-slate-300 font-mono">LED 18 ON • Buzzer Pin 13 Bunyi</span>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Bar with Link to Centralized Logs */}
          <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 text-xs text-slate-400">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-[11px]">Sensor MQ & LCD 1602 Sinkron</span>
            </div>

            <button
              onClick={() => setActiveSubsystem('alerts')}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 flex items-center gap-1.5 text-xs font-medium cursor-pointer transition-colors"
            >
              <Terminal className="w-3.5 h-3.5 text-cyan-400" />
              <span>Log Sensor Gas</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
