'use client';

import React, { ReactNode } from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface MetricCardProps {
  title: string;
  value: string | number;
  unit?: string;
  statusText?: string;
  statusVariant?: 'success' | 'warning' | 'danger' | 'info' | 'neutral';
  trend?: {
    value: string;
    direction: 'up' | 'down' | 'neutral';
    label: string;
  };
  icon: ReactNode;
  footerText?: string;
  onClick?: () => void;
  className?: string;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  unit,
  statusText,
  statusVariant = 'info',
  trend,
  icon,
  footerText,
  onClick,
  className = '',
}) => {
  const getStatusBadge = () => {
    switch (statusVariant) {
      case 'success':
        return 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30';
      case 'warning':
        return 'bg-amber-500/15 text-amber-400 border border-amber-500/30';
      case 'danger':
        return 'bg-rose-500/15 text-rose-400 border border-rose-500/30';
      case 'neutral':
        return 'bg-slate-700/30 text-slate-300 border border-slate-600/40';
      case 'info':
      default:
        return 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30';
    }
  };

  return (
    <div
      onClick={onClick}
      className={`glass-panel rounded-xl p-4 transition-all duration-200 hover:border-cyan-500/40 hover:bg-[#14203b] ${
        onClick ? 'cursor-pointer' : ''
      } ${className}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
            {icon}
          </div>
          <div>
            <h3 className="text-xs font-medium uppercase tracking-wider text-slate-400">{title}</h3>
            {statusText && (
              <span className={`inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-semibold tracking-wide ${getStatusBadge()}`}>
                {statusText}
              </span>
            )}
          </div>
        </div>

        {trend && (
          <div className="flex items-center gap-1 text-[11px] font-medium text-slate-300">
            {trend.direction === 'up' && <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />}
            {trend.direction === 'down' && <TrendingDown className="w-3.5 h-3.5 text-rose-400" />}
            {trend.direction === 'neutral' && <Minus className="w-3.5 h-3.5 text-slate-400" />}
            <span>{trend.value}</span>
          </div>
        )}
      </div>

      <div className="mt-3 flex items-baseline gap-1.5">
        <span className="text-2xl font-bold tracking-tight text-white">{value}</span>
        {unit && <span className="text-xs font-semibold text-cyan-400/80">{unit}</span>}
      </div>

      {footerText && (
        <div className="mt-2.5 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
          <span>{footerText}</span>
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
        </div>
      )}
    </div>
  );
};
