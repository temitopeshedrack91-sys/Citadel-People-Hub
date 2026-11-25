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
      className={`bg-white rounded-xl border border-slate-200/90 p-5 shadow-2xs flex flex-col justify-between transition-colors duration-150 ${
        onClick
          ? 'cursor-pointer hover:border-[#083E34]/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#083E34] focus-visible:ring-offset-2'
          : ''
      } ${className}`}
    >
      <div className="flex items-center justify-between gap-2.5">
        <span className="text-xs font-semibold text-slate-600 tracking-tight">{title}</span>
        <div
          className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border ${iconBg}`}
        >
          <Icon className={`w-4 h-4 ${iconColor}`} />
        </div>
      </div>

      <div className="mt-3.5">
        <span className="text-2xl sm:text-[28px] font-bold text-slate-900 tracking-tight tabular-nums block leading-none">
          {value}
        </span>

        {supportingText ? (
          <div className="mt-2 flex items-center gap-1.5 text-xs flex-wrap font-medium">
            {supportingText}
          </div>
        ) : trend ? (
          <div className="mt-2 flex items-center gap-1.5 text-xs flex-wrap tabular-nums">
            <span
              className={`font-semibold whitespace-nowrap ${
                trend.isPositive === false ? 'text-rose-600' : 'text-emerald-700'
              }`}
            >
              {trend.value}
            </span>
            {trend.label && (
              <span className="text-slate-500 font-medium whitespace-nowrap">
                · {trend.label}
              </span>
            )}
          </div>
        ) : subtitle ? (
          <p className="mt-2 text-xs text-slate-500 font-medium">{subtitle}</p>
        ) : null}
      </div>
    </div>
  );
};

export default StatCard;
