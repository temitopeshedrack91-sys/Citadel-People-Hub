import React from 'react';

export type StatusPillVariant =
  | 'pending'
  | 'confirmed'
  | 'approved'
  | 'rejected'
  | 'incoming'
  | 'ongoing'
  | 'in-progress'
  | 'online'
  | 'away'
  | 'on-leave'
  | 'neutral'
  | 'high'
  | 'medium'
  | 'low';

export interface StatusPillProps {
  status?: StatusPillVariant | string;
  label?: string;
  showDot?: boolean;
  size?: 'sm' | 'md';
  className?: string;
  dataTestId?: string;
}

const variantStyles: Record<
  StatusPillVariant,
  { bg: string; text: string; border: string; dot: string; defaultLabel: string }
> = {
  pending: {
    bg: 'bg-[#FFFBEB]',
    text: 'text-[#D97706]',
    border: 'border-[#FDE68A]',
    dot: 'bg-[#F59E0B]',
    defaultLabel: 'Pending',
  },
  confirmed: {
    bg: 'bg-[#ECFDF5]',
    text: 'text-[#059669]',
    border: 'border-[#A7F3D0]',
    dot: 'bg-[#10B981]',
    defaultLabel: 'Confirmed',
  },
  approved: {
    bg: 'bg-[#ECFDF5]',
    text: 'text-[#059669]',
    border: 'border-[#A7F3D0]',
    dot: 'bg-[#10B981]',
    defaultLabel: 'Approved',
  },
  rejected: {
    bg: 'bg-[#FEF2F2]',
    text: 'text-[#DC2626]',
    border: 'border-[#FECACA]',
    dot: 'bg-[#EF4444]',
    defaultLabel: 'Rejected',
  },
  incoming: {
    bg: 'bg-[#EBF8F2]',
    text: 'text-[#166534]',
    border: 'border-[#BBF7D0]',
    dot: 'bg-[#22C55E]',
    defaultLabel: 'Incoming',
  },
  ongoing: {
    bg: 'bg-[#F0F9FF]',
    text: 'text-[#0369A1]',
    border: 'border-[#BAE6FD]',
    dot: 'bg-[#0284C7]',
    defaultLabel: 'Ongoing',
  },
  'in-progress': {
    bg: 'bg-[#FEF3EB]',
    text: 'text-[#C2410C]',
    border: 'border-[#FED7AA]',
    dot: 'bg-[#F97316]',
    defaultLabel: 'In Progress',
  },
  online: {
    bg: 'bg-[#ECFDF5]',
    text: 'text-[#059669]',
    border: 'border-[#A7F3D0]',
    dot: 'bg-[#10B981]',
    defaultLabel: 'Online',
  },
  away: {
    bg: 'bg-[#FEF3EB]',
    text: 'text-[#D97706]',
    border: 'border-[#FED7AA]',
    dot: 'bg-[#F59E0B]',
    defaultLabel: 'Away',
  },
  'on-leave': {
    bg: 'bg-slate-100',
    text: 'text-slate-700',
    border: 'border-slate-300',
    dot: 'bg-slate-500',
    defaultLabel: 'On Leave',
  },
  neutral: {
    bg: 'bg-slate-100',
    text: 'text-slate-700',
    border: 'border-slate-200',
    dot: 'bg-slate-400',
    defaultLabel: 'Neutral',
  },
  high: {
    bg: 'bg-[#FEF2F2]',
    text: 'text-[#DC2626]',
    border: 'border-[#FECACA]',
    dot: 'bg-[#EF4444]',
    defaultLabel: 'High',
  },
  medium: {
    bg: 'bg-[#FFFBEB]',
    text: 'text-[#D97706]',
    border: 'border-[#FDE68A]',
    dot: 'bg-[#F59E0B]',
    defaultLabel: 'Medium',
  },
  low: {
    bg: 'bg-[#F0FDF4]',
    text: 'text-[#15803D]',
    border: 'border-[#BBF7D0]',
    dot: 'bg-[#22C55E]',
    defaultLabel: 'Low',
  },
};

/**
 * Reusable StatusPill component matching reference designs:
 * Status pills combine semantic color with explicit text labels so meaning
 * doesn't rely on color alone.
 */
export const StatusPill: React.FC<StatusPillProps> = ({
  status = 'neutral',
  label,
  showDot = false,
  size = 'md',
  className = '',
  dataTestId,
}) => {
  const normalizedKey = (status?.toLowerCase().replace(/\s+/g, '-') as StatusPillVariant) || 'neutral';
  const config = variantStyles[normalizedKey] || variantStyles.neutral;
  const displayLabel = label ?? config.defaultLabel;

  const sizeClasses =
    size === 'sm'
      ? 'px-2 py-0.5 text-[10px] gap-1'
      : 'px-2.5 py-0.5 text-xs gap-1.5';

  return (
    <span
      data-testid={dataTestId || `status-pill-${normalizedKey}`}
      className={`inline-flex items-center font-bold rounded-full border transition-colors select-none ${config.bg} ${config.text} ${config.border} ${sizeClasses} ${className}`}
    >
      {showDot && (
        <span
          data-testid="status-pill-dot"
          className={`w-1.5 h-1.5 rounded-full shrink-0 ${config.dot}`}
          aria-hidden="true"
        />
      )}
      <span>{displayLabel}</span>
    </span>
  );
};

export default StatusPill;
