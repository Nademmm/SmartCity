'use client';

import React from 'react';
import { SmartCityProvider, useSmartCity } from '@/context/SmartCityContext';
import { Topbar } from '@/components/layout/Topbar';

import { OverviewView } from '@/components/views/OverviewView';
import { TrafficView } from '@/components/views/TrafficView';
import { LightingView } from '@/components/views/LightingView';
import { PedestrianView } from '@/components/views/PedestrianView';
import { AirQualityView } from '@/components/views/AirQualityView';
import { AlertsView } from '@/components/views/AlertsView';
import { PollutionAlarmModal } from '@/components/common/PollutionAlarmModal';

const DashboardContent: React.FC = () => {
  const { activeSubsystem } = useSmartCity();

  const renderActiveView = () => {
    switch (activeSubsystem) {
      case 'overview':
        return <OverviewView />;
      case 'air-quality':
        return <AirQualityView />;
      case 'pedestrian':
        return <PedestrianView />;
      case 'lighting':
        return <LightingView />;
      case 'traffic':
        return <TrafficView />;
      case 'alerts':
        return <AlertsView />;
      default:
        return <OverviewView />;
    }
  };

  return (
    <div className="min-h-dvh flex flex-col bg-[var(--bg-canvas)] text-[var(--text-primary)]">
      <PollutionAlarmModal />
      <Topbar />
      <main className="flex-1 w-full max-w-7xl mx-auto px-3 sm:px-6 pt-4 pb-24 lg:pb-8">
        {renderActiveView()}
      </main>
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
