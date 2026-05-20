import React from 'react';
import { cn } from '../lib/utils';
import { User } from 'lucide-react';

interface GenderAvatarProps {
  gender?: string | null;
  className?: string; // tailwind classes for size and colors
}

// Female SVG icon (simplified professional female silhouette)
export const FemaleIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
    <circle cx="12" cy="7" r="4.5" />
    <path d="M12 12.5 C 7.5 12.5 3 15 3 22 h18 c 0 -7 -4.5 -9.5 -9 -9.5 z" />
  </svg>
);

// Male SVG icon (simplified professional male silhouette)
export const MaleIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
    <circle cx="12" cy="7" r="4.5" />
    <path d="M12 12.5 C 7.5 12.5 4 15.5 4 22 h16 c 0 -6.5 -3.5 -9.5 -8 -9.5 z" />
  </svg>
);

export function GenderAvatar({ gender, className }: GenderAvatarProps) {
  const g = gender?.toUpperCase() || '';
  
  if (g === 'MASCULINO') {
    return (
      <div className={cn("flex flex-shrink-0 items-center justify-center bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400 rounded-full", className)}>
        <MaleIcon className="w-2/3 h-2/3" />
      </div>
    );
  }
  
  if (g === 'FEMENINO') {
    return (
      <div className={cn("flex flex-shrink-0 items-center justify-center bg-pink-100 text-pink-600 dark:bg-pink-900/40 dark:text-pink-400 rounded-full", className)}>
        <FemaleIcon className="w-2/3 h-2/3" />
      </div>
    );
  }

  // Default generic user
  return (
    <div className={cn("flex flex-shrink-0 items-center justify-center bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 rounded-full", className)}>
      <User className="w-2/3 h-2/3" fill="currentColor" />
    </div>
  );
}
