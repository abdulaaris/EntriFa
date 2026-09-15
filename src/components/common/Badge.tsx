import React from 'react';

interface BadgeProps {
  status: string;
  size?: 'sm' | 'md';
}

export const Badge: React.FC<BadgeProps> = ({ status, size = 'md' }) => {
  const s = status.toUpperCase();

  let colorClasses = 'bg-gray-100 text-gray-700 border-gray-200';

  if (['ACTIVE', 'PAID', 'COMPLETED'].includes(s)) {
    colorClasses = 'bg-emerald-50 text-emerald-700 border-emerald-200';
  } else if (['SUSPENDED', 'FAILED', 'OVERDUE'].includes(s)) {
    colorClasses = 'bg-rose-50 text-rose-700 border-rose-200';
  } else if (['INACTIVE', 'UNPAID'].includes(s)) {
    colorClasses = 'bg-amber-50 text-amber-700 border-amber-200';
  } else if (['TRIAL', 'PARTIALLY_PAID', 'PENDING'].includes(s)) {
    colorClasses = 'bg-blue-50 text-blue-700 border-blue-200';
  }

  const sizeClass = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs';

  return (
    <span className={`inline-flex items-center font-semibold rounded-full border ${sizeClass} ${colorClasses}`}>
      {status}
    </span>
  );
};
