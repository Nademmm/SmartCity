'use client';

import React, { useState } from 'react';
import { SmartCityProvider, useSmartCity } from '@/context/SmartCityContext';
import { Sidebar } from '@/components/layout/Sidebar';
import { Topbar } from '@/components/layout/Topbar';

// Real Miniature & AI Camera Views
import { OverviewView } from '@/components/views/OverviewView';
import { TrafficView } from '@/components/views/TrafficView';
import { LightingView } from '@/components/views/LightingView';
import { PedestrianView } from '@/components/views/PedestrianView';
import { AirQualityView } from '@/components/views/AirQualityView';
import { IoTDevicesView } from '@/components/views/IoTDevicesView';
import { AutomationView } from '@/components/views/AutomationView';
import { AlertsView } from '@/components/views/AlertsView';

import { PollutionAlarmModal } from '@/components/common/PollutionAlarmModal';

const DashboardContent: React.FC = () => {
  const { activeSubsystem } = useSmartCity();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const renderActiveView = () => {
    switch (activeSubsystem) {
      case 'overview':
        return <OverviewView />;
      case 'traffic':
        return <TrafficView />;
      case 'lighting':
        return <LightingView />;
      case 'pedestrian':
        return <PedestrianView />;
      case 'air-quality':
        return <AirQualityView />;
      case 'iot-devices':
        return <IoTDevicesView />;
      case 'automation':
        return <AutomationView />;
      case 'alerts':
        return <AlertsView />;
      default:
        return <OverviewView />;
    }
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#070B14]">
      {/* Pollution Emergency Alarm Modal & Strobe */}
      <PollutionAlarmModal />

      {/* Navigation Sidebar */}
      <Sidebar
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        <Topbar onOpenMobileMenu={() => setIsMobileMenuOpen(true)} />

        <main className="flex-1 overflow-y-auto p-4 lg:p-6 pb-12">
          <div className="max-w-7xl mx-auto">
            {renderActiveView()}
          </div>
        </main>
      </div>
    </div>
  );
};

export default function HomePage() {
  return (
    <SmartCityProvider>
      <DashboardContent />
    </SmartCityProvider>
  );
}
