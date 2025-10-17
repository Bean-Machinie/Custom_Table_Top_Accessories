/**
 * Performance monitoring hook for tracking FPS and frame budget
 * Helps ensure 60 FPS performance
 */

import { useEffect, useRef, useState } from 'react';

export interface PerformanceMetrics {
  fps: number;
  frameBudgetMs: number; // Time taken for last frame
  isDropping: boolean; // True if FPS < 55
}

interface UsePerformanceMonitorOptions {
  enabled?: boolean;
  onSlowFrame?: (metrics: PerformanceMetrics) => void;
  warningThreshold?: number; // FPS threshold for warnings (default: 55)
}

/**
 * Monitor performance metrics in real-time
 * Reports FPS and frame budget
 */
export const usePerformanceMonitor = (options: UsePerformanceMonitorOptions = {}) => {
  const { enabled = false, onSlowFrame, warningThreshold = 55 } = options;

  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    fps: 60,
    frameBudgetMs: 0,
    isDropping: false
  });

  const frameCountRef = useRef(0);
  const lastTimeRef = useRef(performance.now());
  const lastFrameTimeRef = useRef(performance.now());
  const rafIdRef = useRef<number | null>(null);

  useEffect(() => {
    if (!enabled) return;

    const measureFrame = (currentTime: number) => {
      frameCountRef.current++;

      // Calculate frame budget (time taken for this frame)
      const frameBudgetMs = currentTime - lastFrameTimeRef.current;
      lastFrameTimeRef.current = currentTime;

      // Calculate FPS every second
      const elapsed = currentTime - lastTimeRef.current;
      if (elapsed >= 1000) {
        const fps = Math.round((frameCountRef.current * 1000) / elapsed);
        const isDropping = fps < warningThreshold;

        const newMetrics: PerformanceMetrics = {
          fps,
          frameBudgetMs,
          isDropping
        };

        setMetrics(newMetrics);

        // Trigger callback for slow frames
        if (isDropping && onSlowFrame) {
          onSlowFrame(newMetrics);
        }

        // Reset counters
        frameCountRef.current = 0;
        lastTimeRef.current = currentTime;
      }

      rafIdRef.current = requestAnimationFrame(measureFrame);
    };

    rafIdRef.current = requestAnimationFrame(measureFrame);

    return () => {
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
      }
    };
  }, [enabled, onSlowFrame, warningThreshold]);

  return metrics;
};

/**
 * Simple utility to log performance warnings to console
 * Use in development only
 */
export const usePerformanceLogger = (enabled: boolean = false) => {
  usePerformanceMonitor({
    enabled,
    onSlowFrame: (metrics) => {
      console.warn(`⚠️ Performance warning: ${metrics.fps} FPS (frame took ${metrics.frameBudgetMs.toFixed(2)}ms)`);
    }
  });
};
