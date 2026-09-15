import React from 'react';
import { LucideIcon, Plus } from 'lucide-react';

interface EmptyStateProps {
  title: string;
  description: string;
  icon: LucideIcon;
  actionLabel?: string;
  onAction?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  icon: Icon,
  actionLabel,
  onAction,
}) => {
  return (
    <div className="text-center py-12 px-4 rounded-2xl border-2 border-dashed border-gray-200 bg-gray-50/50">
      <div className="w-12 h-12 rounded-2xl bg-brand-50 text-brand-600 flex items-center justify-center mx-auto mb-3 shadow-inner">
        <Icon className="w-6 h-6" />
      </div>
      <h4 className="text-base font-bold text-gray-900">{title}</h4>
      <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">{description}</p>
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="mt-4 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-bold shadow-sm shadow-brand-500/20 inline-flex items-center gap-1.5 transition-transform active:scale-95"
        >
          <Plus className="w-4 h-4" />
          {actionLabel}
        </button>
      )}
    </div>
  );
};
