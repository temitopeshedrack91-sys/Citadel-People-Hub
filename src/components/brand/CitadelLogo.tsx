import React from 'react';

export interface CitadelLogoProps {
  /**
   * 'full': Official logo with mark + "THE CITADEL GLOBAL COMMUNITY CHURCH"
   * 'hub': Official mark + "THE CITADEL" / "PEOPLE HUB" (PCCM Platform)
   * 'mark': Emblem only (Golden Frame with Star & Citadel Towers)
   */
  variant?: 'full' | 'hub' | 'mark';
  /**
   * 'dark': When placed on deep navy or dark background (text & towers white, frame gold)
   * 'light': When placed on white or light background (text & towers black, frame gold)
   */
  colorMode?: 'dark' | 'light';
  /**
   * Height in pixels or Tailwind classes (e.g. "h-8", "h-10", "h-12")
   */
  className?: string;
  /**
   * Optional inline height for quick sizing
   */
  height?: number;
}

export const CitadelLogo: React.FC<CitadelLogoProps> = ({
  variant = 'full',
  colorMode = 'dark',
  className = 'h-9',
  height,
}) => {
  const isDark = colorMode === 'dark';
  const textColor = isDark ? '#FFFFFF' : '#0F172A';
  const towerColor = isDark ? '#FFFFFF' : '#0A0A0A';
  const goldColor = '#C59B27'; // Official Citadel Gold

  if (variant === 'mark') {
    return (
      <svg
        viewBox="0 0 120 120"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={`inline-block shrink-0 ${className}`}
        style={height ? { height: `${height}px`, width: 'auto' } : undefined}
        aria-label="Citadel Official Emblem"
      >
        {/* Outer Gold Square Frame */}
        <rect
          x="10"
          y="10"
          width="100"
          height="100"
          stroke={goldColor}
          strokeWidth="13"
          fill="none"
          rx="2"
        />

        {/* 5-pointed Gold Star in top-left quadrant */}
        <path
          d="M 38 23 
             L 41.5 32.5 
             L 51.5 33 
             L 43.5 39.5 
             L 46.5 49.5 
             L 38 43.5 
             L 29.5 49.5 
             L 32.5 39.5 
             L 24.5 33 
             L 34.5 32.5 Z"
          fill={goldColor}
        />

        {/* Building Silhouette Towers */}
        {/* Shorter Tower */}
        <polygon points="56,114 56,66 70,58 78,63 78,114" fill={towerColor} />
        {/* Taller Tower with sharp diagonal slope */}
        <polygon points="76,114 76,46 114,64 114,114" fill={towerColor} />
      </svg>
    );
  }

  if (variant === 'hub') {
    return (
      <div
        className={`flex items-center gap-3 shrink-0 select-none ${className}`}
        style={height ? { height: `${height}px` } : undefined}
      >
        {/* Logo Mark */}
        <svg
          viewBox="0 0 120 120"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="h-full w-auto shrink-0"
          aria-hidden="true"
        >
          <rect
            x="10"
            y="10"
            width="100"
            height="100"
            stroke={goldColor}
            strokeWidth="13"
            fill="none"
            rx="2"
          />
          <path
            d="M 38 23 
               L 41.5 32.5 
               L 51.5 33 
               L 43.5 39.5 
               L 46.5 49.5 
               L 38 43.5 
               L 29.5 49.5 
               L 32.5 39.5 
               L 24.5 33 
               L 34.5 32.5 Z"
            fill={goldColor}
          />
          <polygon points="56,114 56,66 70,58 78,63 78,114" fill={towerColor} />
          <polygon points="76,114 76,46 114,64 114,114" fill={towerColor} />
        </svg>

        {/* Hub Typography */}
        <div className="flex flex-col justify-center leading-none">
          <div className="flex items-center gap-1.5">
            <span
              className="font-bold tracking-wider uppercase text-xs sm:text-sm font-sans"
              style={{ color: textColor }}
            >
              THE CITADEL
            </span>
            <span
              className="text-[10px] font-extrabold px-1.5 py-0.5 rounded tracking-widest uppercase font-mono"
              style={{
                backgroundColor: isDark ? 'rgba(197, 160, 89, 0.2)' : 'rgba(197, 160, 89, 0.25)',
                color: goldColor,
              }}
            >
              PEOPLE HUB
            </span>
          </div>
          <span
            className="text-[9px] sm:text-[10px] tracking-tight mt-1 font-medium"
            style={{ color: isDark ? '#94A3B8' : '#64748B' }}
          >
            People • Culture • Performance • Growth
          </span>
        </div>
      </div>
    );
  }

  // Official Full Logo ("THE CITADEL GLOBAL COMMUNITY CHURCH")
  return (
    <div
      className={`flex items-center gap-3 shrink-0 select-none ${className}`}
      style={height ? { height: `${height}px` } : undefined}
      aria-label="The Citadel Global Community Church"
    >
      {/* Official Emblem Mark */}
      <svg
        viewBox="0 0 120 120"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="h-full w-auto shrink-0"
      >
        <rect
          x="10"
          y="10"
          width="100"
          height="100"
          stroke={goldColor}
          strokeWidth="13"
          fill="none"
          rx="2"
        />
        <path
          d="M 38 23 
             L 41.5 32.5 
             L 51.5 33 
             L 43.5 39.5 
             L 46.5 49.5 
             L 38 43.5 
             L 29.5 49.5 
             L 32.5 39.5 
             L 24.5 33 
             L 34.5 32.5 Z"
          fill={goldColor}
        />
        <polygon points="56,114 56,66 70,58 78,63 78,114" fill={towerColor} />
        <polygon points="76,114 76,46 114,64 114,114" fill={towerColor} />
      </svg>

      {/* Official 3-line wordmark */}
      <div
        className="flex flex-col justify-between h-[85%] font-sans font-black leading-[1.05] tracking-tight"
        style={{ color: textColor }}
      >
        <span className="text-xs sm:text-sm tracking-wider font-extrabold">THE CITADEL</span>
        <span className="text-xs sm:text-sm tracking-tight font-extrabold">GLOBAL COMMUNITY</span>
        <span className="text-xs sm:text-sm tracking-widest font-extrabold">CHURCH</span>
      </div>
    </div>
  );
};
