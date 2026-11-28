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
    bg: 'bg-amber-50',
    text: 'text-amber-800',
    border: 'border-amber-200',
    dot: 'bg-amber-600',
    defaultLabel: 'Pending',
  },
  confirmed: {
    bg: 'bg-[#EFF6FF]',
    text: 'text-[#174EA6]',
    border: 'border-[#BFDBFE]',
    dot: 'bg-[#174EA6]',
    defaultLabel: 'Confirmed',
  },
  approved: {
    bg: 'bg-[#EFF6FF]',
    text: 'text-[#174EA6]',
    border: 'border-[#BFDBFE]',
    dot: 'bg-[#174EA6]',
    defaultLabel: 'Approved',
  },
  rejected: {
    bg: 'bg-[#F5F7FA]',
    text: 'text-[#111827]',
    border: 'border-[#111827]',
    dot: 'bg-[#111827]',
    defaultLabel: 'Rejected',
  },
  incoming: {
    bg: 'bg-[#EFF6FF]',
    text: 'text-[#174EA6]',
    border: 'border-[#BFDBFE]',
    dot: 'bg-[#174EA6]',
    defaultLabel: 'Incoming',
  },
  ongoing: {
    bg: 'bg-[#EFF6FF]',
    text: 'text-[#0B1F3A]',
    border: 'border-[#BFDBFE]',
    dot: 'bg-[#0B1F3A]',
    defaultLabel: 'Ongoing',
  },
  'in-progress': {
    bg: 'bg-amber-50',
    text: 'text-amber-800',
    border: 'border-amber-200',
    dot: 'bg-amber-600',
    defaultLabel: 'In Progress',
  },
  online: {
    bg: 'bg-[#EFF6FF]',
    text: 'text-[#174EA6]',
    border: 'border-[#BFDBFE]',
    dot: 'bg-[#174EA6]',
    defaultLabel: 'Online',
  },
  away: {
    bg: 'bg-amber-50',
    text: 'text-amber-800',
    border: 'border-amber-200',
    dot: 'bg-amber-600',
    defaultLabel: 'Away',
  },
  'on-leave': {
    bg: 'bg-[#F5F7FA]',
    text: 'text-[#64748B]',
    border: 'border-[#E5E7EB]',
    dot: 'bg-[#64748B]',
    defaultLabel: 'On Leave',
  },
  neutral: {
    bg: 'bg-[#F5F7FA]',
    text: 'text-[#64748B]',
    border: 'border-[#E5E7EB]',
    dot: 'bg-[#64748B]',
    defaultLabel: 'Neutral',
  },
  high: {
    bg: 'bg-[#0B1F3A]',
    text: 'text-[#FFFFFF]',
    border: 'border-[#0B1F3A]',
    dot: 'bg-[#174EA6]',
    defaultLabel: 'High',
  },
  medium: {
    bg: 'bg-amber-50',
    text: 'text-amber-800',
    border: 'border-amber-200',
    dot: 'bg-amber-600',
    defaultLabel: 'Medium',
  },
  low: {
    bg: 'bg-[#EFF6FF]',
    text: 'text-[#174EA6]',
    border: 'border-[#BFDBFE]',
    dot: 'bg-[#174EA6]',
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
      : 'px-2 py-0.5 text-[11px] gap-1.5';

  return (
    <span
      data-testid={dataTestId || `status-pill-${normalizedKey}`}
      className={`inline-flex items-center font-semibold rounded-md border whitespace-nowrap transition-colors select-none ${config.bg} ${config.text} ${config.border} ${sizeClasses} ${className}`}
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
