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
  Cpu,
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
    isCameraConnected,
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
        return 'Ringkasan Miniatur IoT & Smart City';
      case 'traffic':
        return 'Monitoring Lalu Lintas Kamera AI (YOLO11)';
      case 'lighting':
        return 'Smart PJU Otomatis (Sensor Cahaya LDR)';
      case 'pedestrian':
        return 'Smart Penyeberangan (Dual Ultrasonik & Lampu)';
      case 'air-quality':
        return 'Monitoring Polusi Udara (Sensor Gas MQ ADC 39)';
      case 'iot-devices':
        return 'Hardware & Pinout Miniatur ESP32';
      case 'automation':
        return 'Logika & Aturan Otomasi Miniatur';
      case 'alerts':
        return 'Notifikasi & Log Peristiwa';
      default:
        return 'UrbanPulse Dashboard';
    }
  };

  const unreadAlerts = alerts.filter((a) => !a.isRead && !a.isResolved);

  return (
    <header className="h-16 bg-[#080E1B]/95 backdrop-blur-md border-b border-slate-800/80 px-4 lg:px-6 flex items-center justify-between sticky top-0 z-30">
      {/* Left: Mobile Toggle & Page Title */}
      <div className="flex items-center gap-3">
        <button
          onClick={onOpenMobileMenu}
          className="lg:hidden p-2 rounded-lg bg-slate-800 text-slate-300 hover:text-white"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div>
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${isHardwareConnected ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500'}`} />
            <h2 className="text-sm lg:text-base font-bold text-white tracking-tight">
              {getSubsystemTitle(activeSubsystem)}
            </h2>
            {isHardwareConnected ? (
              <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                ESP32 ONLINE
              </span>
            ) : (
              <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-rose-500/10 text-rose-400 border border-rose-500/30">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                ESP32 OFFLINE
              </span>
            )}
          </div>
          <p className="hidden md:block text-[11px] text-slate-400">
            {isHardwareConnected
              ? 'ESP32 Miniatur terhubung secara aktif (Thonny serial/WiFi)'
              : 'Menunggu koneksi ESP32 fisik. Colokkan board & jalankan program di Thonny.'}
          </p>
        </div>
      </div>

      {/* Right: Controls, Live Clock, Notifications, Audio Toggle */}
      <div className="flex items-center gap-2.5 lg:gap-4">
        {/* Toggle Live Sync Mode */}
        <button
          onClick={toggleLiveIoTMode}
          title={isLiveIoTMode ? 'Mode Live IoT aktif (Polling /api/iot/telemetry)' : 'Mode Live dinonaktifkan'}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
            isLiveIoTMode
              ? 'bg-cyan-500/15 text-cyan-300 border-cyan-500/40 hover:bg-cyan-500/25'
              : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
          }`}
        >
          <Radio className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">{isLiveIoTMode ? 'Live Sync ON' : 'Live Sync OFF'}</span>
        </button>

        {/* Live Simulation Play/Pause */}
        <button
          onClick={() => setIsSimulating(!isSimulating)}
          title={isSimulating ? 'Jeda timer simulasi' : 'Lanjutkan timer simulasi'}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
            isSimulating
              ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/25'
              : 'bg-amber-500/15 text-amber-400 border-amber-500/30 hover:bg-amber-500/25'
          }`}
        >
          {isSimulating ? <Play className="w-3.5 h-3.5 fill-current" /> : <Pause className="w-3.5 h-3.5 fill-current" />}
          <span className="hidden md:inline">{isSimulating ? 'Timer Aktif' : 'Paused'}</span>
        </button>

        {/* Audio Mute Toggle */}
        <button
          onClick={toggleAudioMute}
          title={isAudioMuted ? 'Bunyikan audio' : 'Bisukan audio'}
          className="p-2 rounded-lg bg-slate-900/80 border border-slate-800 text-slate-400 hover:text-white hover:border-slate-700 transition-colors"
        >
          {isAudioMuted ? <VolumeX className="w-4 h-4 text-slate-500" /> : <Volume2 className="w-4 h-4 text-cyan-400" />}
        </button>

        {/* Live Clock */}
        <div className="hidden xl:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900/90 border border-slate-800 text-right">
          <Clock className="w-4 h-4 text-cyan-400" />
          <div>
            <div className="text-xs font-mono font-bold text-white tracking-wider">{currentTime || '12:00:00'}</div>
            <div className="text-[10px] text-slate-400">{currentDate}</div>
          </div>
        </div>

        {/* Notifications Bell with Popover */}
        <div className="relative">
          <button
            onClick={() => setIsAlertMenuOpen(!isAlertMenuOpen)}
            className="relative p-2 rounded-lg bg-slate-900/80 border border-slate-800 text-slate-300 hover:text-white hover:border-slate-700 transition-colors"
          >
            <Bell className="w-4 h-4" />
            {unreadAlerts.length > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-500 text-[10px] font-bold text-white flex items-center justify-center animate-pulse">
                {unreadAlerts.length}
              </span>
            )}
          </button>

          {isAlertMenuOpen && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-xl bg-[#0D1527] border border-cyan-500/30 shadow-2xl z-50 p-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-white uppercase tracking-wider">Notifikasi Miniatur</span>
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                    {unreadAlerts.length} Baru
                  </span>
                </div>
                <button
                  onClick={() => {
                    setIsAlertMenuOpen(false);
                    setActiveSubsystem('alerts');
                  }}
                  className="text-[11px] text-cyan-400 hover:underline font-semibold"
                >
                  Buka Halaman Alert
                </button>
              </div>

              <div className="mt-3 space-y-2.5 max-h-72 overflow-y-auto pr-1">
                {alerts.length === 0 ? (
                  <div className="text-center py-6 text-slate-400 text-xs flex flex-col items-center gap-2">
                    <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                    <span>Semua sensor miniatur dalam kondisi aman.</span>
                  </div>
                ) : (
                  alerts.slice(0, 4).map((alert) => (
                    <div
                      key={alert.id}
                      onClick={() => markAlertAsRead(alert.id)}
                      className={`p-2.5 rounded-lg border text-xs transition-colors cursor-pointer ${
                        alert.severity === 'CRITICAL'
                          ? 'bg-rose-500/10 border-rose-500/30 hover:bg-rose-500/20'
                          : alert.severity === 'WARNING'
                          ? 'bg-amber-500/10 border-amber-500/30 hover:bg-amber-500/20'
                          : 'bg-slate-800/50 border-slate-700/50 hover:bg-slate-800'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-1.5 font-bold text-slate-200">
                          <AlertTriangle
                            className={`w-3.5 h-3.5 ${
                              alert.severity === 'CRITICAL' ? 'text-rose-400' : 'text-amber-400'
                            }`}
                          />
                          <span>{alert.title}</span>
                        </div>
                        <span className="text-[10px] text-slate-400 font-mono">{alert.timestamp}</span>
                      </div>
                      <p className="text-[11px] text-slate-300 line-clamp-2">{alert.description}</p>
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
