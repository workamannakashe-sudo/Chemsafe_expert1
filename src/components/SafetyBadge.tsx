import React from 'react';
import { cn } from '../lib/utils';
import { SafetyStatus } from '../types';
import { ShieldCheck, ShieldAlert, ShieldX } from 'lucide-react';

interface SafetyBadgeProps {
  status: SafetyStatus;
  className?: string;
  showIcon?: boolean;
  label?: string;
}

export const SafetyBadge: React.FC<SafetyBadgeProps> = ({ 
  status, 
  className, 
  showIcon = true,
  label: customLabel
}) => {
  const config = {
    SAFE: {
      color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
      icon: <ShieldCheck className="w-4 h-4" />,
      label: 'SAFE'
    },
    CAUTION: {
      color: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
      icon: <ShieldAlert className="w-4 h-4" />,
      label: 'CAUTION'
    },
    UNSAFE: {
      color: 'bg-rose-500/20 text-rose-400 border-rose-500/30',
      icon: <ShieldX className="w-4 h-4" />,
      label: 'UNSAFE'
    }
  };

  const { color, icon, label: defaultLabel } = config[status];

  return (
    <span className={cn(
      "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border",
      color,
      className
    )}>
      {showIcon && icon}
      {customLabel || defaultLabel}
    </span>
  );
};
