import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { X, ArrowRight, ArrowLeft, Lightbulb } from 'lucide-react';
import { useTranslation } from '@/lib/i18n';

interface TooltipStep {
  id: string;
  element: string;
  title: string;
  content: string;
  position: 'top' | 'bottom' | 'left' | 'right';
  category: 'navigation' | 'feature' | 'action' | 'warning' | 'tip';
}

interface TooltipGuideProps {
  steps: TooltipStep[];
  isActive: boolean;
  onComplete: () => void;
  onSkip: () => void;
  characterImage?: string;
}

export function TooltipGuide({ 
  steps, 
  isActive, 
  onComplete, 
  onSkip,
  characterImage = "/attached_assets/Doluruu%20Grandpa_1749664964060.png"
}: TooltipGuideProps) {
  const { t } = useTranslation();
  const [currentStep, setCurrentStep] = useState(0);
  const [highlightedElement, setHighlightedElement] = useState<HTMLElement | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    if (!isActive || steps.length === 0) return;

    const targetElement = document.querySelector(steps[currentStep].element) as HTMLElement;
    if (targetElement) {
      setHighlightedElement(targetElement);
      
      // Calculate tooltip position
      const rect = targetElement.getBoundingClientRect();
      const step = steps[currentStep];
      
      let x = 0, y = 0;
      
      switch (step.position) {
        case 'top':
          x = rect.left + rect.width / 2 - 200; // Center horizontally
          y = rect.top - 220; // Above element
          break;
        case 'bottom':
          x = rect.left + rect.width / 2 - 200;
          y = rect.bottom + 20;
          break;
        case 'left':
          x = rect.left - 420;
          y = rect.top + rect.height / 2 - 100;
          break;
        case 'right':
          x = rect.right + 20;
          y = rect.top + rect.height / 2 - 100;
          break;
      }
      
      // Ensure tooltip stays within viewport
      x = Math.max(20, Math.min(x, window.innerWidth - 420));
      y = Math.max(20, Math.min(y, window.innerHeight - 200));
      
      setTooltipPosition({ x, y });
      
      // Add highlight effect
      targetElement.style.position = 'relative';
      targetElement.style.zIndex = '9999';
      targetElement.style.boxShadow = '0 0 0 4px rgba(59, 130, 246, 0.5), 0 0 20px rgba(59, 130, 246, 0.3)';
      targetElement.style.borderRadius = '8px';
      targetElement.style.transition = 'all 0.3s ease';
    }

    return () => {
      if (targetElement) {
        targetElement.style.position = '';
        targetElement.style.zIndex = '';
        targetElement.style.boxShadow = '';
        targetElement.style.borderRadius = '';
        targetElement.style.transition = '';
      }
    };
  }, [currentStep, isActive, steps]);

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onComplete();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'navigation': return 'bg-blue-500';
      case 'feature': return 'bg-purple-500';
      case 'action': return 'bg-green-500';
      case 'warning': return 'bg-yellow-500';
      case 'tip': return 'bg-pink-500';
      default: return 'bg-blue-500';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'navigation': return '🧭';
      case 'feature': return '✨';
      case 'action': return '🎯';
      case 'warning': return '⚠️';
      case 'tip': return '💡';
      default: return '💫';
    }
  };

  if (!isActive || steps.length === 0) return null;

  const currentStepData = steps[currentStep];

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 bg-black bg-opacity-50 z-[9998]" />
      
      {/* Tooltip */}
      <div 
        className="fixed z-[9999] w-96"
        style={{ 
          left: `${tooltipPosition.x}px`, 
          top: `${tooltipPosition.y}px`,
          transform: 'translateZ(0)' // Force hardware acceleration
        }}
      >
        <Card className="bg-white dark:bg-gray-800 shadow-2xl border-2 border-blue-400 animate-fadeInUp">
          <CardContent className="p-0">
            {/* Header with character */}
            <div className="flex items-center p-4 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-t-lg">
              <div className="w-12 h-12 rounded-full bg-white p-1 mr-3">
                <img 
                  src={characterImage} 
                  alt="Doluruu Grandpa Guide"
                  className="w-full h-full object-cover rounded-full"
                />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-lg font-bold">Doluruu Grandpa</span>
                  <span className={`px-2 py-1 rounded-full text-xs ${getCategoryColor(currentStepData.category)} text-white`}>
                    {getCategoryIcon(currentStepData.category)} {t(`tooltip.${currentStepData.category}`)}
                  </span>
                </div>
                <div className="text-sm opacity-90">
                  {t('tooltip.guiding')} • {currentStep + 1}/{steps.length}
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={onSkip}
                className="text-white hover:bg-white hover:bg-opacity-20"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            {/* Content */}
            <div className="p-4">
              <h3 className="font-bold text-lg mb-2 text-gray-800 dark:text-gray-200">
                {t(currentStepData.title)}
              </h3>
              <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
                {t(currentStepData.content)}
              </p>

              {/* Progress indicator */}
              <div className="mb-4">
                <div className="flex justify-between text-sm text-gray-500 mb-1">
                  <span>{t('tooltip.progress')}</span>
                  <span>{currentStep + 1} / {steps.length}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-gradient-to-r from-blue-500 to-purple-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
                  />
                </div>
              </div>

              {/* Navigation buttons */}
              <div className="flex justify-between">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePrevious}
                  disabled={currentStep === 0}
                  className="flex items-center gap-2"
                >
                  <ArrowLeft className="w-4 h-4" />
                  {t('tooltip.previous')}
                </Button>
                
                <Button
                  onClick={handleNext}
                  size="sm"
                  className="flex items-center gap-2 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
                >
                  {currentStep === steps.length - 1 ? t('tooltip.finish') : t('tooltip.next')}
                  {currentStep === steps.length - 1 ? (
                    <Lightbulb className="w-4 h-4" />
                  ) : (
                    <ArrowRight className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Arrow pointer */}
        <div 
          className={`absolute w-0 h-0 ${
            currentStepData.position === 'top' ? 'border-l-8 border-r-8 border-t-8 border-transparent border-t-blue-400 top-full left-1/2 transform -translate-x-1/2' :
            currentStepData.position === 'bottom' ? 'border-l-8 border-r-8 border-b-8 border-transparent border-b-blue-400 bottom-full left-1/2 transform -translate-x-1/2' :
            currentStepData.position === 'left' ? 'border-t-8 border-b-8 border-l-8 border-transparent border-l-blue-400 left-full top-1/2 transform -translate-y-1/2' :
            'border-t-8 border-b-8 border-r-8 border-transparent border-r-blue-400 right-full top-1/2 transform -translate-y-1/2'
          }`}
        />
      </div>
    </>
  );
}

// Hook for managing tooltip guide state
export function useTooltipGuide() {
  const [activeGuide, setActiveGuide] = useState<string | null>(null);
  const [completedGuides, setCompletedGuides] = useState<string[]>([]);

  useEffect(() => {
    const completed = JSON.parse(localStorage.getItem('completedTooltipGuides') || '[]');
    setCompletedGuides(completed);
  }, []);

  const startGuide = (guideId: string) => {
    if (!completedGuides.includes(guideId)) {
      setActiveGuide(guideId);
    }
  };

  const completeGuide = (guideId: string) => {
    const updated = [...completedGuides, guideId];
    setCompletedGuides(updated);
    localStorage.setItem('completedTooltipGuides', JSON.stringify(updated));
    setActiveGuide(null);
  };

  const skipGuide = () => {
    setActiveGuide(null);
  };

  const resetGuide = (guideId: string) => {
    const updated = completedGuides.filter(id => id !== guideId);
    setCompletedGuides(updated);
    localStorage.setItem('completedTooltipGuides', JSON.stringify(updated));
  };

  return {
    activeGuide,
    completedGuides,
    startGuide,
    completeGuide,
    skipGuide,
    resetGuide
  };
}