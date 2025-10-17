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

export const Sidebar = ({ className, ...props }: HTMLAttributes<HTMLDivElement>) => (
  <aside
    className={clsx('flex h-full w-72 flex-col gap-4 border-l border-border/40 bg-background/40 p-4', className)}
    {...props}
  />
);

export const Toolbar = ({ className, ...props }: HTMLAttributes<HTMLDivElement>) => (
  <div
    className={clsx(
      'flex items-center gap-2 border-b border-border/50 bg-background/60 px-4 py-2 text-sm shadow-sm backdrop-blur',
      className
    )}
    {...props}
  />
);
