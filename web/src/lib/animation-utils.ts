/**
 * Animation and easing utilities for smooth viewport transitions
 */

/**
 * Easing functions for smooth animations
 */
export const easing = {
  // Smooth deceleration
  easeOutCubic: (t: number): number => {
    return 1 - Math.pow(1 - t, 3);
  },

  // Smooth acceleration and deceleration
  easeInOutCubic: (t: number): number => {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  },

  // Quick start, smooth end
  easeOutQuad: (t: number): number => {
    return 1 - (1 - t) * (1 - t);
  },

  // Linear (no easing)
  linear: (t: number): number => {
    return t;
  }
};

export type EasingFunction = (t: number) => number;

/**
 * Interpolates between two values using an easing function
 */
export const lerp = (start: number, end: number, t: number): number => {
  return start + (end - start) * t;
};

/**
 * Animation frame scheduler for smooth viewport transitions
 */
export class ViewportAnimator {
  private rafId: number | null = null;
  private startTime: number | null = null;

  constructor(
    private duration: number = 300, // ms
    private easingFn: EasingFunction = easing.easeOutCubic
  ) {}

  /**
   * Animates a value from start to end
   */
  animate(
    startValue: number,
    endValue: number,
    onUpdate: (value: number) => void,
    onComplete?: () => void
  ): void {
    this.cancel();

    const animate = (currentTime: number) => {
      if (this.startTime === null) {
        this.startTime = currentTime;
      }

      const elapsed = currentTime - this.startTime;
      const progress = Math.min(elapsed / this.duration, 1);
      const easedProgress = this.easingFn(progress);

      const currentValue = lerp(startValue, endValue, easedProgress);
      onUpdate(currentValue);

      if (progress < 1) {
        this.rafId = requestAnimationFrame(animate);
      } else {
        this.startTime = null;
        this.rafId = null;
        onComplete?.();
      }
    };

    this.rafId = requestAnimationFrame(animate);
  }

  /**
   * Animates multiple values simultaneously
   */
  animateMultiple<T extends Record<string, number>>(
    startValues: T,
    endValues: T,
    onUpdate: (values: T) => void,
    onComplete?: () => void
  ): void {
    this.cancel();

    const animate = (currentTime: number) => {
      if (this.startTime === null) {
        this.startTime = currentTime;
      }

      const elapsed = currentTime - this.startTime;
      const progress = Math.min(elapsed / this.duration, 1);
      const easedProgress = this.easingFn(progress);

      const currentValues = {} as T;
      for (const key in startValues) {
        currentValues[key] = lerp(startValues[key], endValues[key], easedProgress) as T[Extract<keyof T, string>];
      }

      onUpdate(currentValues);

      if (progress < 1) {
        this.rafId = requestAnimationFrame(animate);
      } else {
        this.startTime = null;
        this.rafId = null;
        onComplete?.();
      }
    };

    this.rafId = requestAnimationFrame(animate);
  }

  /**
   * Cancels any ongoing animation
   */
  cancel(): void {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
      this.startTime = null;
    }
  }

  /**
   * Check if an animation is currently running
   */
  isAnimating(): boolean {
    return this.rafId !== null;
  }
}

/**
 * Checks if the user prefers reduced motion
 */
export const prefersReducedMotion = (): boolean => {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
};

/**
 * Gets appropriate animation duration based on user preference
 */
export const getAnimationDuration = (defaultDuration: number): number => {
  return prefersReducedMotion() ? 0 : defaultDuration;
};
