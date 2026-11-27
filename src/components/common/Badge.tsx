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
    default: 'bg-[#F5F7FA] text-[#111827] border-[#E5E7EB]',
    citadel: 'bg-[#174EA6]/10 text-[#174EA6] border-[#174EA6]/20',
    gold: 'bg-[#FAF5EB] text-[#B88A24] border-[#D4AF37]/40',
    success: 'bg-[#EFF6FF] text-[#174EA6] border-[#BFDBFE]',
    warning: 'bg-[#FAF5EB] text-[#B88A24] border-[#E9D59A]',
    danger: 'bg-[#F5F7FA] text-[#111827] border-[#111827]/35',
    info: 'bg-[#EFF6FF] text-[#0B1F3A] border-[#BFDBFE]',
    neutral: 'bg-[#F5F7FA] text-[#64748B] border-[#E5E7EB]',
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
