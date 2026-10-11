'use client';

import React from 'react';
import { useSmartCity } from '@/context/SmartCityContext';
import { MetricCard } from '@/components/common/MetricCard';
import { TerminalConsole } from '@/components/common/TerminalConsole';
import {
  Wind,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  Info,
} from 'lucide-react';

export const AirQualityView: React.FC = () => {
  const { gas, setGasSensorValue, testBuzzerAlarm, isHardwareConnected } = useSmartCity();

  const isTinggi = gas.statusPolusi === 'POLUSI TINGGI';
  const isSedang = gas.statusPolusi === 'POLUSI SEDANG';

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

          <button
            onClick={() => setGasSensorValue(650)}
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-medium text-xs self-start sm:self-auto cursor-pointer transition-colors"
          >
            Reset ke Bersih
          </button>
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
          footerText={`ADC Pin ${gas.pinGas} (Atten 11dB)`}
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

      {/* Gauge and Live Terminal */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Gauge Card */}
        <div className="lg:col-span-6 rounded-xl bg-slate-900/60 border border-slate-800/80 p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
              <h3 className="text-xs font-semibold text-white uppercase tracking-wider">
                Pembacaan Sensor Gas Analog
              </h3>
              <p className="text-[11px] font-mono text-slate-400">ADC Pin 39</p>
            </div>

            {/* Value Display */}
            <div className="my-5 p-5 rounded-xl bg-slate-950/80 border border-slate-800/80 flex flex-col items-center justify-center">
              <div
                className="w-20 h-20 rounded-full border-2 flex items-center justify-center transition-colors"
                style={{
                  borderColor: isTinggi ? '#F43F5E' : isSedang ? '#F59E0B' : '#10B981',
                }}
              >
                <Wind
                  className="w-8 h-8"
                  style={{
                    color: isTinggi ? '#FB7185' : isSedang ? '#FBBF24' : '#34D399',
                  }}
                />
              </div>

              <div className="mt-3 text-center">
                <p className="text-3xl font-bold text-white font-mono">{gas.gasValue}</p>
                <p
                  className="text-xs font-semibold uppercase mt-0.5"
                  style={{ color: isTinggi ? '#FB7185' : isSedang ? '#FBBF24' : '#34D399' }}
                >
                  {gas.statusPolusi}
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">Rentang ADC 12-Bit (0 sampai 4095)</p>
              </div>
            </div>

            {/* Slider */}
            <div className="p-3.5 rounded-lg bg-slate-900 border border-slate-800 space-y-2">
              <div className="flex justify-between text-xs text-slate-300 font-medium">
                <p>Simulasi Nilai Sensor Gas:</p>
                <p className="font-mono text-white font-bold">{gas.gasValue}</p>
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
                <p className="text-emerald-400">&lt; 1000 (Bersih)</p>
                <p className="text-amber-400">1000 - 1499 (Sedang)</p>
                <p className="text-rose-400">&gt;= 1500 (Tinggi)</p>
              </div>
            </div>

            {/* Presets */}
            <div className="mt-3 space-y-1.5">
              <p className="text-[11px] font-medium text-slate-400">Uji Coba Cepat Ambang Batas:</p>
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => setGasSensorValue(650)}
                  className="py-1.5 px-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-medium cursor-pointer transition-colors"
                >
                  Bersih (650)
                </button>
                <button
                  onClick={() => setGasSensorValue(1250)}
                  className="py-1.5 px-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-medium cursor-pointer transition-colors"
                >
                  Sedang (1250)
                </button>
                <button
                  onClick={() => setGasSensorValue(2100)}
                  className="py-1.5 px-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-medium cursor-pointer transition-colors"
                >
                  Tinggi (2100)
                </button>
              </div>

              <div className="pt-2">
                <button
                  onClick={testBuzzerAlarm}
                  className="w-full py-2 px-3 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-xs font-medium transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <AlertTriangle className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Uji Alarm Buzzer Fisik (ESP32 Pin 13)</span>
                </button>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800/80 text-[11px] text-slate-400 flex items-center gap-2">
            <Info className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <p>Sensor gas MQ membaca nilai analog dan diklasifikasikan ke dalam 3 tingkatan status.</p>
          </div>
        </div>

        {/* Live Terminal Console */}
        <div className="lg:col-span-6 flex flex-col justify-between">
          <TerminalConsole
            filterFeature="polusi"
            title="Serial Output (Sensor Gas / MQ)"
            maxHeight="max-h-[380px]"
          />

          <div className="mt-3 p-3.5 rounded-xl bg-slate-900/60 border border-slate-800/80 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <p className="text-white font-medium">Spesifikasi Hardware:</p>
            </div>
            <div className="flex items-center gap-2 font-mono text-slate-400 text-[11px]">
              <p>MQ Gas</p>
              <p>•</p>
              <p>Pin ADC 39</p>
              <p>•</p>
              <p>Atten 11dB</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
