'use client';

import React from 'react';
import { useSmartCity } from '@/context/SmartCityContext';
import { MetricCard } from '@/components/common/MetricCard';
import {
  Zap,
  Play,
  ShieldCheck,
  Power,
} from 'lucide-react';
import { AutomationRule } from '@/types/iot';

export const AutomationView: React.FC = () => {
  const {
    rules,
    toggleRule,
    togglePjuDayNight,
    triggerCrossingDetection,
    setGasSensorValue,
    triggerTrafficEmergency,
  } = useSmartCity();

  const activeRulesCount = rules.filter((r) => r.isEnabled).length;
  const totalExecutions = rules.reduce((acc, curr) => acc + curr.triggerCount, 0);

  const handleTestRule = (rule: AutomationRule) => {
    switch (rule.feature) {
      case 'pju':
        togglePjuDayNight();
        break;
      case 'penyeberangan':
        triggerCrossingDetection('kanan');
        break;
      case 'polusi':
        setGasSensorValue(1600);
        break;
      case 'traffic':
        triggerTrafficEmergency();
        break;
    }
  };

  return (
    <div className="space-y-4">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <MetricCard
          title="Aturan Otomasi Aktif"
          value={`${activeRulesCount}/${rules.length}`}
          unit="Rule"
          statusText="Logika Terpasang"
          statusVariant="success"
          icon={<Zap className="w-4 h-4" />}
          footerText="Diimplementasikan di MicroPython"
        />

        <MetricCard
          title="Total Pemicu Eksekusi"
          value={totalExecutions}
          unit="Kali"
          statusText="Riwayat Aktif"
          statusVariant="info"
          icon={<ShieldCheck className="w-4 h-4" />}
          footerText="Akumulasi Selama Sesi"
        />

        <MetricCard
          title="Sistem PJU Otomatis"
          value="AKTIF"
          statusText="Ambang: 2000 ADC"
          statusVariant="success"
          icon={<Zap className="w-4 h-4" />}
          footerText="Sensor LDR Pin 36"
        />

        <MetricCard
          title="Sistem Zebra Cross"
          value="AKTIF"
          statusText="Dual Sensor Siap"
          statusVariant="success"
          icon={<ShieldCheck className="w-4 h-4" />}
          footerText="Pin 32/34 dan Pin 33/35"
        />
      </div>

      {/* Main Rules Container */}
      <div className="rounded-xl bg-slate-900/60 border border-slate-800/80 p-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-800/80">
          <div>
            <h2 className="text-xs font-semibold text-white uppercase tracking-wider">
              Logika Otomasi Miniatur Smart City
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Aturan otomasi yang dieksekusi mikrokontroler ESP32 berdasarkan pembacaan sensor fisik.
            </p>
          </div>
          <p className="text-[11px] font-mono text-slate-400 bg-slate-900 px-2.5 py-1 rounded border border-slate-800">
            MicroPython & AI Vision
          </p>
        </div>

        {/* Rule Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
          {rules.map((rule) => (
            <div
              key={rule.id}
              className={`p-4 rounded-xl border transition-colors ${
                rule.isEnabled
                  ? 'bg-slate-900/80 border-slate-800'
                  : 'bg-slate-950/60 border-slate-900 opacity-60'
              }`}
            >
              {/* Header */}
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-[10px] font-mono font-medium text-cyan-400 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                      {rule.id}
                    </p>
                    <p className="text-[10px] font-medium text-slate-400">
                      {rule.isEnabled ? 'Aktif' : 'Nonaktif'}
                    </p>
                  </div>
                  <h3 className="text-xs font-semibold text-white">{rule.title}</h3>
                </div>

                <button
                  onClick={() => toggleRule(rule.id)}
                  className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                    rule.isEnabled
                      ? 'bg-slate-800 text-cyan-400 border-slate-700'
                      : 'bg-slate-950 text-slate-500 border-slate-800'
                  }`}
                  title={rule.isEnabled ? 'Nonaktifkan Rule' : 'Aktifkan Rule'}
                >
                  <Power className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Logic Box */}
              <div className="my-3 space-y-2 text-xs">
                <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800/80">
                  <p className="text-[10px] font-mono font-semibold text-amber-400 uppercase mb-0.5">Kondisi (IF):</p>
                  <p className="text-slate-300 text-xs">{rule.conditionText}</p>
                </div>

                <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800/80">
                  <p className="text-[10px] font-mono font-semibold text-emerald-400 uppercase mb-0.5">Aksi (THEN):</p>
                  <p className="text-slate-300 text-xs">{rule.actionText}</p>
                </div>
              </div>

              {/* Footer and Test Trigger */}
              <div className="pt-2.5 border-t border-slate-800/80 flex items-center justify-between text-xs">
                <p className="text-slate-400 text-[11px]">
                  Pemicu: <span className="text-slate-300 font-mono">{rule.triggerCount}x</span>
                </p>

                <button
                  onClick={() => handleTestRule(rule)}
                  className="px-2.5 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium text-xs border border-slate-700 transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <Play className="w-3 h-3 fill-current" />
                  <p>Uji Aturan</p>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
