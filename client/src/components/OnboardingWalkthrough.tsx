import React, { useState, useEffect } from 'react';
import { X, ArrowRight, ArrowLeft, Star, Gift, DollarSign, Heart, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useTranslation } from '@/lib/i18n';

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  targetElement?: string;
  position: 'top' | 'bottom' | 'left' | 'right' | 'center';
  petMessage: string;
  petAnimation: 'idle' | 'excited' | 'pointing' | 'celebrating';
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
      petAnimation: 'pointing'
    },
    {
      id: 'credits',
      title: t('onboarding.credits.title'),
      description: t('onboarding.credits.description'),
      targetElement: '.credits-card',
      position: 'right',
      petMessage: t('onboarding.credits.petMessage'),
      petAnimation: 'excited'
    },
    {
      id: 'loyalty',
      title: t('onboarding.loyalty.title'),
      description: t('onboarding.loyalty.description'),
      targetElement: '.loyalty-card',
      position: 'right',
      petMessage: t('onboarding.loyalty.petMessage'),
      petAnimation: 'pointing'
    },
    {
      id: 'tokens',
      title: t('onboarding.tokens.title'),
      description: t('onboarding.tokens.description'),
      targetElement: '.tokens-card',
      position: 'right',
      petMessage: t('onboarding.tokens.petMessage'),
      petAnimation: 'excited'
    },
    {
      id: 'navigation',
      title: t('onboarding.navigation.title'),
      description: t('onboarding.navigation.description'),
      targetElement: '.navigation-tabs',
      position: 'bottom',
      petMessage: t('onboarding.navigation.petMessage'),
      petAnimation: 'pointing'
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
        return () => element.classList.remove('onboarding-highlight');
      }
    }
  }, [currentStep, isOpen, currentStepData.targetElement]);

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
      {/* Overlay */}
      <div className="fixed inset-0 bg-black bg-opacity-50 z-40" />
      
      {/* Virtual Pet Guide */}
      {petVisible && (
        <div className="fixed bottom-4 right-4 z-50">
          <Card className="bg-gradient-to-br from-purple-100 to-pink-100 border-purple-200 shadow-lg max-w-xs">
            <CardContent className="p-4">
              <div className="flex items-start space-x-3">
                <div className={`w-12 h-12 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center ${
                  currentStepData.petAnimation === 'excited' ? 'animate-bounce' :
                  currentStepData.petAnimation === 'pointing' ? 'animate-pulse' :
                  currentStepData.petAnimation === 'celebrating' ? 'animate-spin' : ''
                }`}>
                  {currentStepData.petAnimation === 'celebrating' ? (
                    <Sparkles className="w-6 h-6 text-white" />
                  ) : (
                    <Heart className="w-6 h-6 text-white" />
                  )}
                </div>
                <div className="flex-1">
                  <div className="bg-white rounded-lg p-2 shadow-sm">
                    <p className="text-sm text-gray-700">{currentStepData.petMessage}</p>
                  </div>
                  <div className="flex justify-end mt-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setPetVisible(false)}
                      className="text-purple-600 hover:text-purple-700"
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

      {/* Onboarding Modal */}
      <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
        <Card className="bg-white shadow-2xl max-w-lg w-full">
          <CardContent className="p-6">
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-purple-400 flex items-center justify-center">
                  <Star className="w-4 h-4 text-white" />
                </div>
                <h2 className="text-xl font-bold text-gray-900">{currentStepData.title}</h2>
              </div>
              <Button
                size="sm"
                variant="ghost"
                onClick={skipOnboarding}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            <div className="mb-6">
              <p className="text-gray-600 leading-relaxed">{currentStepData.description}</p>
            </div>

            {/* Progress Bar */}
            <div className="mb-6">
              <div className="flex justify-between text-xs text-gray-500 mb-2">
                <span>{t('onboarding.step')} {currentStep + 1}</span>
                <span>{onboardingSteps.length} {t('onboarding.steps')}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-gradient-to-r from-blue-400 to-purple-400 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${((currentStep + 1) / onboardingSteps.length) * 100}%` }}
                />
              </div>
            </div>

            {/* Navigation Buttons */}
            <div className="flex justify-between">
              <Button
                variant="outline"
                onClick={prevStep}
                disabled={currentStep === 0}
                className="flex items-center space-x-2"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>{t('onboarding.previous')}</span>
              </Button>

              <div className="flex space-x-2">
                <Button
                  variant="ghost"
                  onClick={skipOnboarding}
                  className="text-gray-500"
                >
                  {t('onboarding.skip')}
                </Button>
                <Button
                  onClick={nextStep}
                  className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 flex items-center space-x-2"
                >
                  <span>
                    {currentStep === onboardingSteps.length - 1 
                      ? t('onboarding.finish') 
                      : t('onboarding.next')
                    }
                  </span>
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}