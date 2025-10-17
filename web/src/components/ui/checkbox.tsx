import clsx from 'classnames';
import { forwardRef, type InputHTMLAttributes } from 'react';

export interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  /** Whether the checkbox is indeterminate. */
  indeterminate?: boolean;
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, indeterminate = false, ...props }, ref) => (
    <input
      ref={(instance) => {
        if (instance) {
          instance.indeterminate = indeterminate;
        }
        if (typeof ref === 'function') {
          ref(instance);
        } else if (ref) {
          (ref as React.MutableRefObject<HTMLInputElement | null>).current = instance;
        }
      }}
      type="checkbox"
      className={clsx(
        'h-4 w-4 rounded border border-border/60 bg-background text-primary focus-visible:focus-ring',
        className
      )}
      {...props}
    />
  )
);

Checkbox.displayName = 'Checkbox';
