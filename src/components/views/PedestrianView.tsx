'use client';

import React from 'react';
import { useSmartCity } from '@/context/SmartCityContext';
import { MetricCard } from '@/components/common/MetricCard';
import {
  Footprints,
  Radio,
  Volume2,
  VolumeX,
  RotateCcw,
  UserCheck,
} from 'lucide-react';

export const PedestrianView: React.FC = () => {
  const {
    crossing,
    triggerCrossingDetection,
    resetCrossingToSafe,
    testBuzzerAlarm,
  } = useSmartCity();

  const isMenyebrang = crossing.lampu === 'MERAH';
  const isKuning = crossing.lampu === 'KUNING';

  return (
    <div className="space-y-6">
      {/* Active Crossing Banner */}
      {isMenyebrang && (
        <div className="rounded-2xl p-4 bg-[#ffe4e6] border border-[#fecdd3] text-[#e11d48] flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Footprints className="w-5 h-5 text-[#e11d48] shrink-0" />
            <div>
              <p className="font-bold text-sm">Penyeberangan Aktif ({crossing.countdownSeconds}s)</p>
              <p className="text-xs opacity-90">Kendaraan berhenti, pejalan kaki dipersilakan menyeberang.</p>
            </div>
          </div>
          <button
            type="button"
            onClick={resetCrossingToSafe}
            className="neu-btn px-4 py-2 rounded-xl text-xs font-bold text-[#059669] min-h-[44px]"
          >
            Reset Aman
          </button>
        </div>
      )}

      {/* 4 Clean Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Ultrasonik Kanan"
          value={crossing.jarakKanan !== null ? `${Math.round(crossing.jarakKanan * 10) / 10}` : '-'}
          unit="cm"
          colorScheme={crossing.orangKanan ? 'rose' : 'emerald'}
          icon={<Radio className="w-5 h-5" />}
          subtitle={`Batas Deteksi: ${crossing.batasKanan} cm`}
        />

        <MetricCard
          title="Ultrasonik Kiri"
          value={crossing.jarakKiri !== null ? `${Math.round(crossing.jarakKiri * 10) / 10}` : '-'}
          unit="cm"
          colorScheme={crossing.orangKiri ? 'rose' : 'emerald'}
          icon={<Radio className="w-5 h-5" />}
          subtitle={`Batas Deteksi: ${crossing.batasKiri} cm`}
        />

        <MetricCard
          title="Lampu Sinyal"
          value={crossing.lampu}
          unit={isMenyebrang ? `${crossing.countdownSeconds}s` : undefined}
          colorScheme={isMenyebrang ? 'rose' : isKuning ? 'amber' : 'emerald'}
          icon={<Footprints className="w-5 h-5" />}
          subtitle={isMenyebrang ? 'Pejalan Kaki Jalan' : 'Kendaraan Jalan'}
        />

        <MetricCard
          title="Buzzer Audio"
          value={crossing.buzzer ? 'BUNYI' : 'SIAGA'}
          colorScheme={crossing.buzzer ? 'rose' : 'indigo'}
          icon={crossing.buzzer ? <Volume2 className="w-5 h-5 text-[#e11d48]" /> : <VolumeX className="w-5 h-5" />}
          subtitle="Pemberitahuan Aman"
        />
      </div>

      {/* Visual Road Simulation & Controls */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Visual Road & Traffic Light */}
        <div className={`lg:col-span-7 neu-raised ${isMenyebrang ? 'neu-glow-rose' : 'neu-glow-emerald'} rounded-3xl p-8 border border-white/80 flex flex-col items-center justify-between transition-all duration-300`}>
          <div className="flex items-center justify-between w-full mb-4">
            <h2 className="text-xs font-bold text-[#4e5d71] uppercase tracking-wider">
              Visualisasi Penyeberangan Pintar
            </h2>
            <button
              type="button"
              onClick={resetCrossingToSafe}
              className="neu-btn px-4 py-2 rounded-xl text-xs font-bold text-[#059669] flex items-center gap-1.5 min-h-[44px]"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Reset Aman</span>
            </button>
          </div>

          {/* Traffic Signal Lights Graphic */}
          <div className="neu-inset p-4 rounded-3xl flex items-center gap-4 my-6">
            {/* Merah */}
            <div
              className={`w-14 h-14 rounded-full flex items-center justify-center font-mono font-extrabold text-sm transition-all duration-300 ${
                crossing.lampu === 'MERAH'
                  ? 'bg-[#e11d48] text-white shadow-[0_0_20px_rgba(225,29,72,0.6)] scale-110'
                  : 'bg-[#dbe3ee] text-[#8e9eaf]'
              }`}
            >
              {crossing.lampu === 'MERAH' ? `${crossing.countdownSeconds}s` : ''}
            </div>

            {/* Kuning */}
            <div
              className={`w-14 h-14 rounded-full flex items-center justify-center font-mono font-extrabold text-sm transition-all duration-300 ${
                crossing.lampu === 'KUNING'
                  ? 'bg-[#d97706] text-white shadow-[0_0_20px_rgba(217,119,6,0.6)] scale-110'
                  : 'bg-[#dbe3ee] text-[#8e9eaf]'
              }`}
            >
              {crossing.lampu === 'KUNING' ? '1s' : ''}
            </div>

            {/* Hijau */}
            <div
              className={`w-14 h-14 rounded-full flex items-center justify-center font-mono font-extrabold text-sm transition-all duration-300 ${
                crossing.lampu === 'HIJAU'
                  ? 'bg-[#059669] text-white shadow-[0_0_20px_rgba(5,150,105,0.6)] scale-110'
                  : 'bg-[#dbe3ee] text-[#8e9eaf]'
              }`}
            >
              {crossing.lampu === 'HIJAU' ? 'JALAN' : ''}
            </div>
          </div>

          {/* Dual Ultrasonic Meter Bars */}
          <div className="w-full grid grid-cols-2 gap-4 mt-2">
            <div className={`p-4 rounded-2xl neu-inset border transition-all ${crossing.orangKiri ? 'border-[#fecdd3] bg-[#ffe4e6]' : 'border-transparent'}`}>
              <div className="flex justify-between items-center text-xs font-bold mb-1">
                <span className="text-[#4e5d71]">Sensor Kiri:</span>
                <span className="font-mono text-[#0284c7]">
                  {crossing.jarakKiri !== null ? `${Math.round(crossing.jarakKiri)} cm` : '-'}
                </span>
              </div>
              <div className="w-full h-2 rounded-full bg-[#dbe3ee] overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-200"
                  style={{
                    width: `${Math.min(100, ((crossing.jarakKiri || 50) / 50) * 100)}%`,
                    backgroundColor: crossing.orangKiri ? '#e11d48' : '#059669',
                  }}
                />
              </div>
            </div>

            <div className={`p-4 rounded-2xl neu-inset border transition-all ${crossing.orangKanan ? 'border-[#fecdd3] bg-[#ffe4e6]' : 'border-transparent'}`}>
              <div className="flex justify-between items-center text-xs font-bold mb-1">
                <span className="text-[#4e5d71]">Sensor Kanan:</span>
                <span className="font-mono text-[#0284c7]">
                  {crossing.jarakKanan !== null ? `${Math.round(crossing.jarakKanan)} cm` : '-'}
                </span>
              </div>
              <div className="w-full h-2 rounded-full bg-[#dbe3ee] overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-200"
                  style={{
                    width: `${Math.min(100, ((crossing.jarakKanan || 50) / 50) * 100)}%`,
                    backgroundColor: crossing.orangKanan ? '#e11d48' : '#059669',
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Right: Tactile Simulation Buttons */}
        <div className="lg:col-span-5 neu-raised rounded-3xl p-6 border border-white/80 flex flex-col justify-between">
          <div className="space-y-5">
            <div className="pb-3 border-b border-[#d3dde9]">
              <h3 className="text-xs font-bold text-[#4e5d71] uppercase tracking-wider">
                Simulasi Uji Penyeberangan
              </h3>
            </div>

            <div className="grid grid-cols-1 gap-3">
              <button
                type="button"
                onClick={() => triggerCrossingDetection('kanan')}
                className="neu-btn py-3.5 px-4 rounded-2xl text-xs font-bold text-[#19212d] flex items-center justify-between min-h-[44px]"
              >
                <div className="flex items-center gap-2.5">
                  <UserCheck className="w-4 h-4 text-[#0284c7]" />
                  <span>Uji Pejalan Kaki (Kanan)</span>
                </div>
                <span className="font-mono text-[11px] text-[#6e7e93]">&lt;= 17 cm</span>
              </button>

              <button
                type="button"
                onClick={() => triggerCrossingDetection('kiri')}
                className="neu-btn py-3.5 px-4 rounded-2xl text-xs font-bold text-[#19212d] flex items-center justify-between min-h-[44px]"
              >
                <div className="flex items-center gap-2.5">
                  <UserCheck className="w-4 h-4 text-[#0284c7]" />
                  <span>Uji Pejalan Kaki (Kiri)</span>
                </div>
                <span className="font-mono text-[11px] text-[#6e7e93]">&lt;= 25 cm</span>
              </button>

              <button
                type="button"
                onClick={() => triggerCrossingDetection('kedua')}
                className="neu-btn py-3.5 px-4 rounded-2xl text-xs font-bold text-[#19212d] flex items-center justify-between min-h-[44px]"
              >
                <div className="flex items-center gap-2.5">
                  <Footprints className="w-4 h-4 text-[#059669]" />
                  <span>Uji Kedua Sisi Sekaligus</span>
                </div>
                <span className="font-mono text-[11px] text-[#6e7e93]">Simultan</span>
              </button>

              <button
                type="button"
                onClick={testBuzzerAlarm}
                className="neu-btn py-3.5 px-4 rounded-2xl text-xs font-bold text-[#e11d48] flex items-center justify-between min-h-[44px]"
              >
                <div className="flex items-center gap-2.5">
                  <Volume2 className="w-4 h-4 text-[#e11d48]" />
                  <span>Uji Suara Buzzer</span>
                </div>
                <span className="font-mono text-[11px] text-[#6e7e93]">Audio Tototot</span>
              </button>
            </div>
          </div>

          <div className="pt-4 border-t border-[#d3dde9] text-xs font-medium text-[#6e7e93] text-center">
            Lampu merah aktif selama 5 detik dengan sinyal audio buzzer.
          </div>
        </div>
      </div>
    </div>
  );
};
