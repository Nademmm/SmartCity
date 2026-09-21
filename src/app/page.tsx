'use client';

import React, { useState } from 'react';
import { SmartCityProvider, useSmartCity } from '@/context/SmartCityContext';
import { Sidebar } from '@/components/layout/Sidebar';
import { Topbar } from '@/components/layout/Topbar';
import { DeviceInspectorDrawer } from '@/components/common/DeviceInspectorDrawer';

// Views
import { OverviewView } from '@/components/views/OverviewView';
import { TrafficView } from '@/components/views/TrafficView';
import { LightingView } from '@/components/views/LightingView';
import { PedestrianView } from '@/components/views/PedestrianView';
import { AirQualityView } from '@/components/views/AirQualityView';
import { IoTDevicesView } from '@/components/views/IoTDevicesView';
import { AutomationView } from '@/components/views/AutomationView';
import { AnalyticsView } from '@/components/views/AnalyticsView';
import { AlertsView } from '@/components/views/AlertsView';
import { SettingsView } from '@/components/views/SettingsView';

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
      case 'analytics':
        return <AnalyticsView />;
      case 'alerts':
        return <AlertsView />;
      case 'settings':
        return <SettingsView />;
      default:
        return <OverviewView />;
    }
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#070B14]">
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

      {/* Global Device Inspector Flyout */}
      <DeviceInspectorDrawer />
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
