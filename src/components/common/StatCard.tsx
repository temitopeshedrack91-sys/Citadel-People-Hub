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
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      className={`bg-white rounded-2xl border border-slate-200/90 p-5 shadow-[0_2px_10px_rgba(15,23,42,0.03)] flex flex-col justify-between transition-all duration-200 hover:border-slate-300 hover:shadow-[0_4px_16px_rgba(15,23,42,0.05)] ${
        onClick ? 'cursor-pointer' : ''
      } ${className}`}
    >
      <div className="flex items-center gap-2.5">
        <div
          className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border ${iconBg}`}
        >
          <Icon className={`w-4 h-4 ${iconColor}`} />
        </div>
        <span className="text-xs font-bold text-slate-800 tracking-tight">{title}</span>
      </div>

      <div className="mt-4">
        <span className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight block leading-none">
          {value}
        </span>

        {supportingText ? (
          <div className="mt-2 flex items-center gap-1.5 text-xs flex-wrap font-medium">
            {supportingText}
          </div>
        ) : trend ? (
          <div className="mt-2 flex items-center gap-1.5 text-xs flex-wrap">
            <span
              className={`font-black whitespace-nowrap ${
                trend.isPositive === false ? 'text-rose-500' : 'text-emerald-600'
              }`}
            >
              {trend.value}
            </span>
            {trend.label && (
              <span className="text-slate-500 font-medium whitespace-nowrap">
                • {trend.label}
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
