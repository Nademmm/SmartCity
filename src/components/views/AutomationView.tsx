'use client';

import React from 'react';
import { useSmartCity } from '@/context/SmartCityContext';
import { MetricCard } from '@/components/common/MetricCard';
import {
  Zap,
  CheckCircle2,
  Play,
  Clock,
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
    <div className="space-y-5">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Aturan Otomasi Aktif"
          value={`${activeRulesCount}/${rules.length}`}
          unit="Rules"
          statusText="100% Berjalan di Hardware"
          statusVariant="success"
          icon={<Zap className="w-4 h-4" />}
          footerText="Logika Terintegrasi Thonny & AI"
        />

        <MetricCard
          title="Total Aksi Terpicu"
          value={totalExecutions}
          unit="Eksekusi"
          statusText="Responsif"
          statusVariant="info"
          icon={<ShieldCheck className="w-4 h-4" />}
          footerText="Riwayat Pemicu Otomasi"
        />

        <MetricCard
          title="Latensi Eksekusi Miniatur"
          value="< 10"
          unit="ms"
          statusText="Real-Time GPIO"
          statusVariant="success"
          icon={<Clock className="w-4 h-4" />}
          footerText="Langsung di ESP32 Chip"
        />

        <MetricCard
          title="Sistem Keamanan Zebra Cross"
          value="SIAP"
          statusText="Batas 17/25 cm"
          statusVariant="success"
          icon={<CheckCircle2 className="w-4 h-4" />}
          footerText="Perlindungan Pejalan Kaki"
        />
      </div>

      {/* Main Rules Container */}
      <div className="glass-panel rounded-2xl p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-800">
          <div>
            <h2 className="text-base font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Zap className="w-4 h-4 text-cyan-400" />
              Matriks Logika Otomasi Miniatur Smart City
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Daftar aturan otomasi yang diimplementasikan pada miniatur hardware ESP32 dan kamera lalu lintas AI.
            </p>
          </div>
          <span className="text-xs font-mono text-cyan-400 bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-800">
            Engine: MicroPython & Python Vision
          </span>
        </div>

        {/* Rule Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-5">
          {rules.map((rule) => (
            <div
              key={rule.id}
              className={`p-5 rounded-2xl border transition-all ${
                rule.isEnabled
                  ? 'bg-slate-900/80 border-slate-800 hover:border-cyan-500/40 shadow-lg'
                  : 'bg-slate-950/60 border-slate-900 opacity-60'
              }`}
            >
              {/* Header */}
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                      {rule.id}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        rule.isEnabled
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {rule.isEnabled ? 'STATUS: AKTIF' : 'STATUS: NONAKTIF'}
                    </span>
                  </div>
                  <h3 className="text-sm font-bold text-white">{rule.title}</h3>
                </div>

                <button
                  onClick={() => toggleRule(rule.id)}
                  className={`p-2 rounded-xl border transition-all ${
                    rule.isEnabled
                      ? 'bg-cyan-500 text-black border-cyan-400 font-bold'
                      : 'bg-slate-800 text-slate-400 border-slate-700'
                  }`}
                  title={rule.isEnabled ? 'Nonaktifkan Rule' : 'Aktifkan Rule'}
                >
                  <Power className="w-4 h-4" />
                </button>
              </div>

              {/* IF - THEN Visual Logic Box */}
              <div className="my-4 space-y-2 text-xs">
                {/* IF Condition */}
                <div className="p-3 rounded-xl bg-[#080E1B] border border-slate-800/80 flex items-start gap-2.5">
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-black bg-amber-500/20 text-amber-400 border border-amber-500/30">
                    JIKA (IF)
                  </span>
                  <div className="text-slate-300 font-medium leading-relaxed">
                    {rule.conditionText}
                  </div>
                </div>

                {/* THEN Action */}
                <div className="p-3 rounded-xl bg-[#080E1B] border border-slate-800/80 flex items-start gap-2.5">
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-black bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    MAKA (THEN)
                  </span>
                  <div className="text-emerald-300 font-medium leading-relaxed">
                    {rule.actionText}
                  </div>
                </div>
              </div>

              {/* Footer and Test Trigger */}
              <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-xs">
                <span className="text-slate-400 text-[11px]">
                  Terakhir: <span className="text-slate-300 font-mono">{rule.lastTriggered || '-'}</span> • {rule.triggerCount}x Terpicu
                </span>

                <button
                  onClick={() => handleTestRule(rule)}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-300 font-semibold text-xs border border-slate-700 transition-all flex items-center gap-1.5"
                >
                  <Play className="w-3 h-3 fill-current" />
                  <span>Uji Eksekusi</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
