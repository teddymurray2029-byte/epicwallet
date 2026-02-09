import React, { useState, useEffect } from 'react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import { X, ChevronRight, ChevronLeft } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface TutorialStep {
  target: string; // CSS selector for the target element
  title: string;
  content: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
}

interface TutorialTooltipProps {
  steps: TutorialStep[];
  storageKey: string;
  onComplete?: () => void;
}

const TUTORIAL_STORAGE_PREFIX = 'carecoin_tutorial_';

export function TutorialTooltip({ steps, storageKey, onComplete }: TutorialTooltipProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const [targetElement, setTargetElement] = useState<HTMLElement | null>(null);

  const fullStorageKey = `${TUTORIAL_STORAGE_PREFIX}${storageKey}`;

  useEffect(() => {
    // Check if tutorial was already completed
    const completed = localStorage.getItem(fullStorageKey);
    if (completed === 'true') {
      setIsVisible(false);
      return;
    }

    // Small delay to ensure DOM is ready
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, 500);

    return () => clearTimeout(timer);
  }, [fullStorageKey]);

  useEffect(() => {
    if (!isVisible || !steps[currentStep]) return;

    const findTarget = () => {
      const element = document.querySelector(steps[currentStep].target) as HTMLElement;
      setTargetElement(element);
    };

    findTarget();
    // Re-check after a short delay in case element loads async
    const timer = setTimeout(findTarget, 100);

    return () => clearTimeout(timer);
  }, [currentStep, isVisible, steps]);

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = () => {
    localStorage.setItem(fullStorageKey, 'true');
    setIsVisible(false);
    onComplete?.();
  };

  const handleDismiss = () => {
    localStorage.setItem(fullStorageKey, 'true');
    setIsVisible(false);
  };

  if (!isVisible || !steps[currentStep]) return null;

  const step = steps[currentStep];
  const isFirst = currentStep === 0;
  const isLast = currentStep === steps.length - 1;

  // If no target element found, show floating tooltip
  if (!targetElement) {
    return (
      <div className="fixed bottom-6 right-6 z-[100] animate-in fade-in slide-in-from-bottom-4 duration-300">
        <div className="relative max-w-sm rounded-xl border border-primary/30 bg-card p-4 shadow-lg shadow-primary/10">
          <button
            onClick={handleDismiss}
            className="absolute right-2 top-2 rounded-full p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label="Dismiss tutorial"
          >
            <X className="h-4 w-4" />
          </button>
          
          <div className="space-y-3 pr-6">
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                {currentStep + 1}
              </span>
              <h4 className="font-semibold text-foreground">{step.title}</h4>
            </div>
            <p className="text-sm text-muted-foreground">{step.content}</p>
            
            <div className="flex items-center justify-between pt-2">
              <div className="flex gap-1">
                {steps.map((_, idx) => (
                  <div
                    key={idx}
                    className={cn(
                      'h-1.5 w-1.5 rounded-full transition-colors',
                      idx === currentStep ? 'bg-primary' : 'bg-muted-foreground/30'
                    )}
                  />
                ))}
              </div>
              <div className="flex gap-2">
                {!isFirst && (
                  <Button variant="ghost" size="sm" onClick={handlePrev}>
                    <ChevronLeft className="mr-1 h-4 w-4" />
                    Back
                  </Button>
                )}
                <Button size="sm" onClick={handleNext}>
                  {isLast ? 'Get Started' : 'Next'}
                  {!isLast && <ChevronRight className="ml-1 h-4 w-4" />}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <Tooltip open={true}>
        <TooltipTrigger asChild>
          <div
            className="pointer-events-none fixed z-[99]"
            style={{
              top: targetElement.offsetTop,
              left: targetElement.offsetLeft,
              width: targetElement.offsetWidth,
              height: targetElement.offsetHeight,
            }}
          />
        </TooltipTrigger>
        <TooltipContent
          side={step.position || 'bottom'}
          className="z-[100] max-w-sm border-primary/30 bg-card p-0 shadow-lg shadow-primary/10"
          sideOffset={8}
        >
          <div className="relative p-4">
            <button
              onClick={handleDismiss}
              className="absolute right-2 top-2 rounded-full p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
              aria-label="Dismiss tutorial"
            >
              <X className="h-4 w-4" />
            </button>
            
            <div className="space-y-3 pr-6">
              <div className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                  {currentStep + 1}
                </span>
                <h4 className="font-semibold text-foreground">{step.title}</h4>
              </div>
              <p className="text-sm text-muted-foreground">{step.content}</p>
              
              <div className="flex items-center justify-between pt-2">
                <div className="flex gap-1">
                  {steps.map((_, idx) => (
                    <div
                      key={idx}
                      className={cn(
                        'h-1.5 w-1.5 rounded-full transition-colors',
                        idx === currentStep ? 'bg-primary' : 'bg-muted-foreground/30'
                      )}
                    />
                  ))}
                </div>
                <div className="flex gap-2">
                  {!isFirst && (
                    <Button variant="ghost" size="sm" onClick={handlePrev}>
                      <ChevronLeft className="mr-1 h-4 w-4" />
                      Back
                    </Button>
                  )}
                  <Button size="sm" onClick={handleNext}>
                    {isLast ? 'Get Started' : 'Next'}
                    {!isLast && <ChevronRight className="ml-1 h-4 w-4" />}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </TooltipContent>
      </Tooltip>

      {/* Highlight overlay for target element */}
      <div
        className="pointer-events-none fixed z-[98] rounded-lg ring-2 ring-primary/50 ring-offset-2 ring-offset-background animate-pulse"
        style={{
          top: targetElement.offsetTop - 4,
          left: targetElement.offsetLeft - 4,
          width: targetElement.offsetWidth + 8,
          height: targetElement.offsetHeight + 8,
        }}
      />
    </TooltipProvider>
  );
}

// Hook to reset tutorial for testing
export function useResetTutorial(storageKey: string) {
  const fullStorageKey = `${TUTORIAL_STORAGE_PREFIX}${storageKey}`;
  
  return () => {
    localStorage.removeItem(fullStorageKey);
    window.location.reload();
  };
}
