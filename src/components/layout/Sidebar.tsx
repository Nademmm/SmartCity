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
  Terminal,
  X,
} from 'lucide-react';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const { activeSubsystem, setActiveSubsystem, isHardwareConnected } = useSmartCity();

  const menuItems: { id: SubsystemType; label: string; icon: React.ReactNode; color: string }[] = [
    { id: 'overview', label: 'Ringkasan Sistem', icon: <LayoutDashboard className="w-4 h-4" />, color: 'text-[#0284c7]' },
    { id: 'traffic', label: 'Lalu Lintas (Kamera)', icon: <Navigation className="w-4 h-4" />, color: 'text-[#0284c7]' },
    { id: 'lighting', label: 'Penerangan Jalan (LDR)', icon: <Lightbulb className="w-4 h-4" />, color: 'text-[#d97706]' },
    { id: 'pedestrian', label: 'Penyeberangan (Zebra)', icon: <Footprints className="w-4 h-4" />, color: 'text-[#e11d48]' },
    { id: 'air-quality', label: 'Kualitas Udara (Gas)', icon: <Wind className="w-4 h-4" />, color: 'text-[#059669]' },
    { id: 'alerts', label: 'Riwayat Log & Serial', icon: <Terminal className="w-4 h-4" />, color: 'text-[#4f46e5]' },
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
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px] lg:hidden transition-opacity"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed lg:static top-0 bottom-0 left-0 z-50 w-64 bg-[#e6ecf5] border-r border-[#d3dde9] flex flex-col justify-between transition-transform duration-200 ease-in-out ${
          isOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div>
          {/* Header */}
          <div className="h-16 px-6 border-b border-[#d3dde9] flex items-center justify-between">
            <div>
              <h1 className="text-base font-extrabold tracking-tight text-[#19212d]">UrbanPulse</h1>
              <p className="text-[11px] text-[#6e7e93] font-medium">Miniatur Kota Cerdas</p>
            </div>

            <button
              onClick={onClose}
              className="lg:hidden p-2 rounded-xl text-[#4e5d71] neu-btn min-w-[44px] min-h-[44px] flex items-center justify-center cursor-pointer"
              aria-label="Tutup menu navigasi"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Navigation Menu */}
          <nav className="p-4 space-y-2.5">
            <p className="px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-[#6e7e93]">
              Modul Perangkat
            </p>
            {menuItems.map((item) => {
              const isActive = activeSubsystem === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleNavClick(item.id)}
                  className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-2xl text-xs font-bold transition-all min-h-[44px] cursor-pointer ${
                    isActive
                      ? 'neu-inset text-[#0284c7] font-extrabold shadow-inner'
                      : 'neu-btn text-[#4e5d71] hover:text-[#19212d]'
                  }`}
                >
                  <span className={isActive ? 'text-[#0284c7]' : item.color}>
                    {item.icon}
                  </span>
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Real Hardware Telemetry Status */}
        <div className="p-4 border-t border-[#d3dde9]">
          <div className="p-3.5 rounded-2xl neu-inset space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-[#6e7e93] font-medium">Board ESP32</span>
              <span className={`font-bold flex items-center gap-1.5 ${isHardwareConnected ? 'text-[#059669]' : 'text-[#8e9eaf]'}`}>
                <span className={`w-2 h-2 rounded-full ${isHardwareConnected ? 'bg-[#059669] shadow-[0_0_8px_#10b981]' : 'bg-[#8e9eaf]'}`} />
                {isHardwareConnected ? 'Terhubung' : 'Siaga'}
              </span>
            </div>

            <div className="flex items-center justify-between text-[11px]">
              <span className="text-[#6e7e93] font-medium">Port Serial</span>
              <span className="font-mono font-bold text-[#19212d]">COM3 (115200)</span>
            </div>

            <div className="flex items-center justify-between text-[11px]">
              <span className="text-[#6e7e93] font-medium">Firmware</span>
              <span className="font-mono font-bold text-[#19212d]">MicroPython</span>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};
