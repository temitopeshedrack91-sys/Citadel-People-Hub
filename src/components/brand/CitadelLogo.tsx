import React from 'react';

export interface CitadelLogoProps {
  /**
   * 'full': Official logo with mark + "THE CITADEL GLOBAL COMMUNITY CHURCH"
   * 'hub': Official mark + "THE CITADEL" / "PEOPLE HUB" (PCCM Platform)
   * 'mark': Emblem only (Golden Frame with Star & Citadel Towers)
   */
  variant?: 'full' | 'hub' | 'mark';
  /**
   * 'dark': When placed on deep navy, green or dark background (towers white, frame gold)
   * 'light': When placed on white or light background (towers black, frame gold)
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
  /**
   * Optional flag to render the exact uploaded bitmap file (/citadel-logo.png)
   */
  useImage?: boolean;
}

export const CitadelLogo: React.FC<CitadelLogoProps> = ({
  variant = 'full',
  colorMode = 'dark',
  className = 'h-9',
  height,
  useImage = false,
}) => {
  const isDark = colorMode === 'dark';
  const textColor = isDark ? '#FFFFFF' : '#0F172A';
  const towerColor = isDark ? '#FFFFFF' : '#000000';
  const goldColor = '#D4AF37'; // Official Citadel Classic Gold

  // Direct bitmap image option
  if (useImage) {
    return (
      <img
        src="/citadel-logo.png"
        alt="The Citadel Global Community Church"
        className={`inline-block shrink-0 object-contain ${className}`}
        style={height ? { height: `${height}px`, width: 'auto' } : undefined}
      />
    );
  }

  // Vector Emblem Mark for dark background
  const VectorEmblem = (
    <svg
      viewBox="0 0 136 136"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`inline-block shrink-0 ${variant === 'mark' ? className : 'h-full w-auto'}`}
      style={variant === 'mark' && height ? { height: `${height}px`, width: 'auto' } : undefined}
      aria-label="Citadel Official Emblem"
    >
      {/* Outer Gold Frame with precise diagonal right cutout and bottom gap */}
      <path
        d="M 0,0 L 136,0 L 136,71.5 L 123,63 L 123,13 L 13,13 L 13,123 L 60,123 L 60,136 L 0,136 Z"
        fill={goldColor}
      />

      {/* 5-pointed Gold Star in top-left quadrant */}
      <polygon
        points="37.5,23.5 41.5,33.5 51.5,34.5 43,39.5 46.5,50.5 37.5,43.5 28.5,50.5 32,39.5 23.5,34.5 33.5,33.5"
        fill={goldColor}
      />

      {/* Shorter Tower (Left, width 26, roof slopes upward from 88 to 78) */}
      <polygon points="69,136 69,88 95,78 95,136" fill={towerColor} />

      {/* Taller Tower (Right, width 33, peak at 61, roof slopes downward to 83) */}
      <polygon points="103,136 103,61 136,83 136,136" fill={towerColor} />
    </svg>
  );

  // For light backgrounds (white background), use the official citadel-logo.png bitmap
  const LightEmblem = (
    <img
      src="/citadel-logo.png"
      alt="The Citadel Global Community Church"
      className={`inline-block shrink-0 object-contain ${variant === 'mark' ? className : 'h-full w-auto'}`}
      style={variant === 'mark' && height ? { height: `${height}px`, width: 'auto' } : undefined}
    />
  );

  const EmblemMark = isDark ? VectorEmblem : LightEmblem;

  if (variant === 'mark') {
    return EmblemMark;
  }

  if (variant === 'hub') {
    return (
      <div
        className={`flex items-center gap-3 shrink-0 select-none ${className}`}
        style={height ? { height: `${height}px` } : undefined}
      >
        {EmblemMark}

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
                backgroundColor: isDark ? 'rgba(212, 175, 55, 0.2)' : 'rgba(212, 175, 55, 0.25)',
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
      {EmblemMark}

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
