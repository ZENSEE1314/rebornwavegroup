import React from 'react';

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
  const uniqueKey = `${statType}-${petId}-${value}-${Date.now()}`;
  
  return (
    <div className="space-y-2" key={uniqueKey}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg">{icon}</span>
          <span className="text-sm font-medium">{label}</span>
        </div>
        <span className="text-lg font-bold" style={{ color }}>
          {value}%
        </span>
      </div>
      <div className="relative h-6 bg-gray-200 rounded-full overflow-hidden">
        <div 
          className={`h-full rounded-full progress-bar-animated`}
          style={{ 
            backgroundColor: color,
            width: `${value}%`,
            animationName: `fill-${value}`,
            animationDuration: '0.8s',
            animationTimingFunction: 'ease-out',
            animationFillMode: 'forwards'
          }}
          data-stat={`${statType}-${petId}`}
          key={`bar-${uniqueKey}`}
        />
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-xs font-bold text-white drop-shadow-lg">
            {icon} {value}/100
          </span>
        </div>
      </div>
    </div>
  );
};