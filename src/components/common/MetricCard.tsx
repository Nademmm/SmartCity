'use client';

import React, { ReactNode } from 'react';

interface MetricCardProps {
  title: string;
  value: string | number;
  unit?: string;
  colorScheme?: 'emerald' | 'cyan' | 'amber' | 'rose' | 'indigo';
  statusText?: string;
  statusVariant?: string;
  footerText?: string;
  icon: ReactNode;
  subtitle?: string;
  onClick?: () => void;
  className?: string;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  unit,
  colorScheme = 'cyan',
  icon,
  subtitle,
  onClick,
  className = '',
}) => {
  const getThemeStyles = () => {
    switch (colorScheme) {
      case 'emerald':
        return {
          iconBg: 'bg-[#d1fae5] text-[#059669]',
          valueColor: 'text-[#059669]',
          dotColor: 'bg-[#10b981]',
          borderHover: 'hover:border-[#a7f3d0]',
        };
      case 'amber':
        return {
          iconBg: 'bg-[#fef3c7] text-[#d97706]',
          valueColor: 'text-[#d97706]',
          dotColor: 'bg-[#f59e0b]',
          borderHover: 'hover:border-[#fde68a]',
        };
      case 'rose':
        return {
          iconBg: 'bg-[#ffe4e6] text-[#e11d48]',
          valueColor: 'text-[#e11d48]',
          dotColor: 'bg-[#f43f5e]',
          borderHover: 'hover:border-[#fecdd3]',
        };
      case 'indigo':
        return {
          iconBg: 'bg-[#e0e7ff] text-[#4f46e5]',
          valueColor: 'text-[#4f46e5]',
          dotColor: 'bg-[#6366f1]',
          borderHover: 'hover:border-[#c7d2fe]',
        };
      case 'cyan':
      default:
        return {
          iconBg: 'bg-[#e0f2fe] text-[#0284c7]',
          valueColor: 'text-[#0284c7]',
          dotColor: 'bg-[#0ea5e9]',
          borderHover: 'hover:border-[#bae6fd]',
        };
    }
  };

  const theme = getThemeStyles();

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
      className={`rounded-2xl neu-raised p-5 border border-white/70 transition-all duration-200 ${
        onClick
          ? `cursor-pointer neu-raised-hover ${theme.borderHover} active:scale-[0.99]`
          : ''
      } ${className}`}
    >
      <div className="flex items-center justify-between gap-3 mb-3">
        <h3 className="text-xs font-bold text-[#4e5d71] uppercase tracking-wider">{title}</h3>
        <div className={`w-9 h-9 rounded-xl neu-inset flex items-center justify-center shrink-0 ${theme.iconBg}`}>
          {icon}
        </div>
      </div>

      <div className="flex items-baseline gap-2 my-1">
        <span className={`text-3xl font-extrabold tracking-tight font-mono ${theme.valueColor}`}>
          {value}
        </span>
        {unit && <span className="text-xs font-semibold text-[#6e7e93] font-mono">{unit}</span>}
      </div>

      {subtitle && (
        <p className="text-[11px] text-[#6e7e93] mt-2 font-medium">
          {subtitle}
        </p>
      )}
    </div>
  );
};
