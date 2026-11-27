import React from 'react';

export interface BadgeProps {
  id?: string;
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'citadel' | 'neutral' | 'gold';
  children: React.ReactNode;
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  id,
  variant = 'default',
  children,
  className = '',
}) => {
  const variantStyles = {
    default: 'bg-slate-100/80 text-slate-700 border-slate-200/80',
    citadel: 'bg-[#083E34]/8 text-[#083E34] border-[#083E34]/15',
    gold: 'bg-[#FAF5EB] text-[#B45309] border-[#F2E4B8]/80',
    success: 'bg-emerald-50/90 text-emerald-700 border-emerald-200/80',
    warning: 'bg-[#FFFBEB] text-[#B45309] border-[#FDE68A]/80',
    danger: 'bg-rose-50/90 text-rose-700 border-rose-200/80',
    info: 'bg-sky-50/90 text-sky-700 border-sky-200/80',
    neutral: 'bg-slate-100/80 text-slate-600 border-slate-200/80',
  };

  return (
    <span
      id={id}
      className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold border whitespace-nowrap ${variantStyles[variant]} ${className}`}
    >
      {children}
    </span>
  );
};
