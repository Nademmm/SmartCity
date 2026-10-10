'use client';

import React from 'react';
import { useSmartCity } from '@/context/SmartCityContext';
import {
  Volume2,
  VolumeX,
  Clock,
  ShieldAlert,
  Wind,
  CheckCircle2,
  X,
} from 'lucide-react';

export const PollutionAlarmModal: React.FC = () => {
  const {
    gas,
    isPollutionAlarmActive,
    dismissPollutionAlarm,
    snoozePollutionAlarm,
    isAudioMuted,
    toggleAudioMute,
  } = useSmartCity();

  if (!isPollutionAlarmActive || gas.statusPolusi !== 'POLUSI TINGGI') {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm" />

      {/* Emergency Dialog Box */}
      <div className="relative w-full max-w-lg bg-[#0F1422] border border-rose-500/60 rounded-xl shadow-2xl overflow-hidden z-10">
        {/* Header */}
        <div className="bg-rose-950/60 border-b border-rose-500/30 px-5 py-3.5 flex items-center justify-between text-white">
          <div className="flex items-center gap-2.5">
            <div className="p-1 rounded bg-rose-500/20 text-rose-400">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] font-mono uppercase font-semibold text-rose-400">
                Peringatan Lingkungan
              </p>
              <h3 className="text-sm font-bold text-white">
                Alarm Polusi Udara Tinggi (&gt;= 1500 ADC)
              </h3>
            </div>
          </div>

          <button
            onClick={dismissPollutionAlarm}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            title="Tutup Peringatan"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 space-y-4 text-xs">
          {/* Siren Status */}
          <div className="p-3 rounded-lg bg-rose-950/30 border border-rose-500/20 flex items-center justify-between">
            <div>
              <p className="font-semibold text-rose-300">Sirine Alarm Aktif</p>
              <p className="text-slate-400 text-[11px] mt-0.5">
                Frekuensi audio peringatan bahaya polusi sedang diputar.
              </p>
            </div>

            <button
              onClick={toggleAudioMute}
              className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-white transition-colors cursor-pointer"
              title={isAudioMuted ? 'Nyalakan Audio' : 'Bisukan Audio'}
            >
              {isAudioMuted ? <VolumeX className="w-4 h-4 text-slate-500" /> : <Volume2 className="w-4 h-4 text-rose-400" />}
            </button>
          </div>

          {/* Gas Value & Meter Bar */}
          <div className="p-3.5 rounded-lg bg-slate-950/80 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-slate-400">
                <Wind className="w-4 h-4 text-rose-400" />
                <p>Sensor Gas MQ (ADC Pin 39):</p>
              </div>
              <p className="font-mono font-bold text-base text-rose-400">
                {gas.gasValue} ADC
              </p>
            </div>

            <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden border border-slate-800">
              <div
                className="h-full bg-rose-500 transition-all duration-300"
                style={{ width: `${Math.max(10, Math.min(100, (gas.gasValue / 2000) * 100))}%` }}
              />
            </div>

            <div className="flex justify-between text-[10px] font-mono text-slate-400">
              <p>Bersih (&lt; 1000)</p>
              <p>Sedang (1000-1499)</p>
              <p className="text-rose-400 font-semibold">Tinggi (&gt;= 1500)</p>
            </div>
          </div>

          {/* Instructions */}
          <div className="space-y-1.5 text-slate-300">
            <p className="font-semibold text-slate-200">Langkah Penanganan:</p>
            <ul className="list-disc list-inside space-y-1 text-slate-400 text-[11px]">
              <li>Aktifkan ventilasi sirkulasi udara di sekitar maket kota.</li>
              <li>Periksa sumber gas atau asap di sekitar modul sensor MQ.</li>
              <li>Pastikan nilai sensor kembali ke bawah ambang batas 1500 ADC.</li>
            </ul>
          </div>

          {/* Action Buttons */}
          <div className="pt-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
            <button
              onClick={dismissPollutionAlarm}
              className="py-2 px-3 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-medium text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              <p>Hentikan Alarm</p>
            </button>

            <button
              onClick={snoozePollutionAlarm}
              className="py-2 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-medium text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <Clock className="w-4 h-4 text-amber-400" />
              <p>Tunda 30 Detik</p>
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-2.5 bg-slate-950/80 border-t border-slate-800 text-[11px] font-mono text-slate-400 flex items-center justify-between">
          <p>Sistem Pemantau Polusi</p>
          <p className="text-rose-400 font-medium">{gas.lastAlarmTime || 'Baru Saja'}</p>
        </div>
      </div>
    </div>
  );
};
