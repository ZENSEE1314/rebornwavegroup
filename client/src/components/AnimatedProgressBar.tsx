import React, { useEffect, useRef, useState } from 'react';

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
  const progressRef = useRef<HTMLDivElement>(null);
  const [displayValue, setDisplayValue] = useState(value);
  const [uniqueKey, setUniqueKey] = useState(Date.now());
  
  // Force immediate visual update when value changes
  useEffect(() => {
    setDisplayValue(value);
    setUniqueKey(Date.now());
    
    // Aggressive DOM manipulation
    setTimeout(() => {
      if (progressRef.current) {
        // Reset to 0 first
        progressRef.current.style.width = '0%';
        progressRef.current.style.transition = 'none';
        progressRef.current.offsetHeight; // Force reflow
        
        // Then animate to target value
        progressRef.current.style.transition = 'width 0.6s ease-out';
        progressRef.current.style.width = `${value}%`;
        progressRef.current.style.backgroundColor = color;
        
        // Force repaint with multiple reflows
        progressRef.current.offsetHeight;
        progressRef.current.style.transform = 'translateZ(0)';
        progressRef.current.offsetHeight;
        progressRef.current.style.transform = '';
        
        // Add visual feedback
        progressRef.current.classList.add('animate-pulse');
        setTimeout(() => {
          if (progressRef.current) {
            progressRef.current.classList.remove('animate-pulse');
          }
        }, 600);
      }
    }, 10);
  }, [value, color]);
  
  // Completely rebuild component when value changes
  return (
    <div className="space-y-2" key={`progress-${petId}-${statType}-${uniqueKey}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg">{icon}</span>
          <span className="text-sm font-medium">{label}</span>
        </div>
        <span 
          className="text-lg font-bold" 
          style={{ color }}
          key={`value-${uniqueKey}`}
        >
          {displayValue}%
        </span>
      </div>
      <div className="relative h-6 bg-gray-200 rounded-full overflow-hidden">
        <div 
          ref={progressRef}
          className="h-full rounded-full"
          style={{ 
            backgroundColor: color,
            width: `${displayValue}%`,
            transition: 'width 0.6s ease-out'
          }}
          data-stat={`${statType}-${petId}`}
          key={`bar-${uniqueKey}`}
        />
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <span className="text-xs font-bold text-white drop-shadow-lg">
            {icon} {displayValue}/100
          </span>
        </div>
      </div>
    </div>
  );
};