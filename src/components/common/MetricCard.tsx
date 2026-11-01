'use client';

import React, { ReactNode } from 'react';

interface MetricCardProps {
  title: string;
  value: string | number;
  unit?: string;
  icon?: ReactNode;
  subtitle?: string;
  onClick?: () => void;
  className?: string;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  unit,
  subtitle,
  onClick,
  className = '',
}) => {
  return (
    <div
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={(e) => {
        if (onClick && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          onClick();
        }
      }}
      className={`rack-panel p-4 font-mono ${onClick ? 'cursor-pointer' : ''} ${className}`}
    >
      <div className="text-xs text-[var(--text-secondary)] font-bold uppercase">{title}</div>
      <div className="text-2xl font-bold mt-1">
        {value} {unit && <span className="text-xs font-normal">{unit}</span>}
      </div>
      {subtitle && <div className="text-xs text-[var(--text-secondary)] mt-1">{subtitle}</div>}
    </div>
  );
};
