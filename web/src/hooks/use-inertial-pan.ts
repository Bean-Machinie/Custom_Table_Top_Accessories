import { useCallback, useRef } from 'react';

import { easing, getAnimationDuration } from '../lib/animation-utils';

/**
 * Configuration for inertial panning behavior
 */
export interface InertialPanConfig {
  // Minimum velocity (px/ms) to trigger inertia
  minVelocity: number;
  // Friction coefficient (0-1, higher = more friction)
  friction: number;
  // Maximum duration for inertia animation (ms)
  maxDuration: number;
}

const DEFAULT_CONFIG: InertialPanConfig = {
  minVelocity: 0.1,
  friction: 0.95,
  maxDuration: 600
};

interface Velocity {
  x: number;
  y: number;
}

/**
 * Hook for managing inertial panning with velocity tracking
 */
export const useInertialPan = (
  onUpdate: (dx: number, dy: number) => void,
  config: InertialPanConfig = DEFAULT_CONFIG
) => {
  const velocityRef = useRef<Velocity>({ x: 0, y: 0 });
  const lastMoveTimeRef = useRef<number>(0);
  const lastPositionRef = useRef<{ x: number; y: number } | null>(null);
  const rafIdRef = useRef<number | null>(null);

  /**
   * Updates velocity based on pointer movement
   */
  const trackVelocity = useCallback((clientX: number, clientY: number) => {
    const now = performance.now();

    if (lastPositionRef.current && lastMoveTimeRef.current) {
      const dt = now - lastMoveTimeRef.current;
      if (dt > 0) {
        const dx = clientX - lastPositionRef.current.x;
        const dy = clientY - lastPositionRef.current.y;

        // Calculate velocity in px/ms
        velocityRef.current = {
          x: dx / dt,
          y: dy / dt
        };
      }
    }

    lastPositionRef.current = { x: clientX, y: clientY };
    lastMoveTimeRef.current = now;
  }, []);

  /**
   * Starts inertial movement based on current velocity
   */
  const startInertia = useCallback(() => {
    // Cancel any existing inertia animation
    if (rafIdRef.current !== null) {
      cancelAnimationFrame(rafIdRef.current);
    }

    const velocity = velocityRef.current;
    const speed = Math.sqrt(velocity.x * velocity.x + velocity.y * velocity.y);

    // Only apply inertia if velocity is significant
    if (speed < config.minVelocity) {
      return;
    }

    const duration = getAnimationDuration(
      Math.min(config.maxDuration, speed * 1000) // Scale duration with speed
    );

    if (duration === 0) {
      return; // Skip animation if reduced motion is preferred
    }

    const startTime = performance.now();

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Use ease-out for smooth deceleration
      const easedProgress = easing.easeOutCubic(progress);

      // Apply friction over time
      const frictionFactor = Math.pow(config.friction, progress * 100);

      const dx = velocity.x * (1 - easedProgress) * frictionFactor * 16; // ~16ms frame
      const dy = velocity.y * (1 - easedProgress) * frictionFactor * 16;

      onUpdate(dx, dy);

      if (progress < 1) {
        rafIdRef.current = requestAnimationFrame(animate);
      } else {
        rafIdRef.current = null;
        velocityRef.current = { x: 0, y: 0 };
      }
    };

    rafIdRef.current = requestAnimationFrame(animate);
  }, [config, onUpdate]);

  /**
   * Cancels any ongoing inertia animation
   */
  const cancelInertia = useCallback(() => {
    if (rafIdRef.current !== null) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }
    velocityRef.current = { x: 0, y: 0 };
    lastPositionRef.current = null;
    lastMoveTimeRef.current = 0;
  }, []);

  /**
   * Resets velocity tracking (call on pointer down)
   */
  const resetVelocity = useCallback(() => {
    velocityRef.current = { x: 0, y: 0 };
    lastPositionRef.current = null;
    lastMoveTimeRef.current = 0;
  }, []);

  return {
    trackVelocity,
    startInertia,
    cancelInertia,
    resetVelocity
  };
};
