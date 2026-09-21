'use client';

import React, { useState } from 'react';
import { useSmartCity } from '@/context/SmartCityContext';
import { MetricCard } from '@/components/common/MetricCard';
import {
  Zap,
  CheckCircle2,
  Sliders,
  Play,
  Clock,
  ShieldCheck,
  AlertTriangle,
  Flame,
  Power,
  RotateCcw,
} from 'lucide-react';
import { AutomationRule } from '@/types/iot';

export const AutomationView: React.FC = () => {
  const { rules, toggleRule, updateRuleThreshold, testRule, eventLogs } = useSmartCity();

  const [editingRuleId, setEditingRuleId] = useState<string | null>(null);
  const [tempThreshold, setTempThreshold] = useState<number>(70);

  const activeRulesCount = rules.filter((r) => r.isEnabled).length;
  const totalExecutions = rules.reduce((acc, curr) => acc + curr.triggerCount, 0);

  const handleStartEdit = (rule: AutomationRule) => {
    setEditingRuleId(rule.id);
    setTempThreshold(rule.thresholdValue);
  };

  const handleSaveThreshold = (ruleId: string) => {
    updateRuleThreshold(ruleId, tempThreshold);
    setEditingRuleId(null);
  };

  return (
    <div className="space-y-5">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Active Autonomous Rules"
          value={`${activeRulesCount}/${rules.length}`}
          unit="Rules"
          statusText="Fully Operational"
          statusVariant="success"
          icon={<Zap className="w-4 h-4" />}
          footerText="Autonomous Decision Engine"
        />

        <MetricCard
          title="Total Actions Executed"
          value={totalExecutions}
          unit="Triggers"
          statusText="Zero Failure Rate"
          statusVariant="info"
          icon={<ShieldCheck className="w-4 h-4" />}
          footerText="Rata-rata 42 eksekusi / jam"
        />

        <MetricCard
          title="Decision Latency"
          value="18"
          unit="ms"
          statusText="Ultra Low Delay"
          statusVariant="success"
          icon={<Clock className="w-4 h-4" />}
          footerText="Edge IoT AI Processing"
        />

        <MetricCard
          title="Human Override State"
          value="Standby"
          statusText="Automatic AI Mode"
          statusVariant="neutral"
          icon={<Sliders className="w-4 h-4" />}
          footerText="Operator Ready at All Times"
        />
      </div>

      {/* Main Rules Container */}
      <div className="glass-panel rounded-2xl p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-800">
          <div>
            <h2 className="text-base font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Zap className="w-4 h-4 text-cyan-400" />
              Autonomous Decision System (Rule Matrix)
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Matriks aturan otomasi pintar berbasis logika IF-THEN sensor data. Operator dapat mengatur threshold dan memicu uji coba.
            </p>
          </div>
          <span className="text-xs font-mono text-cyan-400 bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-800">
            Engine: UrbanPulse AI Core v2.4
          </span>
        </div>

        {/* Rule Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-5">
          {rules.map((rule) => {
            const isEditing = editingRuleId === rule.id;

            return (
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
                        {rule.isEnabled ? 'STATUS: ACTIVE' : 'STATUS: DISABLED'}
                      </span>
                    </div>
                    <h3 className="text-sm font-bold text-white">{rule.title}</h3>
                  </div>

                  {/* Toggle Switch */}
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

                <p className="text-xs text-slate-400 mt-2">{rule.description}</p>

                {/* IF - THEN Visual Logic Box */}
                <div className="my-4 space-y-2 text-xs">
                  {/* IF Condition */}
                  <div className="p-3 rounded-xl bg-[#080E1B] border border-slate-800/80 flex items-start gap-2.5">
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-black bg-amber-500/20 text-amber-400 border border-amber-500/30">
                      IF
                    </span>
                    <div className="text-slate-300 font-medium leading-relaxed">
                      {rule.ifConditionText}
                    </div>
                  </div>

                  {/* THEN Action */}
                  <div className="p-3 rounded-xl bg-[#080E1B] border border-slate-800/80 flex items-start gap-2.5">
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-black bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                      THEN
                    </span>
                    <div className="text-emerald-300 font-medium leading-relaxed">
                      {rule.thenActionText}
                    </div>
                  </div>
                </div>

                {/* Threshold Configuration & Execution Info */}
                <div className="pt-3 border-t border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                  <div>
                    {isEditing ? (
                      <div className="flex items-center gap-2">
                        <span className="text-slate-400">Threshold:</span>
                        <input
                          type="number"
                          value={tempThreshold}
                          onChange={(e) => setTempThreshold(Number(e.target.value))}
                          className="w-16 bg-slate-950 px-2 py-1 rounded border border-cyan-500 text-white font-mono text-xs focus:outline-none"
                        />
                        <span className="text-slate-400">{rule.thresholdUnit}</span>
                        <button
                          onClick={() => handleSaveThreshold(rule.id)}
                          className="px-2 py-1 rounded bg-cyan-500 text-black font-bold text-[10px]"
                        >
                          Simpan
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-slate-300">
                        <span className="text-slate-400">Threshold:</span>
                        <span className="font-mono font-bold text-cyan-300">
                          {rule.thresholdValue} {rule.thresholdUnit}
                        </span>
                        <button
                          onClick={() => handleStartEdit(rule)}
                          className="text-[10px] text-cyan-400 hover:underline ml-1"
                        >
                          (Edit)
                        </button>
                      </div>
                    )}
                    <div className="text-[10px] text-slate-500 mt-1">
                      Terakhir terpicu: <span className="text-slate-400 font-mono">{rule.lastTriggered || '-'}</span> • Total: {rule.triggerCount}x
                    </div>
                  </div>

                  {/* Manual Test Run Button */}
                  <button
                    onClick={() => testRule(rule.id)}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs border border-slate-700 transition-all flex items-center justify-center gap-1.5"
                  >
                    <Play className="w-3 h-3 text-cyan-400 fill-current" />
                    <span>Test Trigger</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
