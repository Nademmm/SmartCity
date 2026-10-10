'use client';

import React, { useState, useEffect } from 'react';
import { useSmartCity } from '@/context/SmartCityContext';
import { SubsystemType } from '@/types/iot';
import {
  Menu,
  Clock,
  Radio,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Bell,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';

interface TopbarProps {
  onOpenMobileMenu: () => void;
}

export const Topbar: React.FC<TopbarProps> = ({ onOpenMobileMenu }) => {
  const {
    activeSubsystem,
    setActiveSubsystem,
    isSimulating,
    setIsSimulating,
    isAudioMuted,
    toggleAudioMute,
    isLiveIoTMode,
    toggleLiveIoTMode,
    alerts,
    markAlertAsRead,
    isHardwareConnected,
  } = useSmartCity();

  const [currentTime, setCurrentTime] = useState<string>('');
  const [currentDate, setCurrentDate] = useState<string>('');
  const [isAlertMenuOpen, setIsAlertMenuOpen] = useState<boolean>(false);

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
        return 'Ringkasan Miniatur';
      case 'traffic':
        return 'Monitoring Lalu Lintas (Kamera AI)';
      case 'lighting':
        return 'Pencahayaan Jalan Pintar (Sensor LDR)';
      case 'pedestrian':
        return 'Penyeberangan Pintar (Dual Ultrasonik)';
      case 'air-quality':
        return 'Kualitas Udara & Polusi (Sensor MQ)';
      case 'iot-devices':
        return 'Hardware & Pemetaan Pin ESP32';
      case 'automation':
        return 'Logika Aturan Otomasi';
      case 'alerts':
        return 'Notifikasi & Riwayat Peristiwa';
      default:
        return 'Dashboard Smart City';
    }
  };

  const unreadAlerts = alerts.filter((a) => !a.isRead && !a.isResolved);

  return (
    <header className="h-16 bg-[#0B0F19] border-b border-slate-800/80 px-4 lg:px-6 flex items-center justify-between sticky top-0 z-30">
      {/* Left: Mobile Toggle & Page Title */}
      <div className="flex items-center gap-3">
        <button
          onClick={onOpenMobileMenu}
          className="lg:hidden p-2 rounded-lg bg-slate-800/80 text-slate-300 hover:text-white"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3">
          <h2 className="text-sm lg:text-base font-semibold text-white tracking-tight">
            {getSubsystemTitle(activeSubsystem)}
          </h2>

          <div
            className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border ${
              isHardwareConnected
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25'
                : 'bg-slate-800/60 text-slate-400 border-slate-700/60'
            }`}
          >
            <div className={`w-1.5 h-1.5 rounded-full ${isHardwareConnected ? 'bg-emerald-400' : 'bg-slate-500'}`} />
            <p>{isHardwareConnected ? 'ESP32 Terhubung' : 'ESP32 Standby'}</p>
          </div>
        </div>
      </div>

      {/* Right: Controls, Live Clock, Notifications, Audio Toggle */}
      <div className="flex items-center gap-2 lg:gap-3">
        {/* Toggle Live Sync Mode */}
        <button
          onClick={toggleLiveIoTMode}
          title={isLiveIoTMode ? 'Mode Live IoT aktif' : 'Mode Live dinonaktifkan'}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
            isLiveIoTMode
              ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30 hover:bg-cyan-500/20'
              : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
          }`}
        >
          <Radio className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">{isLiveIoTMode ? 'Live Sync' : 'Sync Off'}</span>
        </button>

        {/* Live Simulation Play/Pause */}
        <button
          onClick={() => setIsSimulating(!isSimulating)}
          title={isSimulating ? 'Jeda simulasi' : 'Lanjutkan simulasi'}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
            isSimulating
              ? 'bg-slate-800/80 text-slate-200 border-slate-700 hover:bg-slate-800'
              : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
          }`}
        >
          {isSimulating ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 fill-current" />}
          <span className="hidden md:inline">{isSimulating ? 'Jeda' : 'Lanjut'}</span>
        </button>

        {/* Audio Mute Toggle */}
        <button
          onClick={toggleAudioMute}
          title={isAudioMuted ? 'Nyalakan audio' : 'Bisukan audio'}
          className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition-colors"
        >
          {isAudioMuted ? <VolumeX className="w-4 h-4 text-slate-500" /> : <Volume2 className="w-4 h-4 text-slate-300" />}
        </button>

        {/* Live Clock */}
        <div className="hidden xl:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-right">
          <Clock className="w-3.5 h-3.5 text-slate-400" />
          <div>
            <p className="text-xs font-mono font-medium text-white">{currentTime || '00:00:00'}</p>
            <p className="text-[10px] text-slate-400">{currentDate}</p>
          </div>
        </div>

        {/* Notifications Bell */}
        <div className="relative">
          <button
            onClick={() => setIsAlertMenuOpen(!isAlertMenuOpen)}
            className="relative p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition-colors"
          >
            <Bell className="w-4 h-4" />
            {unreadAlerts.length > 0 && (
              <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-500 text-[10px] font-bold text-white flex items-center justify-center">
                {unreadAlerts.length}
              </div>
            )}
          </button>

          {isAlertMenuOpen && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-xl bg-[#0F1422] border border-slate-800 shadow-xl z-50 p-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <p className="text-xs font-semibold text-white">Notifikasi Sistem</p>
                  {unreadAlerts.length > 0 && (
                    <div className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-rose-500/10 text-rose-400 border border-rose-500/20">
                      {unreadAlerts.length} Baru
                    </div>
                  )}
                </div>
                <button
                  onClick={() => {
                    setIsAlertMenuOpen(false);
                    setActiveSubsystem('alerts');
                  }}
                  className="text-[11px] text-cyan-400 hover:underline font-medium"
                >
                  Lihat Semua
                </button>
              </div>

              <div className="mt-3 space-y-2 max-h-72 overflow-y-auto pr-1">
                {alerts.length === 0 ? (
                  <div className="text-center py-6 text-slate-400 text-xs flex flex-col items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                    <p>Semua sensor dalam batas normal.</p>
                  </div>
                ) : (
                  alerts.slice(0, 4).map((alert) => (
                    <div
                      key={alert.id}
                      onClick={() => markAlertAsRead(alert.id)}
                      className="p-2.5 rounded-lg border border-slate-800 bg-slate-900/60 hover:bg-slate-900 text-xs transition-colors cursor-pointer"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-1.5 font-medium text-slate-200">
                          <AlertTriangle
                            className={`w-3.5 h-3.5 ${
                              alert.severity === 'CRITICAL' ? 'text-rose-400' : 'text-amber-400'
                            }`}
                          />
                          <p>{alert.title}</p>
                        </div>
                        <p className="text-[10px] text-slate-400 font-mono">{alert.timestamp}</p>
                      </div>
                      <p className="text-[11px] text-slate-400 line-clamp-2">{alert.description}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
