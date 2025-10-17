import clsx from 'classnames';
import { forwardRef, type ButtonHTMLAttributes } from 'react';

export type ButtonVariant = 'primary' | 'surface' | 'ghost';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Visual treatment of the button. */
  variant?: ButtonVariant;
  /** Button size token. */
  size?: ButtonSize;
  /** Render button as a full-width block. */
  fullWidth?: boolean;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary: 'bg-primary text-background hover:bg-primary/90',
  surface: 'bg-surface text-background hover:bg-surface/90',
  ghost: 'bg-transparent text-surface hover:bg-muted/10'
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'text-xs h-8 px-3',
  md: 'text-sm h-10 px-4',
  lg: 'text-base h-12 px-6'
};

/**
 * Token-driven push button primitive with keyboard and focus management.
 */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', fullWidth, type = 'button', ...props }, ref) => (
    <button
      ref={ref}
      type={type}
      className={clsx(
        'inline-flex items-center justify-center gap-2 rounded-md font-medium transition focus-visible:focus-ring disabled:opacity-50 disabled:cursor-not-allowed',
        variantClasses[variant],
        sizeClasses[size],
        fullWidth && 'w-full',
        className
      )}
      {...props}
    />
  )
);

Button.displayName = 'Button';

export interface IconButtonProps extends ButtonProps {
  /** Accessible label describing the icon action. */
  label: string;
}

/**
 * Circular icon button variant that enforces accessible labelling.
 */
export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ label, className, size = 'sm', ...props }, ref) => (
    <Button
      ref={ref}
      aria-label={label}
      title={label}
      size={size}
      className={clsx('rounded-full p-0 aspect-square', className)}
      {...props}
    />
  )
);

IconButton.displayName = 'IconButton';
