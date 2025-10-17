import clsx from 'classnames';
import { forwardRef, type HTMLAttributes } from 'react';

export interface PanelProps extends HTMLAttributes<HTMLDivElement> {
  padding?: 'none' | 'sm' | 'md';
}

/** Elevated surface with design token padding. */
export const Panel = forwardRef<HTMLDivElement, PanelProps>(
  ({ className, padding = 'md', ...props }, ref) => (
    <div
      ref={ref}
      className={clsx(
        'rounded-lg border border-border/60 bg-background/80 shadow-floating backdrop-blur',
        padding === 'md' && 'p-4',
        padding === 'sm' && 'p-2',
        padding === 'none' && 'p-0',
        className
      )}
      {...props}
    />
  )
);

Panel.displayName = 'Panel';

export const Sidebar = ({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) => (
  <aside
    className={clsx(
      'relative flex h-full w-80 max-w-[22rem] flex-col gap-4 border-l border-border/20 bg-background/70 p-4 text-surface shadow-[inset_1px_0_0_rgba(255,255,255,0.04)] backdrop-blur',
      className
    )}
    {...props}
  >
    <div
      className="pointer-events-none absolute left-0 top-0 h-full w-px bg-gradient-to-b from-transparent via-primary/30 to-transparent"
      aria-hidden
    />
    {children}
  </aside>
);

export const Toolbar = ({ className, ...props }: HTMLAttributes<HTMLDivElement>) => (
  <div
    className={clsx(
      'flex items-center gap-2 border-b border-border/50 bg-background/60 px-4 py-3 text-sm shadow-sm backdrop-blur',
      className
    )}
    {...props}
  />
);
