export const rafThrottle = <T extends (...args: unknown[]) => void>(fn: T) => {
  let frame: number | null = null;
  let lastArgs: Parameters<T> | null = null;

  const invoke = () => {
    if (!lastArgs) return;
    fn(...lastArgs);
    frame = null;
  };

  const wrapper = (...args: Parameters<T>) => {
    lastArgs = args;
    if (frame === null) {
      frame = requestAnimationFrame(invoke);
    }
  };

  wrapper.cancel = () => {
    if (frame !== null) {
      cancelAnimationFrame(frame);
      frame = null;
    }
  };

  return wrapper;
};
