'use client';

import React from 'react';
import { useSmartCity } from '@/context/SmartCityContext';
import { MetricCard } from '@/components/common/MetricCard';
import {
  Lightbulb,
  Sun,
  Moon,
  Zap,
  Sliders,
} from 'lucide-react';

export const LightingView: React.FC = () => {
  const { pju, setLdrValue, togglePjuDayNight, controlPjuManual } = useSmartCity();

  const isGelap = pju.kondisi === 'GELAP';
  const ldrPercent = Math.min(100, Math.round((pju.ldrValue / 4095) * 100));

  return (
    <div className="space-y-6">
      {/* 4 Clean Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Sensor Cahaya LDR"
          value={pju.ldrValue}
          unit="ADC"
          colorScheme={isGelap ? 'amber' : 'cyan'}
          icon={<Sliders className="w-5 h-5" />}
          subtitle={`Batas Ambang: ${pju.thresholdLdr}`}
        />

        <MetricCard
          title="Status Lampu Jalan"
          value={pju.pjuStatus}
          colorScheme={isGelap ? 'amber' : 'emerald'}
          icon={<Lightbulb className="w-5 h-5" />}
          subtitle={`Kondisi Lingkungan: ${pju.kondisi}`}
        />

        <MetricCard
          title="Lampu LED Merah"
          value={pju.ledMerah ? 'MENYALA' : 'PADAM'}
          colorScheme={pju.ledMerah ? 'rose' : 'indigo'}
          icon={<Zap className="w-5 h-5" />}
          subtitle="Aktuator Pin 25"
        />

        <MetricCard
          title="Lampu LED Putih"
          value={pju.ledPutih ? 'MENYALA' : 'PADAM'}
          colorScheme={pju.ledPutih ? 'amber' : 'indigo'}
          icon={<Lightbulb className="w-5 h-5" />}
          subtitle="Aktuator Pin 26"
        />
      </div>

      {/* Main Lighting Visualizer & Controls */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Visual Ambient Indicator */}
        <div className={`lg:col-span-7 neu-raised ${isGelap ? 'neu-glow-amber' : 'neu-glow-cyan'} rounded-3xl p-8 border border-white/80 flex flex-col items-center justify-center transition-all duration-300`}>
          <div className="flex items-center justify-between w-full mb-6">
            <h2 className="text-xs font-bold text-[#4e5d71] uppercase tracking-wider">
              Tingkat Cahaya Lingkungan
            </h2>
            <button
              type="button"
              onClick={togglePjuDayNight}
              className="neu-btn px-4 py-2 rounded-xl text-xs font-bold text-[#19212d] flex items-center gap-2 min-h-[44px]"
            >
              {isGelap ? <Sun className="w-4 h-4 text-[#d97706]" /> : <Moon className="w-4 h-4 text-[#4f46e5]" />}
              <span>{isGelap ? 'Simulasi Siang' : 'Simulasi Malam'}</span>
            </button>
          </div>

          {/* Central Lamp Visual */}
          <div className="relative w-48 h-48 rounded-full neu-inset flex items-center justify-center p-4 my-2">
            <div
              className={`w-36 h-36 rounded-full neu-raised flex flex-col items-center justify-center transition-all duration-500 ${
                isGelap
                  ? 'bg-[#fef3c7] text-[#d97706] shadow-[0_0_30px_rgba(245,158,11,0.35)]'
                  : 'bg-[#e0f2fe] text-[#0284c7]'
              }`}
            >
              {isGelap ? (
                <Lightbulb className="w-14 h-14 text-[#d97706] animate-pulse" />
              ) : (
                <Sun className="w-14 h-14 text-[#0284c7]" />
              )}
              <span className="text-xs font-bold mt-2 uppercase tracking-wider">
                {isGelap ? 'Malam (Menyala)' : 'Siang (Padam)'}
              </span>
            </div>
          </div>

          {/* Light Meter Progress Bar */}
          <div className="w-full max-w-md mt-6 space-y-2">
            <div className="flex justify-between text-xs font-mono font-bold text-[#4e5d71]">
              <span>Terang (0)</span>
              <span className="text-[#d97706]">Ambang: {pju.thresholdLdr}</span>
              <span>Gelap (4095)</span>
            </div>
            <div className="w-full h-3 neu-inset rounded-full overflow-hidden p-0.5">
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{
                  width: `${ldrPercent}%`,
                  backgroundColor: isGelap ? '#d97706' : '#0284c7',
                }}
              />
            </div>
            <p className="text-center font-mono text-sm font-bold text-[#19212d] pt-1">
              {pju.ldrValue} ADC ({ldrPercent}%)
            </p>
          </div>
        </div>

        {/* Right: Tactile Controls */}
        <div className="lg:col-span-5 neu-raised rounded-3xl p-6 border border-white/80 flex flex-col justify-between">
          <div className="space-y-6">
            <div className="pb-3 border-b border-[#d3dde9]">
              <h3 className="text-xs font-bold text-[#4e5d71] uppercase tracking-wider">
                Pengaturan Penerangan
              </h3>
            </div>

            {/* Manual Slider */}
            <div className="p-4 neu-inset rounded-2xl space-y-3">
              <div className="flex justify-between text-xs font-semibold text-[#19212d]">
                <span>Nilai LDR:</span>
                <span className="font-mono text-sm font-bold text-[#d97706]">{pju.ldrValue} ADC</span>
              </div>
              <input
                type="range"
                min="0"
                max="4095"
                value={pju.ldrValue}
                onChange={(e) => setLdrValue(Number(e.target.value))}
                className="neu-range"
                aria-label="Atur Sensor LDR Manual"
              />
            </div>

            {/* Actuator Direct Controls */}
            <div className="space-y-3">
              <div className="flex justify-between text-xs font-bold text-[#4e5d71]">
                <span>Mode Lampu:</span>
                <span className="font-mono text-[#0284c7]">{pju.pjuMode || 'AUTO'}</span>
              </div>
              <div className="grid grid-cols-3 gap-2.5">
                <button
                  type="button"
                  onClick={() => controlPjuManual('ON')}
                  className={`neu-btn py-3 px-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 min-h-[44px] ${
                    pju.pjuMode === 'ON' || pju.kondisi === 'MANUAL_ON'
                      ? 'neu-btn-active text-[#d97706]'
                      : 'text-[#19212d]'
                  }`}
                >
                  <Zap className="w-4 h-4" />
                  <span>ON</span>
                </button>
                <button
                  type="button"
                  onClick={() => controlPjuManual('OFF')}
                  className={`neu-btn py-3 px-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 min-h-[44px] ${
                    pju.pjuMode === 'OFF' || pju.kondisi === 'MANUAL_OFF'
                      ? 'neu-btn-active text-[#4e5d71]'
                      : 'text-[#19212d]'
                  }`}
                >
                  <Moon className="w-4 h-4" />
                  <span>OFF</span>
                </button>
                <button
                  type="button"
                  onClick={() => controlPjuManual('AUTO')}
                  className={`neu-btn py-3 px-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 min-h-[44px] ${
                    pju.pjuMode === 'AUTO' || !pju.pjuMode
                      ? 'neu-btn-active text-[#059669]'
                      : 'text-[#19212d]'
                  }`}
                >
                  <Sun className="w-4 h-4" />
                  <span>Auto</span>
                </button>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-[#d3dde9] text-xs font-medium text-[#6e7e93] text-center">
            PJU aktif otomatis saat sensor melampaui 2000 ADC.
          </div>
        </div>
      </div>
    </div>
  );
};
