import { ReactNode, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

export const Portal = ({ children }: { children: ReactNode }) => {
  const [container, setContainer] = useState<HTMLElement | null>(null);

  useEffect(() => {
    const el = document.createElement('div');
    el.setAttribute('data-portal-root', '');
    document.body.appendChild(el);
    setContainer(el);
    return () => {
      document.body.removeChild(el);
    };
  }, []);

  if (!container) return null;
  return createPortal(children, container);
};
