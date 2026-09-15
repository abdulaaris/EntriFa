import React from 'react';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  variant?: 'default' | 'blue' | 'green' | 'red' | 'amber';
  trend?: string;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  icon: Icon,
  variant = 'default',
  trend,
}) => {
  const variantStyles = {
    default: 'bg-white border-gray-200 text-gray-900 icon-bg:bg-gray-100 icon-color:text-gray-600',
    blue: 'bg-white border-blue-100 text-gray-900 icon-bg:bg-blue-50 icon-color:text-brand-600',
    green: 'bg-white border-emerald-100 text-gray-900 icon-bg:bg-emerald-50 icon-color:text-emerald-600',
    red: 'bg-white border-rose-100 text-gray-900 icon-bg:bg-rose-50 icon-color:text-rose-600',
    amber: 'bg-white border-amber-100 text-gray-900 icon-bg:bg-amber-50 icon-color:text-amber-600',
  };

  const iconColors = {
    default: 'bg-gray-100 text-gray-600',
    blue: 'bg-blue-50 text-brand-600',
    green: 'bg-emerald-50 text-emerald-600',
    red: 'bg-rose-50 text-rose-600',
    amber: 'bg-amber-50 text-amber-600',
  };

  return (
    <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">{title}</span>
        <div className={`p-2.5 rounded-xl ${iconColors[variant]}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
      <div className="mt-3">
        <h3 className="text-2xl font-black tracking-tight text-gray-900">{value}</h3>
        {subtitle && <p className="text-xs text-gray-500 mt-1 font-medium">{subtitle}</p>}
        {trend && (
          <p className="text-[11px] font-semibold text-emerald-600 mt-1 flex items-center gap-1">
            {trend}
          </p>
        )}
      </div>
    </div>
  );
};
