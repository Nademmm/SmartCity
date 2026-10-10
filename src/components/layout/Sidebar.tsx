'use client';

import React from 'react';
import { useSmartCity } from '@/context/SmartCityContext';
import { SubsystemType } from '@/types/iot';
import {
  LayoutDashboard,
  Navigation,
  Lightbulb,
  Footprints,
  Wind,
  Cpu,
  Zap,
  Bell,
  Activity,
  X,
} from 'lucide-react';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const { activeSubsystem, setActiveSubsystem, alerts, isHardwareConnected } = useSmartCity();

  const unreadAlertsCount = alerts.filter((a) => !a.isRead && !a.isResolved).length;

  const menuItems: { id: SubsystemType; label: string; icon: React.ReactNode; badge?: number }[] = [
    { id: 'overview', label: 'Ringkasan Sistem', icon: <LayoutDashboard className="w-4 h-4" /> },
    { id: 'traffic', label: 'Lalu Lintas (Kamera AI)', icon: <Navigation className="w-4 h-4" /> },
    { id: 'lighting', label: 'Pencahayaan Jalan (LDR)', icon: <Lightbulb className="w-4 h-4" /> },
    { id: 'pedestrian', label: 'Penyeberangan Jalan', icon: <Footprints className="w-4 h-4" /> },
    { id: 'air-quality', label: 'Kualitas Udara (Gas MQ)', icon: <Wind className="w-4 h-4" /> },
    { id: 'iot-devices', label: 'Hardware & Pinout', icon: <Cpu className="w-4 h-4" /> },
    { id: 'automation', label: 'Logika Otomasi', icon: <Zap className="w-4 h-4" /> },
    { id: 'alerts', label: 'Notifikasi & Log', icon: <Bell className="w-4 h-4" />, badge: unreadAlertsCount },
  ];

  const handleNavClick = (id: SubsystemType) => {
    setActiveSubsystem(id);
    onClose();
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden transition-opacity"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed lg:static top-0 bottom-0 left-0 z-50 w-64 bg-[#0B0F19] border-r border-slate-800/80 flex flex-col justify-between transition-transform duration-200 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div>
          {/* Header */}
          <div className="h-16 px-5 border-b border-slate-800/80 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700/80 flex items-center justify-center text-cyan-400">
                <Activity className="w-4 h-4" />
              </div>
              <div>
                <h1 className="text-sm font-semibold tracking-tight text-white">Smart City</h1>
                <p className="text-[11px] text-slate-400 font-mono">Control Center</p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="lg:hidden p-1.5 rounded-md text-slate-400 hover:text-white hover:bg-slate-800"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Navigation Menu */}
          <nav className="p-3 space-y-1">
            <p className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              Modul IoT Miniatur
            </p>
            {menuItems.map((item) => {
              const isActive = activeSubsystem === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleNavClick(item.id)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                    isActive
                      ? 'bg-slate-800/90 text-white border border-slate-700/80'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40 border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <div className={isActive ? 'text-cyan-400' : 'text-slate-400'}>{item.icon}</div>
                    <p>{item.label}</p>
                  </div>

                  {item.badge !== undefined && item.badge > 0 && (
                    <div className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                      {item.badge}
                    </div>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* System Telemetry Status */}
        <div className="p-4 border-t border-slate-800/80 bg-[#090D16]">
          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-slate-400">
                <div className={`w-2 h-2 rounded-full ${isHardwareConnected ? 'bg-emerald-400' : 'bg-slate-500'}`} />
                <p>ESP32 Board</p>
              </div>
              <p className={`font-medium ${isHardwareConnected ? 'text-emerald-400' : 'text-slate-400'}`}>
                {isHardwareConnected ? 'Terhubung' : 'Standby'}
              </p>
            </div>

            <div className="flex items-center justify-between">
              <p className="text-slate-400">Firmware</p>
              <p className="font-mono text-slate-300 text-[11px]">MicroPython</p>
            </div>

            <div className="flex items-center justify-between">
              <p className="text-slate-400">Protokol</p>
              <p className="font-mono text-slate-300 text-[11px]">Serial / HTTP</p>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};
