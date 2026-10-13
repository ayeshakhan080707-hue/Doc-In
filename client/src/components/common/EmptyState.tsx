import React from 'react';
import { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon,
  title,
  description,
  action,
  className = '',
}) => (
  <div className={`flex flex-col items-center justify-center text-center py-12 px-6 ${className}`}>
    <div className="w-14 h-14 rounded-full bg-[#EDF3F8] flex items-center justify-center mb-4">
      <Icon size={28} className="text-[rgba(0,0,0,0.35)]" />
    </div>
    <h3 className="font-semibold text-sm text-[rgba(0,0,0,0.75)] mb-1">{title}</h3>
    <p className="text-xs text-[rgba(0,0,0,0.5)] max-w-xs leading-relaxed">{description}</p>
    {action && (
      <button
        onClick={action.onClick}
        className="mt-5 px-5 py-2 text-xs font-semibold text-[#0A66C2] border border-[#0A66C2] rounded-full hover:bg-[#EBF5FF] transition-colors"
      >
        {action.label}
      </button>
    )}
  </div>
);
