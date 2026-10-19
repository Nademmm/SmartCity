'use client';

import React from 'react';
import { useSmartCity } from '@/context/SmartCityContext';
import {
  Volume2,
  VolumeX,
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
    isAudioMuted,
    toggleAudioMute,
    controlGasManual,
  } = useSmartCity();

  if (!isPollutionAlarmActive || gas.statusPolusi !== 'POLUSI TINGGI') {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        onClick={dismissPollutionAlarm}
        className="fixed inset-0 bg-[#19212d]/50 backdrop-blur-sm cursor-pointer" 
      />

      {/* Emergency Dialog Box */}
      <div 
        role="dialog"
        aria-modal="true"
        aria-labelledby="alarm-modal-title"
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-lg neu-raised rounded-3xl border border-[#fecdd3] overflow-hidden z-10 p-6 space-y-5"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[#d3dde9]">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-[#ffe4e6] text-[#e11d48] border border-[#fecdd3]">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <p className="text-[10px] font-mono uppercase font-bold text-[#e11d48]">
                Peringatan Lingkungan
              </p>
              <h3 id="alarm-modal-title" className="text-base font-bold text-[#19212d]">
                Alarm Polusi Udara (&gt;= 1500 ADC)
              </h3>
            </div>
          </div>

          <button
            type="button"
            onClick={dismissPollutionAlarm}
            className="neu-btn p-2 rounded-xl text-[#4e5d71] hover:text-[#19212d] min-h-[44px] min-w-[44px] flex items-center justify-center"
            title="Tutup Peringatan"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="space-y-4 text-xs">
          {/* Siren Status */}
          <div className="p-4 rounded-2xl bg-[#ffe4e6] border border-[#fecdd3] flex items-center justify-between text-[#e11d48]">
            <div>
              <p className="font-bold text-sm">Sirine Alarm Aktif</p>
              <p className="text-[11px] opacity-90 mt-0.5">
                Audio peringatan bahaya polusi sedang diputar.
              </p>
            </div>

            <button
              type="button"
              onClick={toggleAudioMute}
              className="neu-btn p-2.5 rounded-xl text-[#19212d] min-h-[44px] min-w-[44px] flex items-center justify-center"
              title={isAudioMuted ? 'Nyalakan Audio' : 'Bisukan Audio'}
            >
              {isAudioMuted ? <VolumeX className="w-5 h-5 text-[#8e9eaf]" /> : <Volume2 className="w-5 h-5 text-[#e11d48]" />}
            </button>
          </div>

          {/* Gas Value & Meter Bar */}
          <div className="p-4 rounded-2xl neu-inset border border-[#d3dde9] space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-[#4e5d71] font-bold">
                <Wind className="w-4 h-4 text-[#e11d48]" />
                <span>Sensor Gas MQ (ADC 39):</span>
              </div>
              <span className="font-mono font-extrabold text-lg text-[#e11d48]">
                {gas.gasValue} ADC
              </span>
            </div>

            <div className="w-full bg-[#dbe3ee] rounded-full h-2.5 overflow-hidden">
              <div
                className="h-full bg-[#e11d48] transition-all duration-300"
                style={{ width: `${Math.max(10, Math.min(100, (gas.gasValue / 2000) * 100))}%` }}
              />
            </div>

            <div className="flex justify-between text-[11px] font-mono text-[#6e7e93]">
              <span>Bersih (&lt; 1000)</span>
              <span>Sedang (1000 : 1499)</span>
              <span className="text-[#e11d48] font-bold">Tinggi (&gt;= 1500)</span>
            </div>
          </div>

          {/* Instructions */}
          <div className="space-y-1.5 text-[#19212d]">
            <p className="font-bold">Langkah Penanganan:</p>
            <ul className="list-disc list-inside space-y-1 text-[#4e5d71] text-[11px]">
              <li>Aktifkan ventilasi sirkulasi udara di sekitar maket kota.</li>
              <li>Periksa sumber gas atau asap di sekitar modul sensor MQ.</li>
              <li>Pastikan nilai sensor kembali ke bawah ambang batas 1500 ADC.</li>
            </ul>
          </div>

          {/* Action Buttons */}
          <div className="pt-2 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => {
                controlGasManual('BERSIH');
                dismissPollutionAlarm();
              }}
              className="neu-btn py-3 px-4 rounded-xl text-[#059669] font-bold text-xs flex items-center justify-center gap-2 min-h-[44px]"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Reset ke Udara Bersih</span>
            </button>

            <button
              type="button"
              onClick={dismissPollutionAlarm}
              className="neu-btn py-3 px-4 rounded-xl text-[#19212d] font-bold text-xs flex items-center justify-center gap-2 min-h-[44px]"
            >
              <X className="w-4 h-4" />
              <span>Tutup Sementara</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
