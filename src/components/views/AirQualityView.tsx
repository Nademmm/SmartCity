'use client';

import React, { useState, useEffect } from 'react';
import { useSmartCity } from '@/context/SmartCityContext';
import { MetricCard } from '@/components/common/MetricCard';
import {
  Wind,
  AlertTriangle,
  Sliders,
  Cpu,
  RotateCcw,
} from 'lucide-react';

export const AirQualityView: React.FC = () => {
  const { gas, controlGasManual, testBuzzerAlarm, isHardwareConnected } = useSmartCity();

  const [localSliderVal, setLocalSliderVal] = useState<number>(gas.gasValue);

  useEffect(() => {
    setLocalSliderVal(gas.gasValue);
  }, [gas.gasValue]);

  const isTinggi = gas.gasValue >= 1500;
  const isSedang = gas.gasValue >= 1000 && gas.gasValue < 1500;
  const isManual = gas.gasMode === 'MANUAL';

  const activeColor = isTinggi ? '#e11d48' : isSedang ? '#d97706' : '#059669';
  const activeGlow = isTinggi ? 'neu-glow-rose' : isSedang ? 'neu-glow-amber' : 'neu-glow-emerald';

  const percentage = Math.min(100, Math.round((gas.gasValue / 2500) * 100));

  return (
    <div className="space-y-6">
      {/* High Pollution Warning Strip */}
      {isTinggi && (
        <div className="rounded-2xl p-4 bg-[#ffe4e6] border border-[#fecdd3] text-[#e11d48] flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 shrink-0 text-[#e11d48]" />
            <div>
              <p className="font-bold text-sm">Konsentrasi Gas Tinggi ({gas.gasValue} ADC)</p>
              <p className="text-xs opacity-90">Nilai sensor melampaui batas aman 1500 ADC.</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => controlGasManual('BERSIH')}
            className="neu-btn px-4 py-2 rounded-xl text-xs font-bold text-[#059669] min-h-[44px]"
          >
            Reset Bersih
          </button>
        </div>
      )}

      {/* KPI Cards: Pure Minimalist Numbers */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Sensor Gas MQ"
          value={gas.gasValue}
          unit="ADC"
          colorScheme={isTinggi ? 'rose' : isSedang ? 'amber' : 'emerald'}
          icon={<Wind className="w-5 h-5" />}
          subtitle="Pin ADC 39 ESP32"
        />

        <MetricCard
          title="Batas Aman"
          value="1000"
          unit="ADC"
          colorScheme="emerald"
          icon={<Wind className="w-5 h-5" />}
          subtitle="Ambang Batas Bawah"
        />

        <MetricCard
          title="Batas Bahaya"
          value="1500"
          unit="ADC"
          colorScheme="rose"
          icon={<AlertTriangle className="w-5 h-5" />}
          subtitle="Ambang Batas Alarm"
        />

        <MetricCard
          title="Mode Operasi"
          value={gas.gasMode || 'AUTO'}
          colorScheme="indigo"
          icon={<Cpu className="w-5 h-5" />}
          subtitle={isManual ? 'Simulasi Manual' : 'Sensor Fisik Langsung'}
        />
      </div>

      {/* Centerpiece Minimalist Neumorphic Monitoring Dial & Control */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Large Visual Gas Dial */}
        <div className={`lg:col-span-7 neu-raised ${activeGlow} rounded-3xl p-8 border border-white/80 flex flex-col items-center justify-center transition-all duration-300`}>
          <h2 className="text-xs font-bold text-[#4e5d71] uppercase tracking-wider mb-6">
            Tingkat Konsentrasi Gas
          </h2>

          {/* Circular Neumorphic Well */}
          <div className="relative w-56 h-56 rounded-full neu-inset flex items-center justify-center p-4">
            {/* SVG Progress Arc */}
            <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
              <circle
                cx="50"
                cy="50"
                r="40"
                fill="none"
                stroke="#cbd5e1"
                strokeWidth="7"
                strokeLinecap="round"
              />
              <circle
                cx="50"
                cy="50"
                r="40"
                fill="none"
                stroke={activeColor}
                strokeWidth="7"
                strokeDasharray="251.2"
                strokeDashoffset={251.2 - (251.2 * percentage) / 100}
                strokeLinecap="round"
                className="transition-all duration-500 ease-out"
              />
            </svg>

            {/* Inner Center Info */}
            <div className="absolute inset-7 rounded-full neu-raised flex flex-col items-center justify-center border border-white/90">
              <span className="text-4xl font-extrabold font-mono tracking-tight" style={{ color: activeColor }}>
                {gas.gasValue}
              </span>
              <span className="text-xs font-bold uppercase mt-1 tracking-wider" style={{ color: activeColor }}>
                {gas.statusPolusi}
              </span>
              <span className="text-[11px] text-[#6e7e93] font-mono mt-0.5">ADC</span>
            </div>
          </div>

          <div className="w-full max-w-sm mt-6 flex justify-between text-xs font-mono text-[#6e7e93]">
            <span>0</span>
            <span className="font-semibold text-[#059669]">1000</span>
            <span className="font-semibold text-[#d97706]">1500</span>
            <span>2500+</span>
          </div>
        </div>

        {/* Right: Tactile Minimalist Controls */}
        <div className="lg:col-span-5 neu-raised rounded-3xl p-6 border border-white/80 flex flex-col justify-between">
          <div className="space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-[#d3dde9]">
              <h3 className="text-xs font-bold text-[#4e5d71] uppercase tracking-wider">
                Kendali Sensor
              </h3>
              {isManual && (
                <button
                  type="button"
                  onClick={() => controlGasManual('AUTO')}
                  className="text-xs text-[#0284c7] font-bold hover:underline flex items-center gap-1.5 min-h-[44px]"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Kembali ke Auto</span>
                </button>
              )}
            </div>

            {/* Mode Switcher */}
            <div className="grid grid-cols-2 gap-2.5 p-1.5 neu-inset rounded-2xl">
              <button
                type="button"
                onClick={() => controlGasManual('AUTO')}
                className={`py-3 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all min-h-[44px] ${
                  !isManual ? 'neu-btn-active text-[#059669]' : 'text-[#4e5d71]'
                }`}
              >
                <Cpu className="w-4 h-4" />
                <span>Otomatis</span>
              </button>
              <button
                type="button"
                onClick={() => controlGasManual(localSliderVal)}
                className={`py-3 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all min-h-[44px] ${
                  isManual ? 'neu-btn-active text-[#0284c7]' : 'text-[#4e5d71]'
                }`}
              >
                <Sliders className="w-4 h-4" />
                <span>Manual</span>
              </button>
            </div>

            {/* Slider */}
            <div className="p-4 neu-inset rounded-2xl space-y-3">
              <div className="flex justify-between text-xs font-semibold text-[#19212d]">
                <span>Nilai Simulasi:</span>
                <span className="font-mono text-sm font-bold text-[#0284c7]">{localSliderVal} ADC</span>
              </div>
              <input
                type="range"
                min="0"
                max="3000"
                value={localSliderVal}
                onChange={(e) => setLocalSliderVal(Number(e.target.value))}
                onPointerUp={() => controlGasManual(localSliderVal)}
                onTouchEnd={() => controlGasManual(localSliderVal)}
                onKeyUp={() => controlGasManual(localSliderVal)}
                className="neu-range"
                aria-label="Atur Nilai Gas Manual"
              />
            </div>

            {/* Preset Buttons */}
            <div className="space-y-2">
              <p className="text-xs font-bold text-[#4e5d71]">Preset Cepat:</p>
              <div className="grid grid-cols-3 gap-2.5">
                <button
                  type="button"
                  onClick={() => controlGasManual('BERSIH')}
                  className={`neu-btn py-3 px-2 rounded-xl text-xs font-bold min-h-[44px] ${
                    isManual && gas.gasValue === 650 ? 'neu-btn-active text-[#059669]' : 'text-[#19212d]'
                  }`}
                >
                  Bersih
                </button>
                <button
                  type="button"
                  onClick={() => controlGasManual('SEDANG')}
                  className={`neu-btn py-3 px-2 rounded-xl text-xs font-bold min-h-[44px] ${
                    isManual && gas.gasValue === 1250 ? 'neu-btn-active text-[#d97706]' : 'text-[#19212d]'
                  }`}
                >
                  Sedang
                </button>
                <button
                  type="button"
                  onClick={() => controlGasManual('BAHAYA')}
                  className={`neu-btn py-3 px-2 rounded-xl text-xs font-bold min-h-[44px] ${
                    isManual && gas.gasValue === 2100 ? 'neu-btn-active text-[#e11d48]' : 'text-[#19212d]'
                  }`}
                >
                  Tinggi
                </button>
              </div>
            </div>
          </div>

          {/* Test Buzzer */}
          <div className="pt-4 border-t border-[#d3dde9]">
            <button
              type="button"
              onClick={testBuzzerAlarm}
              className="neu-btn w-full py-3 px-4 rounded-xl text-xs font-bold text-[#e11d48] flex items-center justify-center gap-2 min-h-[44px]"
            >
              <AlertTriangle className="w-4 h-4 text-[#e11d48]" />
              <span>Uji Alarm Buzzer</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
