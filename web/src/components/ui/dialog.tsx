import clsx from 'classnames';
import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef
} from 'react';

import { useControllableState } from '../../hooks/use-controllable-state';
import { Portal } from '../../lib/portal';

interface DialogContextValue {
  open: boolean;
  setOpen: (open: boolean) => void;
  labelledBy: string;
  describedBy: string;
}

const DialogContext = createContext<DialogContextValue | null>(null);

export interface DialogRootProps {
  children: ReactNode;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
}

/** Root dialog component providing open state context. */
export const DialogRoot = ({
  children,
  open,
  defaultOpen = false,
  onOpenChange
}: DialogRootProps) => {
  const [isOpen, setIsOpen] = useControllableState({
    value: open,
    defaultValue: defaultOpen,
    onChange: onOpenChange
  });

  const labelledBy = useId();
  const describedBy = useId();

  const value = useMemo(
    () => ({
      open: isOpen,
      setOpen: setIsOpen,
      labelledBy,
      describedBy
    }),
    [describedBy, isOpen, labelledBy, setIsOpen]
  );

  return <DialogContext.Provider value={value}>{children}</DialogContext.Provider>;
};

const useDialogContext = (component: string) => {
  const ctx = useContext(DialogContext);
  if (!ctx) throw new Error(`${component} must be used within <DialogRoot />`);
  return ctx;
};

export interface DialogTriggerProps {
  children: ReactNode;
}

/** Button-like trigger that toggles the dialog. */
export const DialogTrigger = ({ children }: DialogTriggerProps) => {
  const { open, setOpen } = useDialogContext('DialogTrigger');
  return (
    <span
      role="button"
      tabIndex={0}
      aria-haspopup="dialog"
      aria-expanded={open}
      onClick={() => setOpen(!open)}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          setOpen(!open);
        }
      }}
      className="inline-flex"
    >
      {children}
    </span>
  );
};

export interface DialogContentProps {
  children: ReactNode;
  className?: string;
}

const focusableSelector =
  'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])';

/** Overlay content with portal and focus trap. */
export const DialogContent = ({ children, className }: DialogContentProps) => {
  const { open, setOpen, labelledBy, describedBy } = useDialogContext('DialogContent');
  const overlayRef = useRef<HTMLDivElement | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);
  const previousFocused = useRef<Element | null>(null);

  const focusableRef = useCallback(() => {
    const nodeList = contentRef.current?.querySelectorAll<HTMLElement>(focusableSelector);
    return nodeList ? Array.from(nodeList) : [];
  }, []);

  useEffect(() => {
    if (!open) return;
    previousFocused.current = document.activeElement;
    const focusable = focusableRef();
    focusable[0]?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        setOpen(false);
      }
      if (event.key === 'Tab') {
        const nodes = focusableRef();
        if (!nodes.length) return;
        const first = nodes[0];
        const last = nodes[nodes.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };
    const onFocus = (event: FocusEvent) => {
      if (!contentRef.current) return;
      if (!contentRef.current.contains(event.target as Node)) {
        const nodes = focusableRef();
        nodes[0]?.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('focusin', onFocus);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('focusin', onFocus);
      if (previousFocused.current instanceof HTMLElement) {
        previousFocused.current.focus();
      }
    };
  }, [focusableRef, open, setOpen]);

  if (!open) return null;

  return (
    <Portal>
      <div
        ref={overlayRef}
        className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
        aria-hidden
        onClick={() => setOpen(false)}
      />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby={labelledBy}
          aria-describedby={describedBy}
          ref={contentRef}
          className={clsx(
            'max-h-[90vh] w-full max-w-lg overflow-auto rounded-lg bg-background p-6 shadow-lg focus:outline-none',
            className
          )}
        >
          {children}
        </div>
      </div>
    </Portal>
  );
};

export const DialogTitle = ({ children, className }: { children: ReactNode; className?: string }) => {
  const { labelledBy } = useDialogContext('DialogTitle');
  return (
    <h2 id={labelledBy} className={clsx('text-lg font-semibold', className)}>
      {children}
    </h2>
  );
};

export const DialogDescription = ({ children, className }: { children: ReactNode; className?: string }) => {
  const { describedBy } = useDialogContext('DialogDescription');
  return (
    <p id={describedBy} className={clsx('mt-2 text-sm text-muted', className)}>
      {children}
    </p>
  );
};

export const DialogClose = ({ children }: { children: ReactNode }) => {
  const { setOpen } = useDialogContext('DialogClose');
  return (
    <button
      type="button"
      onClick={() => setOpen(false)}
      className="mt-6 inline-flex items-center justify-center rounded-md border border-border px-4 py-2 text-sm text-surface hover:bg-muted/20 focus-visible:focus-ring"
    >
      {children}
    </button>
  );
};
