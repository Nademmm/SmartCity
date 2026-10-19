'use client';

import React, { useState, useEffect } from 'react';
import { useSmartCity } from '@/context/SmartCityContext';
import { SubsystemType } from '@/types/iot';
import {
  Menu,
  Clock,
  Radio,
  Volume2,
  VolumeX,
} from 'lucide-react';

interface TopbarProps {
  onOpenMobileMenu: () => void;
}

export const Topbar: React.FC<TopbarProps> = ({ onOpenMobileMenu }) => {
  const {
    activeSubsystem,
    isAudioMuted,
    toggleAudioMute,
    isLiveIoTMode,
    toggleLiveIoTMode,
    isHardwareConnected,
  } = useSmartCity();

  const [currentTime, setCurrentTime] = useState<string>('');
  const [currentDate, setCurrentDate] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })
      );
      setCurrentDate(
        now.toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const getSubsystemTitle = (id: SubsystemType): string => {
    switch (id) {
      case 'overview':
        return 'Ringkasan Sistem';
      case 'traffic':
        return 'Lalu Lintas (Kamera)';
      case 'lighting':
        return 'Penerangan Jalan (LDR)';
      case 'pedestrian':
        return 'Penyeberangan (Zebra Cross)';
      case 'air-quality':
        return 'Kualitas Udara (Sensor Gas)';
      case 'alerts':
        return 'Riwayat Log & Terminal';
      default:
        return 'Pusat Kendali Miniatur';
    }
  };

  return (
    <header className="h-16 bg-[#e6ecf5] border-b border-[#d3dde9] px-4 lg:px-6 flex items-center justify-between sticky top-0 z-30">
      {/* Left: Mobile Toggle & Page Title */}
      <div className="flex items-center gap-3">
        <button
          onClick={onOpenMobileMenu}
          className="lg:hidden p-2 rounded-xl neu-btn text-[#19212d] min-w-[44px] min-h-[44px] flex items-center justify-center cursor-pointer"
          aria-label="Buka menu navigasi"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3">
          <h2 className="text-sm sm:text-base font-extrabold text-[#19212d] tracking-tight">
            {getSubsystemTitle(activeSubsystem)}
          </h2>

          <div
            className={`hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold ${
              isHardwareConnected
                ? 'neu-inset text-[#059669]'
                : 'neu-raised-sm text-[#6e7e93]'
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${isHardwareConnected ? 'bg-[#059669] shadow-[0_0_8px_#10b981]' : 'bg-[#8e9eaf]'}`} />
            <span>{isHardwareConnected ? 'ESP32 Online' : 'ESP32 Siaga'}</span>
          </div>
        </div>
      </div>

      {/* Right: Live Sync, Audio Mute, Live Clock */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Toggle Live Sync Mode */}
        <button
          onClick={toggleLiveIoTMode}
          title={isLiveIoTMode ? 'Sinkronisasi telemetri aktif' : 'Sinkronisasi dijeda'}
          className={`neu-btn px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all min-h-[44px] cursor-pointer ${
            isLiveIoTMode
              ? 'text-[#059669]'
              : 'text-[#6e7e93]'
          }`}
        >
          <Radio className={`w-4 h-4 ${isLiveIoTMode ? 'text-[#059669] animate-pulse' : 'text-[#8e9eaf]'}`} />
          <span className="hidden md:inline font-mono">{isLiveIoTMode ? 'Sync Aktif' : 'Sync Jeda'}</span>
        </button>

        {/* Audio Mute Toggle */}
        <button
          onClick={toggleAudioMute}
          title={isAudioMuted ? 'Nyalakan Audio Alarm' : 'Bisukan Audio Alarm'}
          className={`neu-btn p-2.5 rounded-xl min-w-[44px] min-h-[44px] flex items-center justify-center transition-all cursor-pointer ${
            isAudioMuted
              ? 'text-[#8e9eaf]'
              : 'text-[#0284c7]'
          }`}
          aria-label={isAudioMuted ? 'Nyalakan Audio' : 'Bisukan Audio'}
        >
          {isAudioMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
        </button>

        {/* Live Clock Display */}
        <div className="hidden sm:flex items-center gap-2 px-3.5 py-2 rounded-xl neu-inset font-mono text-xs text-[#19212d] border border-white/60">
          <Clock className="w-3.5 h-3.5 text-[#0284c7]" />
          <span className="font-bold">{currentTime || '00:00:00'}</span>
          <span className="text-[#6e7e93] text-[10px] hidden md:inline">WIB</span>
        </div>
      </div>
    </header>
  );
};
