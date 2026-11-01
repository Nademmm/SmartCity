'use client';

import React, { useEffect } from 'react';
import { useSmartCity } from '@/context/SmartCityContext';

export const PollutionAlarmModal: React.FC = () => {
  const {
    gas,
    isPollutionAlarmActive,
    dismissPollutionAlarm,
    snoozePollutionAlarm,
    isAudioMuted,
    toggleAudioMute,
    controlGasManual,
  } = useSmartCity();

  useEffect(() => {
    if (!isPollutionAlarmActive || gas.statusPolusi !== 'POLUSI TINGGI') return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        dismissPollutionAlarm();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isPollutionAlarmActive, gas.statusPolusi, dismissPollutionAlarm]);

  if (!isPollutionAlarmActive || gas.statusPolusi !== 'POLUSI TINGGI') {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        onClick={dismissPollutionAlarm}
        className="fixed inset-0 bg-black/60 cursor-pointer"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="alarm-modal-title"
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-md rack-panel p-5 z-10 space-y-4 border-2"
        style={{ borderColor: 'var(--sig-red)' }}
      >
        <div className="flex items-center justify-between pb-3 border-b border-[var(--border-line)]">
          <div className="flex items-center gap-2.5">
            <span
              className="w-3 h-3 rounded-full shrink-0"
              style={{ backgroundColor: 'var(--sig-red)' }}
            />
            <div>
              <h3 id="alarm-modal-title" className="text-sm font-bold text-[var(--text-primary)]">
                ALARM GAS MQ (&gt;= 1500 ADC)
              </h3>
              <p className="text-xs font-mono text-[var(--text-secondary)]">
                PIN ADC 39 · BUZZER PIN 4 AKTIF
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={dismissPollutionAlarm}
            className="ctrl-btn px-3 py-1.5 text-xs font-mono"
          >
            TUTUP [ESC]
          </button>
        </div>

        <div className="rack-well p-3.5 flex items-center justify-between">
          <div>
            <span className="text-xs text-[var(--text-secondary)] block">Pembacaan Saat Ini</span>
            <span
              className="text-2xl font-mono font-bold"
              style={{ color: 'var(--sig-red)' }}
            >
              {gas.gasValue} ADC
            </span>
          </div>
          <span
            className="px-2.5 py-1 rounded text-xs font-mono font-bold border"
            style={{
              backgroundColor: 'var(--sig-red-bg)',
              borderColor: 'var(--sig-red)',
              color: 'var(--sig-red)',
            }}
          >
            {gas.statusPolusi}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          <button
            type="button"
            onClick={() => {
              controlGasManual('BERSIH');
              dismissPollutionAlarm();
            }}
            className="ctrl-btn ctrl-btn-green px-3 py-2.5 text-xs font-mono"
          >
            SET BERSIH (650)
          </button>

          <button
            type="button"
            onClick={toggleAudioMute}
            className="ctrl-btn px-3 py-2.5 text-xs font-mono"
          >
            {isAudioMuted ? 'SUARA: MATI' : 'BISUKAN AUDIO'}
          </button>

          <button
            type="button"
            onClick={snoozePollutionAlarm}
            className="ctrl-btn px-3 py-2.5 text-xs font-mono"
          >
            TUNDA 1 MENIT
          </button>

          <button
            type="button"
            onClick={dismissPollutionAlarm}
            className="ctrl-btn ctrl-btn-red px-3 py-2.5 text-xs font-mono"
          >
            MATIKAN ALARM
          </button>
        </div>
      </div>
    </div>
  );
};
