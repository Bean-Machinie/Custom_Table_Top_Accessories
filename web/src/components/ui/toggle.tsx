import clsx from 'classnames';
import { forwardRef, type ButtonHTMLAttributes } from 'react';

export interface ToggleProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  pressed?: boolean;
  'aria-label': string;
}

export const Toggle = forwardRef<HTMLButtonElement, ToggleProps>(
  ({ pressed = false, className, children, ...props }, ref) => (
    <button
      ref={ref}
      type="button"
      aria-pressed={pressed}
      className={clsx(
        'inline-flex h-8 items-center justify-center rounded-md border border-border/60 px-2 text-xs transition',
        pressed ? 'bg-primary text-background' : 'bg-background text-surface hover:bg-muted/10',
        className
      )}
      {...props}
    >
      {children}
    </button>
  )
);

Toggle.displayName = 'Toggle';
