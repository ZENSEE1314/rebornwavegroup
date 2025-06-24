import React, { useState, useEffect } from 'react';
import { X, ArrowRight, ArrowLeft, Star, Gift, DollarSign, Heart, Sparkles, ChevronDown, ChevronUp, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useTranslation } from '@/lib/i18n';
import petGuideImage from '@assets/Doluruu Grandpa_1749903476706.png';

// Finger Pointer Component with Bubble Text
interface FingerPointerProps {
  targetElement: string;
  position: string;
  bubbleText: string;
}

function FingerPointer({ targetElement, position, bubbleText }: FingerPointerProps) {
  const [pointerPosition, setPointerPosition] = useState({ top: 0, left: 0 });

  useEffect(() => {
    const updatePosition = () => {
      const element = document.querySelector(targetElement);
      if (element) {
        const rect = element.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        
        let fingerX = centerX;
        let fingerY = centerY;
        
        // Adjust position based on direction
        switch (position) {
          case 'top':
            fingerY = rect.top - 60;
            break;
          case 'bottom':
            fingerY = rect.bottom + 60;
            break;
          case 'left':
            fingerX = rect.left - 60;
            break;
          case 'right':
            fingerX = rect.right + 60;
            break;
        }
        
        setPointerPosition({ top: fingerY, left: fingerX });
      }
    };

    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition);
    
    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition);
    };
  }, [targetElement, position]);

  const getFingerDirection = () => {
    switch (position) {
      case 'top':
        return 'rotate-180';
      case 'bottom':
        return 'rotate-0';
      case 'left':
        return 'rotate-90';
      case 'right':
        return '-rotate-90';
      default:
        return 'rotate-0';
    }
  };

  const getBubblePosition = () => {
    switch (position) {
      case 'top':
        return 'bottom-full mb-2';
      case 'bottom':
        return 'top-full mt-2';
      case 'left':
        return 'right-full mr-2';
      case 'right':
        return 'left-full ml-2';
      default:
        return 'top-full mt-2';
    }
  };

  return (
    <div 
      className="fixed z-45 pointer-events-none"
      style={{ 
        top: pointerPosition.top, 
        left: pointerPosition.left, 
        transform: 'translate(-50%, -50%)' 
      }}
    >
      <div className="relative flex items-center justify-center">
        {/* Finger pointing animation */}
        <div className={`text-6xl ${getFingerDirection()} animate-bounce`}>
          👆
        </div>
        
        {/* Bubble text */}
        <div className={`absolute ${getBubblePosition()} z-50`}>
          <div className="bg-white border-2 border-yellow-400 rounded-lg px-3 py-2 shadow-lg max-w-xs sm:max-w-sm whitespace-nowrap">
            <div className="text-sm font-medium text-gray-800 text-center">
              {bubbleText}
            </div>
            {/* Bubble arrow */}
            <div className={`absolute w-3 h-3 bg-white border-yellow-400 transform rotate-45 ${
              position === 'top' ? 'top-full left-1/2 -translate-x-1/2 -mt-1.5 border-b-2 border-r-2' :
              position === 'bottom' ? 'bottom-full left-1/2 -translate-x-1/2 -mb-1.5 border-t-2 border-l-2' :
              position === 'left' ? 'left-full top-1/2 -translate-y-1/2 -ml-1.5 border-t-2 border-r-2' :
              'right-full top-1/2 -translate-y-1/2 -mr-1.5 border-b-2 border-l-2'
            }`}></div>
          </div>
        </div>
        
        {/* Pulsing glow effect */}
        <div className="absolute -inset-4 bg-yellow-400 opacity-20 rounded-full animate-ping"></div>
      </div>
    </div>
  );
}

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  targetElement?: string;
  position: 'top' | 'bottom' | 'left' | 'right' | 'center';
  petMessage: string;
  petAnimation: 'idle' | 'excited' | 'pointing' | 'celebrating';
  bubbleText?: string;
}

interface OnboardingWalkthroughProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
}

export function OnboardingWalkthrough({ isOpen, onClose, onComplete }: OnboardingWalkthroughProps) {
  const { t } = useTranslation();
  const [currentStep, setCurrentStep] = useState(0);
  const [petVisible, setPetVisible] = useState(true);

  const onboardingSteps: OnboardingStep[] = [
    {
      id: 'welcome',
      title: t('onboarding.welcome.title'),
      description: t('onboarding.welcome.description'),
      position: 'center',
      petMessage: t('onboarding.welcome.petMessage'),
      petAnimation: 'excited'
    },
    {
      id: 'dashboard',
      title: t('onboarding.dashboard.title'),
      description: t('onboarding.dashboard.description'),
      targetElement: '.stats-grid',
      position: 'bottom',
      petMessage: t('onboarding.dashboard.petMessage'),
      petAnimation: 'pointing',
      bubbleText: 'Check your stats here!'
    },
    {
      id: 'credits',
      title: t('onboarding.credits.title'),
      description: t('onboarding.credits.description'),
      targetElement: '.credits-card',
      position: 'right',
      petMessage: t('onboarding.credits.petMessage'),
      petAnimation: 'excited',
      bubbleText: 'Your credits'
    },
    {
      id: 'loyalty',
      title: t('onboarding.loyalty.title'),
      description: t('onboarding.loyalty.description'),
      targetElement: '.loyalty-card',
      position: 'right',
      petMessage: t('onboarding.loyalty.petMessage'),
      petAnimation: 'pointing',
      bubbleText: 'Loyalty points'
    },
    {
      id: 'tokens',
      title: t('onboarding.tokens.title'),
      description: t('onboarding.tokens.description'),
      targetElement: '.tokens-card',
      position: 'right',
      petMessage: t('onboarding.tokens.petMessage'),
      petAnimation: 'excited',
      bubbleText: 'Game tokens'
    },
    {
      id: 'petcare-tab',
      title: t('onboarding.petcare.title'),
      description: t('onboarding.petcare.description'),
      targetElement: '[data-tab="petcare"]',
      position: 'bottom',
      petMessage: t('onboarding.petcare.petMessage'),
      petAnimation: 'pointing',
      bubbleText: 'Take care of pets'
    },
    {
      id: 'marketplace-tab',
      title: t('onboarding.marketplace.title'),
      description: t('onboarding.marketplace.description'),
      targetElement: '[data-tab="marketplace"]',
      position: 'bottom',
      petMessage: t('onboarding.marketplace.petMessage'),
      petAnimation: 'excited',
      bubbleText: 'Buy & sell toys'
    },
    {
      id: 'loyalty-tab',
      title: t('onboarding.loyaltyTab.title'),
      description: t('onboarding.loyaltyTab.description'),
      targetElement: '[data-tab="loyalty"]',
      position: 'bottom',
      petMessage: t('onboarding.loyaltyTab.petMessage'),
      petAnimation: 'celebrating',
      bubbleText: 'Earn rewards'
    },
    {
      id: 'complete',
      title: t('onboarding.complete.title'),
      description: t('onboarding.complete.description'),
      position: 'center',
      petMessage: t('onboarding.complete.petMessage'),
      petAnimation: 'celebrating'
    }
  ];

  const currentStepData = onboardingSteps[currentStep];

  useEffect(() => {
    if (isOpen && currentStepData.targetElement) {
      const element = document.querySelector(currentStepData.targetElement);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        // Add highlight effect
        element.classList.add('onboarding-highlight');
        // Add pulsing animation
        element.classList.add('animate-pulse');
        // Add special glow for tab elements
        if (currentStepData.targetElement.includes('data-tab')) {
          element.classList.add('onboarding-tab-highlight');
        }
        return () => {
          element.classList.remove('onboarding-highlight');
          element.classList.remove('animate-pulse');
          element.classList.remove('onboarding-tab-highlight');
        };
      }
    }
  }, [currentStep, isOpen, currentStepData.targetElement]);



  // Function to get modal position
  const getModalPosition = () => {
    if (currentStepData.position === 'center') {
      return 'items-center justify-center';
    }
    if (currentStepData.position === 'top') {
      return 'items-start justify-center pt-4';
    }
    if (currentStepData.position === 'bottom') {
      return 'items-end justify-center pb-4';
    }
    if (currentStepData.position === 'left') {
      return 'items-center justify-start pl-4';
    }
    if (currentStepData.position === 'right') {
      return 'items-center justify-end pr-4';
    }
    return 'items-center justify-center';
  };

  const nextStep = () => {
    if (currentStep < onboardingSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onComplete();
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const skipOnboarding = () => {
    onClose();
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Lighter Overlay */}
      <div className="fixed inset-0 bg-black bg-opacity-20 z-40" />
      
      {/* Virtual Pet Guide - Mobile Friendly */}
      {petVisible && (
        <div className="fixed bottom-4 right-4 z-50 max-w-xs sm:max-w-sm">
          <Card className="bg-gradient-to-br from-purple-100 to-pink-100 border-purple-200 shadow-lg">
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-start space-x-2 sm:space-x-3">
                <div className={`w-12 h-12 sm:w-16 sm:h-16 flex items-center justify-center flex-shrink-0 ${
                  currentStepData.petAnimation === 'excited' ? 'animate-bounce' :
                  currentStepData.petAnimation === 'pointing' ? 'animate-pulse' :
                  currentStepData.petAnimation === 'celebrating' ? 'animate-spin' : ''
                }`}>
                  <img 
                    src={petGuideImage} 
                    alt="Doluruu Grandpa Guide" 
                    className="w-full h-full object-contain"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="bg-white rounded-lg p-2 sm:p-3 shadow-sm">
                    <p className="text-xs sm:text-sm text-gray-700 leading-relaxed break-words">
                      {currentStepData.petMessage}
                    </p>
                  </div>
                  <div className="flex justify-end mt-1 sm:mt-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setPetVisible(false)}
                      className="text-purple-600 hover:text-purple-700 p-1"
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Dynamic Finger Pointer with Bubble */}
      {currentStepData.targetElement && currentStepData.position !== 'center' && currentStepData.bubbleText && (
        <FingerPointer 
          targetElement={currentStepData.targetElement}
          position={currentStepData.position}
          bubbleText={currentStepData.bubbleText}
        />
      )}

      {/* Onboarding Modal - Mobile Responsive */}
      <div className={`fixed inset-0 flex ${getModalPosition()} z-50 p-2 sm:p-4`}>
        <Card className="bg-white shadow-2xl max-w-sm sm:max-w-lg w-full animate-in fade-in-0 zoom-in-95 duration-300 max-h-[90vh] overflow-y-auto">
          <CardContent className="p-4 sm:p-6">
            <div className="flex justify-between items-start mb-3 sm:mb-4">
              <div className="flex items-center space-x-2 flex-1 min-w-0">
                <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-gradient-to-br from-blue-400 to-purple-400 flex items-center justify-center animate-pulse flex-shrink-0">
                  <Star className="w-3 h-3 sm:w-4 sm:h-4 text-white" />
                </div>
                <h2 className="text-lg sm:text-xl font-bold text-gray-900 truncate">{currentStepData.title}</h2>
              </div>
              <Button
                size="sm"
                variant="ghost"
                onClick={skipOnboarding}
                className="text-gray-400 hover:text-gray-600 flex-shrink-0 p-1"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            <div className="mb-4 sm:mb-6">
              <p className="text-sm sm:text-base text-gray-600 leading-relaxed">{currentStepData.description}</p>
            </div>

            {/* Progress Bar */}
            <div className="mb-6">
              <div className="flex justify-between text-xs text-gray-500 mb-2">
                <span>{t('onboarding.step')} {currentStep + 1}</span>
                <span>{onboardingSteps.length} {t('onboarding.steps')}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-gradient-to-r from-blue-400 to-purple-400 h-2 rounded-full transition-all duration-500 ease-out"
                  style={{ width: `${((currentStep + 1) / onboardingSteps.length) * 100}%` }}
                />
              </div>
            </div>

            {/* Navigation Buttons - Mobile Responsive */}
            <div className="flex flex-col sm:flex-row justify-between gap-2 sm:gap-0">
              <Button
                variant="outline"
                onClick={prevStep}
                disabled={currentStep === 0}
                className="flex items-center justify-center space-x-2 order-2 sm:order-1"
                size="sm"
              >
                <ArrowLeft className="w-4 h-4" />
                <span className="text-sm">{t('onboarding.previous')}</span>
              </Button>

              <div className="flex space-x-2 order-1 sm:order-2">
                <Button
                  variant="ghost"
                  onClick={skipOnboarding}
                  className="text-gray-500 flex-1 sm:flex-none"
                  size="sm"
                >
                  <span className="text-sm">{t('onboarding.skip')}</span>
                </Button>
                <Button
                  onClick={nextStep}
                  className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 flex items-center justify-center space-x-2 transition-all duration-200 flex-1 sm:flex-none"
                  size="sm"
                >
                  <span className="text-sm">
                    {currentStep === onboardingSteps.length - 1 
                      ? 'Complete'
                      : t('onboarding.next')
                    }
                  </span>
                  {currentStep === onboardingSteps.length - 1 ? (
                    <Sparkles className="w-4 h-4" />
                  ) : (
                    <ArrowRight className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}