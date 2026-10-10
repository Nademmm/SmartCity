'use client';

import React from 'react';
import { useSmartCity } from '@/context/SmartCityContext';
import {
  AlertTriangle,
  Volume2,
  VolumeX,
  BellOff,
  Clock,
  ShieldAlert,
  Wind,
  CheckCircle2,
  Flame,
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

  // Hanya tampilkan jika status polusi tinggi dan alarm aktif
  if (!isPollutionAlarmActive || gas.statusPolusi !== 'POLUSI TINGGI') {
    return null;
  }

  const gasPercentage = Math.min(100, Math.round((gas.gasValue / 4095) * 100));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Perimeter Flashing Hazard Aura */}
      <div className="fixed inset-0 bg-rose-950/80 backdrop-blur-md animate-pulse" />
      <div className="fixed inset-0 pointer-events-none border-[6px] border-rose-500/70 shadow-[inset_0_0_80px_rgba(244,63,94,0.5)] animate-pulse" />

      {/* Emergency Tactical Dialog Box */}
      <div className="relative w-full max-w-lg bg-[#0B0F19] border-2 border-rose-500 rounded-2xl shadow-2xl overflow-hidden z-10 animate-in fade-in zoom-in duration-200">
        {/* Top Emergency Strip */}
        <div className="bg-gradient-to-r from-rose-600 via-rose-500 to-amber-600 px-5 py-3 flex items-center justify-between text-white shadow-lg">
          <div className="flex items-center gap-2.5">
            <span className="p-1 rounded-md bg-white/20 animate-bounce">
              <ShieldAlert className="w-5 h-5" />
            </span>
            <div>
              <span className="text-[10px] font-mono uppercase tracking-widest bg-black/40 px-2 py-0.5 rounded font-bold">
                KODE MERAH
              </span>
              <h3 className="text-sm font-extrabold tracking-tight mt-0.5">
                ALARM DARURAT POLUSI UDARA TINGGI
              </h3>
            </div>
          </div>

          <button
            onClick={dismissPollutionAlarm}
            className="p-1 rounded-lg bg-black/20 hover:bg-black/40 text-white transition-colors"
            title="Tutup Peringatan"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-5">
          {/* Audio Siren Status Beacon */}
          <div className="p-3.5 rounded-xl bg-rose-950/40 border border-rose-500/40 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/50">
                <Flame className="w-5 h-5 animate-pulse" />
                <span className="absolute -top-1 -right-1 w-3 h-3 bg-rose-500 rounded-full animate-ping" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-rose-300">
                    Sirine Suara Darurat Aktif
                  </span>
                  <span className="px-1.5 py-0.2 rounded text-[10px] font-mono font-bold bg-rose-500 text-white">
                    LIVE AUDIO
                  </span>
                </div>
                <p className="text-[11px] text-slate-300 mt-0.5">
                  Synthesizer dua nada frekuensi bahaya lingkungan sedang berbunyi.
                </p>
              </div>
            </div>

            <button
              onClick={toggleAudioMute}
              className={`p-2 rounded-lg text-xs font-semibold border transition-all ${
                isAudioMuted
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                  : 'bg-slate-800 text-slate-300 border-slate-700 hover:text-white'
              }`}
              title={isAudioMuted ? 'Nyalakan Audio' : 'Senyapkan Audio'}
            >
              {isAudioMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4 text-rose-400" />}
            </button>
          </div>

          {/* Real-time Gas Value & Gauge Bar */}
          <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 space-y-2.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400 font-medium flex items-center gap-1.5">
                <Wind className="w-4 h-4 text-rose-400" />
                Sensor Gas / MQ (ADC Pin 39):
              </span>
              <span className="font-mono font-extrabold text-base text-rose-400">
                {gas.gasValue} <span className="text-xs text-slate-400">ADC</span>
              </span>
            </div>

            {/* Meter Bar */}
            <div className="w-full bg-slate-950 rounded-full h-3.5 p-0.5 border border-slate-800 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-amber-500 to-rose-500 transition-all duration-300"
                style={{ width: `${Math.max(10, Math.min(100, (gas.gasValue / 2000) * 100))}%` }}
              />
            </div>

            <div className="flex justify-between text-[10px] font-mono text-slate-400 pt-1">
              <span>Bersih (&lt;1000)</span>
              <span>Sedang (1000-1499)</span>
              <span className="text-rose-400 font-bold">Bahaya (&gt;=1500)</span>
            </div>
          </div>

          {/* Actionable Hazard Protocol Guidelines */}
          <div className="space-y-2">
            <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
              Rekomendasi Protokol Tanggap Darurat Kota:
            </span>
            <ul className="text-xs text-slate-300 space-y-1.5 pl-2">
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-400 mt-1.5 shrink-0" />
                <span>Nyalakan sistem kipas sirkulasi / exhaust fan pada maket kota.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-400 mt-1.5 shrink-0" />
                <span>Jauhkan sumber asap, korek, atau gas aerosol dari sensor MQ.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-400 mt-1.5 shrink-0" />
                <span>Wajib masker proteksi untuk simulasi pejalan kaki di zona tercemar.</span>
              </li>
            </ul>
          </div>

          {/* Control Buttons (Acknowledge & Snooze) */}
          <div className="pt-2 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <button
              onClick={dismissPollutionAlarm}
              className="py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-lg shadow-rose-600/30 flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Matikan Alarm (Acknowledge)</span>
            </button>

            <button
              onClick={snoozePollutionAlarm}
              className="py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-semibold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <Clock className="w-4 h-4 text-amber-400" />
              <span>Tunda 30 Detik (Snooze)</span>
            </button>
          </div>
        </div>

        {/* Footer info strip */}
        <div className="px-5 py-2.5 bg-slate-950 border-t border-slate-800 text-[11px] font-mono text-slate-400 flex items-center justify-between">
          <span>Smart City Hazard Warning System</span>
          <span className="text-rose-400 font-bold">{gas.lastAlarmTime || 'Baru Saja'}</span>
        </div>
      </div>
    </div>
  );
};
