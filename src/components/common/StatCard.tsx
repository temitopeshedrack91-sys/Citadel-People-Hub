import React from 'react';
import { LucideIcon } from 'lucide-react';

export interface StatCardProps {
  id?: string;
  title: string;
  value: string | number;
  subtitle?: string;
  supportingText?: React.ReactNode;
  icon: LucideIcon;
  iconColor?: string;
  iconBg?: string;
  trend?: {
    value: string;
    isPositive?: boolean;
    label?: string;
  };
  onClick?: () => void;
  className?: string;
  dataTestId?: string;
}

/**
 * Reusable StatCard matching Hrivio HR Dashboard visual reference:
 * - Pure white surface with rounded-2xl corners & soft shadow
 * - Top row: subtle icon container with title beside it
 * - Big bold metric value
 * - Colored supporting text / trend badge beneath it
 */
export const StatCard: React.FC<StatCardProps> = ({
  id,
  title,
  value,
  subtitle,
  supportingText,
  icon: Icon,
  iconColor = 'text-slate-700',
  iconBg = 'bg-slate-100 border-slate-200/80',
  trend,
  onClick,
  className = '',
  dataTestId,
}) => {
  return (
    <div
      id={id}
      data-testid={dataTestId || `stat-card-${title.toLowerCase().replace(/\s+/g, '-')}`}
      onClick={onClick}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onClick();
              }
            }
          : undefined
      }
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      className={`bg-white rounded-xl border border-slate-200/80 p-5 shadow-[0_1px_2px_rgba(15,23,42,0.03)] flex flex-col justify-between transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#083E34]/30 ${
        onClick
          ? 'cursor-pointer hover:border-[#083E34]/35 hover:shadow-[0_4px_12px_rgba(15,23,42,0.05)] active:scale-[0.99]'
          : ''
      } ${className}`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-slate-500 tracking-tight">{title}</span>
        <Icon className={`w-4 h-4 shrink-0 opacity-75 ${iconColor}`} />
      </div>

      <div className="mt-3.5">
        <span className="font-display text-[30px] sm:text-[34px] font-bold text-slate-900 tracking-tight tabular-nums block leading-none">
          {value}
        </span>

        {supportingText ? (
          <div className="mt-2.5 flex items-center gap-1.5 text-xs flex-wrap font-medium">
            {supportingText}
          </div>
        ) : trend ? (
          <div className="mt-2.5 flex items-center gap-1.5 text-xs flex-wrap">
            <span
              className={`font-semibold tabular-nums whitespace-nowrap ${
                trend.isPositive === false ? 'text-rose-500' : 'text-emerald-600'
              }`}
            >
              {trend.value}
            </span>
            {trend.label && (
              <span className="text-slate-500 whitespace-nowrap">
                &bull; {trend.label}
              </span>
            )}
          </div>
        ) : subtitle ? (
          <p className="mt-2.5 text-xs text-slate-500">{subtitle}</p>
        ) : null}
      </div>
    </div>
  );
};

export default StatCard;
