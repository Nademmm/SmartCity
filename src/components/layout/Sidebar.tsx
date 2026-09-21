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
  BarChart3,
  Bell,
  Settings,
  Activity,
  Radio,
  User,
  X,
} from 'lucide-react';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const { activeSubsystem, setActiveSubsystem, alerts } = useSmartCity();

  const unreadAlertsCount = alerts.filter((a) => !a.isRead && !a.isResolved).length;

  const menuItems: { id: SubsystemType; label: string; icon: React.ReactNode; badge?: number }[] = [
    { id: 'overview', label: 'Overview', icon: <LayoutDashboard className="w-4 h-4" /> },
    { id: 'traffic', label: 'Traffic ATSC', icon: <Navigation className="w-4 h-4" /> },
    { id: 'lighting', label: 'Smart Lighting', icon: <Lightbulb className="w-4 h-4" /> },
    { id: 'pedestrian', label: 'Pedestrian', icon: <Footprints className="w-4 h-4" /> },
    { id: 'air-quality', label: 'Air Quality', icon: <Wind className="w-4 h-4" /> },
    { id: 'iot-devices', label: 'IoT Devices', icon: <Cpu className="w-4 h-4" /> },
    { id: 'automation', label: 'Automation', icon: <Zap className="w-4 h-4" /> },
    { id: 'analytics', label: 'Analytics', icon: <BarChart3 className="w-4 h-4" /> },
    { id: 'alerts', label: 'Alerts', icon: <Bell className="w-4 h-4" />, badge: unreadAlertsCount },
    { id: 'settings', label: 'Settings', icon: <Settings className="w-4 h-4" /> },
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
          className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm lg:hidden transition-opacity"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed lg:static top-0 bottom-0 left-0 z-50 w-64 bg-[#080E1B] border-r border-slate-800/80 flex flex-col justify-between transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Brand Header */}
        <div>
          <div className="p-5 border-b border-slate-800/80 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-600 to-blue-500 shadow-lg shadow-cyan-500/20">
                <Activity className="w-5 h-5 text-white" />
                <span className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-400 rounded-full border-2 border-[#080E1B] animate-ping" />
                <span className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-400 rounded-full border-2 border-[#080E1B]" />
              </div>
              <div>
                <h1 className="text-base font-extrabold tracking-tight text-white flex items-center gap-1.5">
                  Urban<span className="text-cyan-400">Pulse</span>
                </h1>
                <p className="text-[10px] uppercase font-mono tracking-wider text-slate-400">Smart City Core</p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation Menu */}
          <nav className="p-3 space-y-1">
            <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Command Modules
            </div>
            {menuItems.map((item) => {
              const isActive = activeSubsystem === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleNavClick(item.id)}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all duration-150 ${
                    isActive
                      ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 shadow-md shadow-cyan-500/5'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className={isActive ? 'text-cyan-400' : 'text-slate-400'}>{item.icon}</span>
                    <span>{item.label}</span>
                  </div>

                  {item.badge !== undefined && item.badge > 0 && (
                    <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-500 text-white animate-pulse">
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Bottom System Telemetry Pod */}
        <div className="p-4 border-t border-slate-800/80 bg-[#060B16]">
          <div className="space-y-2 mb-3">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-slate-400 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                System Status:
              </span>
              <span className="font-semibold text-emerald-400">Online (Optimal)</span>
            </div>

            <div className="flex items-center justify-between text-[11px]">
              <span className="text-slate-400 flex items-center gap-1.5">
                <Radio className="w-3 h-3 text-cyan-400" />
                MQTT Broker:
              </span>
              <span className="font-semibold text-cyan-400 font-mono">Connected :8883</span>
            </div>

            <div className="flex items-center justify-between text-[11px]">
              <span className="text-slate-400">Last Sync:</span>
              <span className="font-mono text-slate-300">Live (3s tick)</span>
            </div>
          </div>

          {/* User Profile */}
          <div className="pt-3 border-t border-slate-800 flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-slate-800 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <User className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-semibold text-white truncate">SMK IoT Commander</div>
              <div className="text-[10px] text-slate-400 truncate">Administrator Level 1</div>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};
