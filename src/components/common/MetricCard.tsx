'use client';

import React, { ReactNode } from 'react';

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
  statusVariant = 'neutral',
  icon,
  footerText,
  onClick,
  className = '',
}) => {
  const getStatusStyle = () => {
    switch (statusVariant) {
      case 'success':
        return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
      case 'warning':
        return 'text-amber-400 bg-amber-500/10 border-amber-500/20';
      case 'danger':
        return 'text-rose-400 bg-rose-500/10 border-rose-500/20';
      case 'info':
        return 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20';
      case 'neutral':
      default:
        return 'text-slate-400 bg-slate-800/40 border-slate-700/50';
    }
  };

  return (
    <div
      onClick={onClick}
      className={`rounded-xl bg-slate-900/60 border border-slate-800/80 p-4 transition-colors hover:border-slate-700 ${
        onClick ? 'cursor-pointer hover:bg-slate-900/90' : ''
      } ${className}`}
    >
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 text-slate-400">
          <div className="text-slate-400">{icon}</div>
          <h3 className="text-xs font-medium text-slate-400 truncate">{title}</h3>
        </div>
        {statusText && (
          <div className={`px-2 py-0.5 rounded text-[11px] font-medium border shrink-0 ${getStatusStyle()}`}>
            {statusText}
          </div>
        )}
      </div>

      <div className="flex items-baseline gap-1.5 my-1">
        <p className="text-2xl font-bold tracking-tight text-white">{value}</p>
        {unit && <p className="text-xs font-medium text-slate-400">{unit}</p>}
      </div>

      {footerText && (
        <div className="mt-3 pt-2.5 border-t border-slate-800/60 text-[11px] text-slate-400">
          {footerText}
        </div>
      )}
    </div>
  );
};
