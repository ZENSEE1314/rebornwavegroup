import React, { useEffect, useRef } from 'react';

interface AnimatedProgressBarProps {
  value: number;
  label: string;
  icon: string;
  color: string;
  petId: number;
  statType: string;
}

export const AnimatedProgressBar: React.FC<AnimatedProgressBarProps> = ({ 
  value, 
  label, 
  icon, 
  color, 
  petId, 
  statType 
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const valueRef = useRef<HTMLSpanElement>(null);
  
  // Force immediate DOM update with direct manipulation
  useEffect(() => {
    if (progressRef.current && valueRef.current) {
      // Immediately update width and text
      progressRef.current.style.width = `${value}%`;
      progressRef.current.style.backgroundColor = color;
      valueRef.current.textContent = `${value}%`;
      
      // Force repaint
      progressRef.current.offsetHeight;
      
      // Add animation class to trigger visual change
      progressRef.current.classList.remove('animate-pulse');
      progressRef.current.offsetHeight; // Force reflow
      progressRef.current.classList.add('animate-pulse');
      
      // Remove animation after completion
      setTimeout(() => {
        if (progressRef.current) {
          progressRef.current.classList.remove('animate-pulse');
        }
      }, 500);
    }
  }, [value, color]);
  
  return (
    <div className="space-y-2" ref={containerRef}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg">{icon}</span>
          <span className="text-sm font-medium">{label}</span>
        </div>
        <span 
          className="text-lg font-bold" 
          style={{ color }}
          ref={valueRef}
        >
          {value}%
        </span>
      </div>
      <div className="relative h-6 bg-gray-200 rounded-full overflow-hidden">
        <div 
          ref={progressRef}
          className="h-full rounded-full transition-all duration-300"
          style={{ 
            backgroundColor: color,
            width: `${value}%`
          }}
          data-stat={`${statType}-${petId}`}
        />
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <span className="text-xs font-bold text-white drop-shadow-lg">
            {icon} {value}/100
          </span>
        </div>
      </div>
    </div>
  );
};