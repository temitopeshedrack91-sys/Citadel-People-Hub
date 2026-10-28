import React from 'react';

export interface ProgressRingProps {
  value: number; // e.g. 65 for 65%
  max?: number;  // default 100
  label?: string; // custom centered label, default `${value}%`
  subtext?: string; // e.g. "13 out of 20"
  type?: 'semicircle' | 'circle';
  strokeColor?: string; // default dark green #083E34
  trackColor?: string;  // default soft grey #EAEFF5
  strokeWidth?: number; // default 13
  className?: string;
  dataTestId?: string;
}

/**
 * Reusable ProgressRing / Semicircular Gauge matching the Leave Balance component:
 * - Clean SVG arc with rounded end caps
 * - Primary action Dark Green stroke (#083E34)
 * - Large bold percentage value centered inside
 * - Supporting ratio text underneath (e.g. "13 out of 20")
 */
export const ProgressRing: React.FC<ProgressRingProps> = ({
  value,
  max = 100,
  label,
  subtext,
  type = 'semicircle',
  strokeColor = '#083E34',
  trackColor = '#EAEFF5',
  strokeWidth = 13,
  className = '',
  dataTestId,
}) => {
  const percentage = Math.min(100, Math.max(0, (value / max) * 100));
  const displayLabel = label ?? `${Math.round(percentage)}%`;

  if (type === 'circle') {
    const size = 120;
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (percentage / 100) * circumference;

    return (
      <div
        data-testid={dataTestId || 'progress-ring-circle'}
        className={`relative inline-flex items-center justify-center ${className}`}
      >
        <svg width={size} height={size} className="transform -rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={trackColor}
            strokeWidth={strokeWidth}
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={strokeColor}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            className="transition-all duration-700 ease-out"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="text-xl font-black text-slate-900 tracking-tight">
            {displayLabel}
          </span>
          {subtext && (
            <span className="text-[11px] font-bold text-slate-500 mt-0.5">
              {subtext}
            </span>
          )}
        </div>
      </div>
    );
  }

  // Semicircle gauge matching Hrivio Leave Balance reference
  // Radius = 68, Arc length = PI * 68 = ~213.63
  const arcLength = Math.PI * 68;
  const strokeDashoffset = arcLength - (percentage / 100) * arcLength;

  return (
    <div
      data-testid={dataTestId || 'progress-ring-semicircle'}
      className={`relative flex flex-col items-center justify-center ${className}`}
    >
      <div className="w-full max-w-[210px] h-28 flex items-center justify-center">
        <svg
          viewBox="0 0 180 105"
          className="w-full h-full overflow-visible"
          role="img"
          aria-label={`Progress: ${displayLabel}`}
        >
          {/* Background Track Arc */}
          <path
            d="M 22 92 A 68 68 0 0 1 158 92"
            fill="none"
            stroke={trackColor}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
          />
          {/* Active Progress Arc */}
          <path
            d="M 22 92 A 68 68 0 0 1 158 92"
            fill="none"
            stroke={strokeColor}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={arcLength}
            strokeDashoffset={strokeDashoffset}
            className="transition-all duration-700 ease-out"
          />
          {/* Centered Percentage Value */}
          <text
            x="90"
            y="68"
            textAnchor="middle"
            className="text-2xl font-black fill-slate-900"
            style={{ fontWeight: 900, fontSize: '24px' }}
          >
            {displayLabel}
          </text>
          {/* Supporting Ratio Subtext */}
          {subtext && (
            <text
              x="90"
              y="86"
              textAnchor="middle"
              className="text-xs font-bold fill-slate-500"
              style={{ fontWeight: 700, fontSize: '11px' }}
            >
              {subtext}
            </text>
          )}
        </svg>
      </div>
    </div>
  );
};

export default ProgressRing;
