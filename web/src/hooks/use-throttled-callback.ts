/**
 * Throttles a callback using requestAnimationFrame for smooth 60 FPS updates
 * Ensures callbacks run at most once per frame
 */

import { useCallback, useRef } from 'react';

/**
 * Throttle a callback to run at most once per animation frame
 * Perfect for pan/zoom handlers that update frequently
 */
export const useThrottledCallback = <T extends (...args: any[]) => void>(callback: T): T => {
  const rafIdRef = useRef<number | null>(null);
  const latestArgsRef = useRef<any[] | null>(null);
  const callbackRef = useRef(callback);

  // Update callback ref on each render
  callbackRef.current = callback;

  const throttled = useCallback(((...args: any[]) => {
    // Store the latest arguments
    latestArgsRef.current = args;

    // If already scheduled, don't schedule again
    if (rafIdRef.current !== null) {
      return;
    }

    // Schedule execution on next frame
    rafIdRef.current = requestAnimationFrame(() => {
      if (latestArgsRef.current !== null) {
        callbackRef.current(...latestArgsRef.current);
        latestArgsRef.current = null;
      }
      rafIdRef.current = null;
    });
  }) as T, []);

  return throttled;
};
