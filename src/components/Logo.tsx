import React from 'react';
import { cn } from '../lib/utils';

interface LogoProps {
  className?: string;
  showText?: boolean;
}

export const Logo: React.FC<LogoProps> = ({ className, showText = true }) => {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <div className="relative w-10 h-10 shrink-0">
        <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
          {/* Head */}
          <circle cx="48" cy="22" r="10" fill="#084c94" />
          
          {/* Body/Torso (Blue) */}
          <path 
            d="M52 35C40 38 30 50 45 75C41 62 48 50 56 42C58 40 59 38 52 35Z" 
            fill="#084c94" 
          />
          <path 
            d="M48 45C42 55 45 75 48 85" 
            stroke="#084c94" 
            strokeWidth="4" 
            strokeLinecap="round"
          />

          {/* Spine Curve (Teal) */}
          <path 
            d="M62 18C75 40 55 60 55 90" 
            stroke="#00a88f" 
            strokeWidth="6" 
            strokeLinecap="round"
          />

          {/* Vertabrae Dots */}
          <circle cx="58" cy="38" r="3" fill="#084c94" />
          <circle cx="58" cy="48" r="3" fill="#00a88f" />
          <circle cx="57" cy="58" r="2.5" fill="#084c94" />
          <circle cx="55" cy="68" r="2" fill="#00a88f" />
        </svg>
      </div>
      {showText && (
        <div className="flex flex-col leading-none">
          <span className="text-xl font-black text-[#084c94] tracking-tight uppercase">Más Vida</span>
          <span className="text-[8px] font-bold text-[#00a88f] tracking-widest whitespace-nowrap">MEDICINA & REHABILITACIÓN FÍSICA</span>
        </div>
      )}
    </div>
  );
};
