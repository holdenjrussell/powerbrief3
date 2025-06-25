import React from 'react';
import { Progress } from '@/components/ui/progress';
import { CheckCircle2, Circle, Loader2 } from 'lucide-react';
import styles from './GenerationProgressTracker.module.scss';

interface ProgressStep {
  id: string;
  label: string;
  status: 'pending' | 'in-progress' | 'completed' | 'error';
  error?: string;
}

interface GenerationProgressTrackerProps {
  steps: ProgressStep[];
  currentStep?: string;
}

export function GenerationProgressTracker({ steps, currentStep }: GenerationProgressTrackerProps) {
  const completedSteps = steps.filter(step => step.status === 'completed').length;
  const progressPercentage = (completedSteps / steps.length) * 100;

  return (
    <div className={styles.progressTracker}>
      <div className={styles.header}>
        <h3>Generating Creative Content</h3>
        <span className={styles.percentage}>{Math.round(progressPercentage)}%</span>
      </div>
      
      <Progress value={progressPercentage} className={styles.progressBar} />
      
      <div className={styles.steps}>
        {steps.map((step) => (
          <div key={step.id} className={`${styles.step} ${styles[step.status]}`}>
            <div className={styles.stepIcon}>
              {step.status === 'completed' && <CheckCircle2 className="h-5 w-5" />}
              {step.status === 'in-progress' && <Loader2 className="h-5 w-5 animate-spin" />}
              {step.status === 'pending' && <Circle className="h-5 w-5" />}
              {step.status === 'error' && <Circle className="h-5 w-5 text-destructive" />}
            </div>
            <div className={styles.stepContent}>
              <div className={styles.stepLabel}>{step.label}</div>
              {step.status === 'in-progress' && currentStep === step.id && (
                <div className={styles.stepDescription}>Processing...</div>
              )}
              {step.status === 'error' && step.error && (
                <div className={styles.stepError}>{step.error}</div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
} 