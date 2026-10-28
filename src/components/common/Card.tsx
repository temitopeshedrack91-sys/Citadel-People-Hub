import React from 'react';
import { LucideIcon } from 'lucide-react';

export interface CardProps {
  id?: string;
  title?: string;
  subtitle?: string;
  icon?: LucideIcon;
  iconColor?: string;
  headerAction?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  bodyClassName?: string;
  dataTestId?: string;
  noPadding?: boolean;
}

/**
 * Reusable Card component enforcing visual language from reference images:
 * - White surface with 20px rounded corners (rounded-2xl)
 * - Soft separation border & subtle shadow
 * - Clean header typography with optional monochrome icon & action link
 */
export const Card: React.FC<CardProps> = ({
  id,
  title,
  subtitle,
  icon: Icon,
  iconColor = 'text-slate-800',
  headerAction,
  children,
  className = '',
  bodyClassName = '',
  dataTestId,
  noPadding = false,
}) => {
  return (
    <div
      id={id}
      data-testid={dataTestId || (title ? `card-${title.toLowerCase().replace(/\s+/g, '-')}` : 'card')}
      className={`bg-white rounded-2xl border border-slate-200/90 shadow-[0_2px_10px_rgba(15,23,42,0.03)] transition-all duration-200 hover:border-slate-300 ${className}`}
    >
      {(title || headerAction) && (
        <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            {Icon && <Icon className={`w-4 h-4 shrink-0 ${iconColor}`} />}
            <div>
              {title && (
                <h3 className="text-sm font-bold text-slate-900 tracking-tight">
                  {title}
                </h3>
              )}
              {subtitle && (
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  {subtitle}
                </p>
              )}
            </div>
          </div>
          {headerAction && <div>{headerAction}</div>}
        </div>
      )}

      <div className={`${noPadding ? '' : 'p-5'} ${bodyClassName}`}>{children}</div>
    </div>
  );
};

export default Card;
