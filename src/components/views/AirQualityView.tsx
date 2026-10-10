'use client';

import React from 'react';
import { useSmartCity } from '@/context/SmartCityContext';
import { MetricCard } from '@/components/common/MetricCard';
import { TerminalConsole } from '@/components/common/TerminalConsole';
import {
  Wind,
  ShieldCheck,
  AlertTriangle,
  Sliders,
  CheckCircle2,
  Info,
} from 'lucide-react';

export const AirQualityView: React.FC = () => {
  const { gas, setGasSensorValue, isHardwareConnected } = useSmartCity();

  const isTinggi = gas.statusPolusi === 'POLUSI TINGGI';
  const isSedang = gas.statusPolusi === 'POLUSI SEDANG';

  return (
    <div className="space-y-5">
      {/* Offline Hardware Banner */}
      {!isHardwareConnected && (
        <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 flex items-center justify-between text-xs text-slate-300">
          <div className="flex items-center gap-2.5">
            <span className="w-2 h-2 rounded-full bg-rose-500" />
            <span>
              <strong>Perangkat ESP32 Offline:</strong> Sensor Gas MQ (ADC Pin 39) dalam mode Standby. Colokkan kabel USB dan jalankan kode di Thonny agar pembacaan fisik langsung mengalir.
            </span>
          </div>
          <span className="font-mono text-[10px] bg-rose-500/10 text-rose-400 border border-rose-500/20 px-2 py-0.5 rounded shrink-0">
            Hardware Belum Terhubung
          </span>
        </div>
      )}
      {/* Status Warning Banner (Sedang & Tinggi) */}
      {(isTinggi || isSedang) && (
        <div
          className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-all ${
            isTinggi
              ? 'bg-rose-950/40 border-rose-500/50 animate-pulse'
              : 'bg-amber-950/40 border-amber-500/50'
          }`}
        >
          <div className="flex items-center gap-3">
            <div
              className={`p-2.5 rounded-lg border ${
                isTinggi
                  ? 'bg-rose-500/20 text-rose-400 border-rose-500/40'
                  : 'bg-amber-500/20 text-amber-400 border-amber-500/40'
              }`}
            >
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-rose-400">
                  {isTinggi ? 'KODE MERAH: POLUSI UDARA TINGGI' : 'PERINGATAN: POLUSI UDARA TINGKAT SEDANG'}
                </span>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    isTinggi ? 'bg-rose-500 text-white' : 'bg-amber-400 text-black'
                  }`}
                >
                  {gas.statusPolusi}
                </span>
                {gas.lastAlarmTime && (
                  <span className="text-[10px] font-mono text-slate-400">
                    Pukul: {gas.lastAlarmTime}
                  </span>
                )}
              </div>
              <h2 className="text-sm font-bold text-white mt-0.5">
                Nilai Gas Terbaca: {gas.gasValue} ADC (Sensor MQ ADC Pin 39)
              </h2>
              <p className="text-xs text-slate-300">
                {isTinggi
                  ? 'Konsentrasi gas melebihi ambang batas bahaya (>= 1500 ADC). Sirine darurat synthesizer aktif di sistem.'
                  : 'Konsentrasi gas terdeteksi meningkat (1000 - 1499 ADC). Disarankan sirkulasi udara maket dipantau.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setGasSensorValue(650)}
              className="px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold transition-colors cursor-pointer"
            >
              Reset ke Udara Bersih
            </button>
          </div>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Nilai Sensor Gas / MQ"
          value={gas.gasValue}
          unit="ADC"
          statusText={gas.statusPolusi}
          statusVariant={isTinggi ? 'danger' : isSedang ? 'warning' : 'success'}
          icon={<Wind className="w-4 h-4" />}
          footerText={`ADC Pin ${gas.pinGas} (Atten 11dB)`}
        />

        <MetricCard
          title="Status Kualitas Udara"
          value={gas.statusPolusi}
          statusText={
            gas.gasValue < 1000
              ? 'Nilai < 1000 (Aman)'
              : gas.gasValue < 1500
              ? '1000 <= Nilai < 1500'
              : 'Nilai >= 1500'
          }
          statusVariant={isTinggi ? 'danger' : isSedang ? 'warning' : 'success'}
          icon={<ShieldCheck className="w-4 h-4" />}
          footerText="Kategori Evaluasi Thonny"
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
          statusText="Batas Bahaya"
          statusVariant="danger"
          icon={<AlertTriangle className="w-4 h-4" />}
          footerText="Threshold Level 2"
        />
      </div>

      {/* Main Grid: Gas Gauge & Live Terminal Output */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left: Interactive Gas Gauge & Slider */}
        <div className="lg:col-span-6 glass-panel rounded-2xl p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <span className={`w-2.5 h-2.5 rounded-full ${isTinggi ? 'bg-rose-500 animate-ping' : isSedang ? 'bg-amber-400' : 'bg-emerald-400'}`} />
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                  Visualisasi Pembacaan Sensor Gas
                </h3>
              </div>
              <span className="text-xs font-mono text-cyan-300 bg-slate-900 px-2.5 py-0.5 rounded border border-slate-800">
                ADC Pin 39
              </span>
            </div>

            {/* Visual Gauge Display */}
            <div className="my-5 p-6 rounded-2xl bg-[#070D1A] border border-slate-800 flex flex-col items-center justify-center relative overflow-hidden">
              <div
                className="w-28 h-28 rounded-full border-4 flex flex-col items-center justify-center transition-all duration-500 shadow-2xl"
                style={{
                  borderColor: isTinggi ? '#F43F5E' : isSedang ? '#F59E0B' : '#10B981',
                  backgroundColor: isTinggi
                    ? 'rgba(244, 63, 94, 0.15)'
                    : isSedang
                    ? 'rgba(245, 158, 11, 0.15)'
                    : 'rgba(16, 185, 129, 0.15)',
                  boxShadow: isTinggi
                    ? '0 0 30px rgba(244, 63, 94, 0.4)'
                    : isSedang
                    ? '0 0 25px rgba(245, 158, 11, 0.3)'
                    : '0 0 20px rgba(16, 185, 129, 0.2)',
                }}
              >
                <Wind
                  className="w-10 h-10 transition-colors"
                  style={{
                    color: isTinggi ? '#FDA4AF' : isSedang ? '#FDE68A' : '#6EE7B7',
                  }}
                />
              </div>

              <div className="mt-4 text-center">
                <div className="text-3xl font-black text-white font-mono">{gas.gasValue}</div>
                <div
                  className="text-xs font-bold tracking-wider uppercase mt-1"
                  style={{ color: isTinggi ? '#FB7185' : isSedang ? '#FBBF24' : '#34D399' }}
                >
                  {gas.statusPolusi}
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  ADC 12-Bit Input (Rentang: 0 - 4095)
                </div>
              </div>
            </div>

            {/* Slider Kontrol Simulasi Gas */}
            <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2">
              <div className="flex justify-between text-xs text-slate-300 font-semibold">
                <span>Atur Nilai ADC Sensor Gas:</span>
                <span className="font-mono text-cyan-400 font-bold">{gas.gasValue}</span>
              </div>
              <input
                type="range"
                min="0"
                max="4095"
                value={gas.gasValue}
                onChange={(e) => setGasSensorValue(Number(e.target.value))}
                className="w-full accent-cyan-400 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                <span className="text-emerald-400">0 - 999 (Bersih)</span>
                <span className="text-amber-400">1000 - 1499 (Sedang)</span>
                <span className="text-rose-400">&gt;= 1500 (Tinggi)</span>
              </div>
            </div>

            {/* Preset Buttons */}
            <div className="space-y-2 mt-4">
              <span className="text-[11px] font-mono font-bold text-slate-400 uppercase">
                Uji Coba Level & Notifikasi Alarm:
              </span>
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => setGasSensorValue(650)}
                  className="py-2 px-2 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 text-xs font-semibold cursor-pointer transition-colors"
                >
                  Bersih (650)
                </button>
                <button
                  onClick={() => setGasSensorValue(1250)}
                  className="py-2 px-2 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 text-xs font-semibold cursor-pointer transition-colors"
                  title="Picu Notifikasi Polusi Sedang"
                >
                  Sedang (1250)
                </button>
                <button
                  onClick={() => setGasSensorValue(2100)}
                  className="py-2 px-2 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 text-xs font-bold shadow-lg shadow-rose-500/20 cursor-pointer transition-colors animate-pulse"
                  title="Picu Alarm Darurat Polusi Tinggi & Sirine"
                >
                  Tinggi / Alarm (2100)
                </button>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800 text-xs text-slate-400 flex items-center gap-2">
            <Info className="w-4 h-4 text-cyan-400 shrink-0" />
            <span>
              Sensor gas MQ membaca gas analog. Hasil ADC 12-bit diklasifikasikan ke dalam 3 tingkatan status.
            </span>
          </div>
        </div>

        {/* Right: Real Live Terminal Shell Output (Replacing static code snippet) */}
        <div className="lg:col-span-6 flex flex-col justify-between">
          <TerminalConsole
            filterFeature="polusi"
            title="Live Serial Terminal Output (Sensor Gas / MQ)"
            maxHeight="max-h-[380px]"
          />

          <div className="mt-4 p-4 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span className="text-white font-semibold">Spesifikasi Sensor:</span>
            </div>
            <div className="flex items-center gap-3 font-mono text-slate-300">
              <span>Sensor Gas / MQ</span>
              <span>•</span>
              <span>ADC Pin 39</span>
              <span>•</span>
              <span>Atten 11dB</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
