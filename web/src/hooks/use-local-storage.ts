import { useEffect, useState } from 'react';

type UseLocalStorageOptions<T> = {
  serialize?: (value: T) => string;
  deserialize?: (value: string) => T;
};

export const useLocalStorage = <T,>(
  key: string,
  initialValue: T,
  options: UseLocalStorageOptions<T> = {}
): [T, (value: T) => void] => {
  const { serialize = JSON.stringify, deserialize = JSON.parse } = options;
  const [value, setValue] = useState<T>(() => {
    const stored = localStorage.getItem(key);
    if (stored) {
      try {
        return deserialize(stored);
      } catch (error) {
        console.error('Failed to deserialize localStorage value', error);
      }
    }
    return initialValue;
  });

  useEffect(() => {
    localStorage.setItem(key, serialize(value));
  }, [key, value, serialize]);

  return [value, setValue];
};
