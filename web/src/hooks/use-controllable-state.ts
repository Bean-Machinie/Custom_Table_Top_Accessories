import { useCallback, useEffect, useRef, useState } from 'react';

interface Options<T> {
  value?: T;
  defaultValue: T;
  onChange?: (value: T) => void;
}

export const useControllableState = <T,>({ value, defaultValue, onChange }: Options<T>): [T, (next: T) => void] => {
  const [internal, setInternal] = useState<T>(value ?? defaultValue);
  const isControlled = useRef(value !== undefined);

  useEffect(() => {
    if (value !== undefined) {
      setInternal(value);
    }
  }, [value]);

  const setValue = useCallback(
    (next: T) => {
      if (!isControlled.current) {
        setInternal(next);
      }
      onChange?.(next);
    },
    [onChange]
  );

  return [value ?? internal, setValue];
};
