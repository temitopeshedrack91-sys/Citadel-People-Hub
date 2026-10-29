import React from 'react';
import { Check } from 'lucide-react';

export interface StepItem {
  id: string | number;
  title: string;
  subtitle?: string;
  isCompleted?: boolean;
}

export interface ChevronStepperProps {
  steps: StepItem[];
  currentStep: number; // 1-based index
  onStepClick?: (stepIndex: number) => void;
  variant?: 'compact' | 'detailed' | 'numbered';
  className?: string;
}

export const ChevronStepper: React.FC<ChevronStepperProps> = ({
  steps,
  currentStep,
  onStepClick,
  variant = 'numbered',
  className = '',
}) => {
  return (
    <nav
      aria-label="Progress Stepper"
      className={`w-full overflow-x-auto no-scrollbar py-1 ${className}`}
    >
      <div className="flex items-stretch gap-1 min-w-[540px] sm:min-w-0">
        {steps.map((step, index) => {
          const stepNumber = index + 1;
          const isActive = stepNumber === currentStep;
          const isCompleted = stepNumber < currentStep || step.isCompleted;
          const isFirst = index === 0;
          const isLast = index === steps.length - 1;
          const isClickable = !!onStepClick && (isCompleted || isActive);

          // SVG chevron clip-path polygons
          // Arrow point extends 14px to the right; notch indents 14px on the left
          let clipStyle: React.CSSProperties = {};
          if (isFirst) {
            clipStyle = {
              clipPath: 'polygon(0% 0%, calc(100% - 14px) 0%, 100% 50%, calc(100% - 14px) 100%, 0% 100%)',
            };
          } else if (isLast) {
            clipStyle = {
              clipPath: 'polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%, 14px 50%)',
            };
          } else {
            clipStyle = {
              clipPath: 'polygon(0% 0%, calc(100% - 14px) 0%, 100% 50%, calc(100% - 14px) 100%, 0% 100%, 14px 50%)',
            };
          }

          // Active vs Completed vs Inactive styling
          let stepBg = 'bg-slate-100 text-slate-500 hover:bg-slate-200/80';
          let circleBg = 'bg-slate-200 text-slate-600 border border-slate-300';
          let titleColor = 'text-slate-600';
          let subtitleColor = 'text-slate-400';

          if (isActive) {
            stepBg = 'bg-[#D4AF37] text-slate-950 shadow-sm';
            circleBg = 'bg-slate-950 text-[#D4AF37] font-black border border-slate-950';
            titleColor = 'text-slate-950 font-black';
            subtitleColor = 'text-slate-900 font-semibold';
          } else if (isCompleted) {
            stepBg = 'bg-[#D4AF37]/15 hover:bg-[#D4AF37]/25 text-slate-900';
            circleBg = 'bg-[#D4AF37] text-slate-950 font-bold border border-[#C59B27]';
            titleColor = 'text-slate-900 font-bold';
            subtitleColor = 'text-slate-600';
          }

          return (
            <button
              key={step.id}
              type="button"
              disabled={!isClickable}
              onClick={() => onStepClick && onStepClick(stepNumber)}
              style={clipStyle}
              className={`flex-1 transition-all duration-200 select-none text-left relative ${stepBg} ${
                variant === 'detailed' ? 'py-3 px-5' : 'py-2.5 px-4'
              } ${isClickable ? 'cursor-pointer active:scale-[0.99]' : 'cursor-default'}`}
              title={`Step ${stepNumber}: ${step.title}`}
            >
              <div
                className={`flex items-center gap-2.5 ${
                  !isFirst ? 'pl-2' : ''
                } ${!isLast ? 'pr-3' : ''}`}
              >
                {/* Circled Number / Check Icon */}
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-xs shrink-0 transition-colors ${circleBg}`}
                >
                  {isCompleted && !isActive ? (
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                  ) : (
                    <span>{stepNumber}</span>
                  )}
                </div>

                {/* Step Title & Optional Subtitle */}
                <div className="truncate min-w-0">
                  <div
                    className={`text-xs font-black truncate leading-tight ${titleColor}`}
                  >
                    {step.title}
                  </div>
                  {variant === 'detailed' && step.subtitle && (
                    <div
                      className={`text-[10px] font-medium truncate mt-0.5 ${subtitleColor}`}
                    >
                      {step.subtitle}
                    </div>
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

