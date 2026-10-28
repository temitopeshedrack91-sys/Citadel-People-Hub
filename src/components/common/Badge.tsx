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
    default: 'bg-slate-100 text-slate-700 border-slate-200',
    citadel: 'bg-[#083E34]/10 text-[#083E34] border-[#083E34]/20 font-medium',
    gold: 'bg-[#FAF5EB] text-[#D97706] border-[#F2E4B8] font-semibold',
    success: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    warning: 'bg-[#FAF5EB] text-[#D97706] border-[#F2E4B8]',
    danger: 'bg-rose-50 text-rose-700 border-rose-200',
    info: 'bg-sky-50 text-sky-700 border-sky-200',
    neutral: 'bg-slate-100 text-slate-600 border-slate-200',
  };

  return (
    <span
      id={id}
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border whitespace-nowrap ${variantStyles[variant]} ${className}`}
    >
      {children}
    </span>
  );
};
