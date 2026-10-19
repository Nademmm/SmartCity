'use client';

import React from 'react';
import { useSmartCity } from '@/context/SmartCityContext';
import { MetricCard } from '@/components/common/MetricCard';
import {
  Navigation,
  Wind,
  Lightbulb,
  Footprints,
  Cpu,
  Video,
  Sun,
  Moon,
  ArrowRight,
  Terminal,
} from 'lucide-react';

export const OverviewView: React.FC = () => {
  const {
    traffic,
    pju,
    crossing,
    gas,
    isHardwareConnected,
    isCameraConnected,
    setActiveSubsystem,
    togglePjuDayNight,
    triggerCrossingDetection,
  } = useSmartCity();

  const isGelap = pju.kondisi === 'GELAP';
  const isMenyebrang = crossing.lampu === 'MERAH';
  const isPolusiTinggi = gas.gasValue >= 1500;

  return (
    <div className="space-y-6">
      {/* Board Hardware Status Strip */}
      <div className="neu-raised rounded-3xl p-5 border border-white/80">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className={`w-3 h-3 rounded-full shrink-0 ${isHardwareConnected ? 'bg-[#059669] shadow-[0_0_10px_#10b981]' : 'bg-[#8e9eaf]'}`} />
            <div>
              <h2 className="text-sm font-bold text-[#19212d]">
                {isHardwareConnected ? 'ESP32 Miniatur Terhubung' : 'ESP32 Miniatur Siaga'}
              </h2>
              <p className="text-xs text-[#6e7e93]">
                {isHardwareConnected
                  ? 'Telemetri ADC dialirkan secara langsung dari mikrokontroler.'
                  : 'Hubungkan kabel data USB dan aktifkan serial bridge untuk sinkronisasi.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 text-xs">
            <div className="neu-inset px-3.5 py-2 rounded-xl flex items-center gap-2">
              <span className="text-[#6e7e93]">Kamera:</span>
              <span className={`font-bold ${isCameraConnected ? 'text-[#059669]' : 'text-[#8e9eaf]'}`}>
                {isCameraConnected ? 'Aktif' : 'Siaga'}
              </span>
            </div>
            <div className="neu-inset px-3.5 py-2 rounded-xl flex items-center gap-2">
              <span className="text-[#6e7e93]">Port:</span>
              <span className="font-mono font-bold text-[#0284c7]">COM3</span>
            </div>
          </div>
        </div>
      </div>

      {/* 4 Core Telemetry Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Gas MQ */}
        <MetricCard
          title="Kualitas Udara"
          value={gas.gasValue}
          unit="ADC"
          colorScheme={isPolusiTinggi ? 'rose' : gas.gasValue >= 1000 ? 'amber' : 'emerald'}
          icon={<Wind className="w-5 h-5" />}
          subtitle={`Status: ${gas.statusPolusi}`}
          onClick={() => setActiveSubsystem('air-quality')}
        />

        {/* 2. Smart PJU */}
        <MetricCard
          title="Penerangan Jalan"
          value={pju.pjuStatus}
          colorScheme={isGelap ? 'amber' : 'cyan'}
          icon={<Lightbulb className="w-5 h-5" />}
          subtitle={`Sensor Cahaya: ${pju.ldrValue} ADC`}
          onClick={() => setActiveSubsystem('lighting')}
        />

        {/* 3. Penyeberangan Jalan */}
        <MetricCard
          title="Penyeberangan"
          value={crossing.lampu}
          unit={isMenyebrang ? `${crossing.countdownSeconds}s` : undefined}
          colorScheme={isMenyebrang ? 'rose' : 'emerald'}
          icon={<Footprints className="w-5 h-5" />}
          subtitle={`Kanan: ${crossing.jarakKanan ? Math.round(crossing.jarakKanan) + ' cm' : '-'}`}
          onClick={() => setActiveSubsystem('pedestrian')}
        />

        {/* 4. Kamera Simpang */}
        <MetricCard
          title="Lalu Lintas"
          value={traffic.vehicleCount}
          unit="Objek"
          colorScheme="cyan"
          icon={<Navigation className="w-5 h-5" />}
          subtitle={`Kepadatan: ${traffic.density}%`}
          onClick={() => setActiveSubsystem('traffic')}
        />
      </div>

      {/* Subsystem Monitoring Grid & Live Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: 4 Interactive Subsystem Cards */}
        <div className="lg:col-span-7 neu-raised rounded-3xl p-6 border border-white/80 flex flex-col justify-between">
          <div>
            <div className="pb-3 border-b border-[#d3dde9] mb-4">
              <h3 className="text-xs font-bold text-[#4e5d71] uppercase tracking-wider">
                Status Pemantauan Kota
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Traffic Subsystem Card */}
              <div
                onClick={() => setActiveSubsystem('traffic')}
                className="neu-btn p-5 rounded-2xl cursor-pointer hover:border-[#bae6fd] transition-all flex flex-col justify-between min-h-[110px]"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#19212d]">Kamera Simpang</span>
                  <div className="w-8 h-8 rounded-xl neu-inset flex items-center justify-center text-[#0284c7]">
                    <Video className="w-4 h-4" />
                  </div>
                </div>
                <div className="mt-3">
                  <p className="text-xl font-mono font-extrabold text-[#0284c7]">
                    {traffic.vehicleCount} Objek
                  </p>
                  <p className="text-xs text-[#6e7e93] mt-0.5">Kepadatan {traffic.density}%</p>
                </div>
              </div>

              {/* Gas Subsystem Card */}
              <div
                onClick={() => setActiveSubsystem('air-quality')}
                className="neu-btn p-5 rounded-2xl cursor-pointer hover:border-[#a7f3d0] transition-all flex flex-col justify-between min-h-[110px]"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#19212d]">Kualitas Udara</span>
                  <div className={`w-8 h-8 rounded-xl neu-inset flex items-center justify-center ${isPolusiTinggi ? 'text-[#e11d48]' : 'text-[#059669]'}`}>
                    <Wind className="w-4 h-4" />
                  </div>
                </div>
                <div className="mt-3">
                  <p className={`text-xl font-mono font-extrabold ${isPolusiTinggi ? 'text-[#e11d48]' : 'text-[#059669]'}`}>
                    {gas.gasValue} ADC
                  </p>
                  <p className="text-xs text-[#6e7e93] mt-0.5">{gas.statusPolusi}</p>
                </div>
              </div>

              {/* Crossing Subsystem Card */}
              <div
                onClick={() => setActiveSubsystem('pedestrian')}
                className="neu-btn p-5 rounded-2xl cursor-pointer hover:border-[#fecdd3] transition-all flex flex-col justify-between min-h-[110px]"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#19212d]">Zebra Cross</span>
                  <div className={`w-8 h-8 rounded-xl neu-inset flex items-center justify-center ${isMenyebrang ? 'text-[#e11d48]' : 'text-[#059669]'}`}>
                    <Footprints className="w-4 h-4" />
                  </div>
                </div>
                <div className="mt-3">
                  <p className={`text-xl font-mono font-extrabold ${isMenyebrang ? 'text-[#e11d48]' : 'text-[#059669]'}`}>
                    {crossing.lampu}
                  </p>
                  <p className="text-xs text-[#6e7e93] mt-0.5">
                    {isMenyebrang ? `Sisa ${crossing.countdownSeconds}s` : 'Kendaraan Jalan'}
                  </p>
                </div>
              </div>

              {/* Lighting Subsystem Card */}
              <div
                onClick={() => setActiveSubsystem('lighting')}
                className="neu-btn p-5 rounded-2xl cursor-pointer hover:border-[#fde68a] transition-all flex flex-col justify-between min-h-[110px]"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#19212d]">Lampu Jalan</span>
                  <div className={`w-8 h-8 rounded-xl neu-inset flex items-center justify-center ${isGelap ? 'text-[#d97706]' : 'text-[#0284c7]'}`}>
                    <Lightbulb className="w-4 h-4" />
                  </div>
                </div>
                <div className="mt-3">
                  <p className={`text-xl font-mono font-extrabold ${isGelap ? 'text-[#d97706]' : 'text-[#0284c7]'}`}>
                    {pju.pjuStatus}
                  </p>
                  <p className="text-xs text-[#6e7e93] mt-0.5">{pju.kondisi}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="pt-5 border-t border-[#d3dde9] mt-6 flex flex-wrap items-center justify-between gap-3 text-xs">
            <span className="text-[#4e5d71] font-bold">Uji Coba Cepat:</span>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={togglePjuDayNight}
                className="neu-btn px-4 py-2.5 rounded-xl font-bold text-[#19212d] flex items-center gap-2 min-h-[44px]"
              >
                {isGelap ? <Sun className="w-4 h-4 text-[#d97706]" /> : <Moon className="w-4 h-4 text-[#4f46e5]" />}
                <span>Ubah PJU ({isGelap ? 'Siang' : 'Malam'})</span>
              </button>

              <button
                type="button"
                onClick={() => triggerCrossingDetection('kanan')}
                className="neu-btn px-4 py-2.5 rounded-xl font-bold text-[#19212d] flex items-center gap-2 min-h-[44px]"
              >
                <Footprints className="w-4 h-4 text-[#059669]" />
                <span>Simulasi Penyeberangan</span>
              </button>
            </div>
          </div>
        </div>

        {/* Right: Telemetry Overview & Quick Link */}
        <div className="lg:col-span-5 neu-raised rounded-3xl p-6 border border-white/80 flex flex-col justify-between">
          <div>
            <div className="pb-3 border-b border-[#d3dde9] mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Cpu className="w-4 h-4 text-[#4f46e5]" />
                <h3 className="text-xs font-bold text-[#4e5d71] uppercase tracking-wider">
                  Status Telemetri
                </h3>
              </div>
              <span className="font-mono text-xs text-[#059669] font-bold">LIVE</span>
            </div>

            <div className="space-y-3.5">
              <div className="neu-inset p-4 rounded-2xl flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-[#19212d]">Sensor Gas MQ</p>
                  <p className="text-[11px] text-[#6e7e93] font-mono mt-0.5">ADC 39</p>
                </div>
                <span className="text-sm font-mono font-bold text-[#059669]">
                  {gas.gasValue} ADC
                </span>
              </div>

              <div className="neu-inset p-4 rounded-2xl flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-[#19212d]">Sensor Cahaya LDR</p>
                  <p className="text-[11px] text-[#6e7e93] font-mono mt-0.5">ADC 36</p>
                </div>
                <span className="text-sm font-mono font-bold text-[#d97706]">
                  {pju.ldrValue} ADC
                </span>
              </div>

              <div className="neu-inset p-4 rounded-2xl flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-[#19212d]">Sinyal Penyeberangan</p>
                  <p className="text-[11px] text-[#6e7e93] font-mono mt-0.5">Dual Ultrasonik</p>
                </div>
                <span className="text-sm font-mono font-bold text-[#e11d48]">
                  {crossing.lampu}
                </span>
              </div>
            </div>
          </div>

          <div className="pt-5 border-t border-[#d3dde9] mt-6 flex items-center justify-between">
            <span className="text-xs text-[#6e7e93] font-medium">Log aktivitas terpusat</span>
            <button
              type="button"
              onClick={() => setActiveSubsystem('alerts')}
              className="neu-btn px-4 py-2.5 rounded-xl text-xs font-bold text-[#4f46e5] flex items-center gap-2 min-h-[44px]"
            >
              <Terminal className="w-4 h-4" />
              <span>Buka Terminal Serial</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
