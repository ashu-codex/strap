'use client';

import React from 'react';

interface BrandLogoProps {
  size?: 'sm' | 'md' | 'lg';
  showTagline?: boolean;
  className?: string;
}

export function BrandLogo({
  size = 'md',
  showTagline = true,
  className = '',
}: BrandLogoProps) {
  const markSize = {
    sm: 'h-7 w-7 text-sm',
    md: 'h-8 w-8 sm:h-9 sm:w-9 text-base sm:text-lg',
    lg: 'h-12 w-12 text-2xl',
  }[size];

  const textSize = {
    sm: 'text-sm',
    md: 'text-[15px] sm:text-lg',
    lg: 'text-2xl',
  }[size];

  return (
    <div className={`flex items-center gap-1.5 sm:gap-2.5 select-none shrink-0 ${className}`}>
      {/* S Brand Mark - Solid Lime Background with Dark Charcoal Letter */}
      <div
        className={`flex ${markSize} items-center justify-center rounded-[10px] bg-[#B7F34A] text-[#111318] font-black tracking-tight shadow-[0_0_20px_-3px_rgba(183,243,74,0.4)] shrink-0 transition-transform hover:scale-105`}
        style={{ opacity: 1, filter: 'none', mixBlendMode: 'normal' }}
      >
        S
      </div>

      {/* Brand Text */}
      <div className="flex flex-col justify-center leading-none shrink-0">
        <div className="flex items-center gap-1.5">
          <span
            className={`font-black tracking-wide sm:tracking-wider whitespace-nowrap ${textSize} text-[#111318] dark:text-[#FFFFFF]`}
            style={{ opacity: 1, filter: 'none', mixBlendMode: 'normal' }}
          >
            STRAP
          </span>
        </div>

        {showTagline && (
          <span className="hidden sm:inline-block text-[9px] uppercase tracking-wider text-[#52525B] dark:text-[#9496A1] font-semibold mt-0.5">
            Train • Recover • Progress
          </span>
        )}
      </div>
    </div>
  );
}

export default BrandLogo;
