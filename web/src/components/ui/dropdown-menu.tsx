import clsx from 'classnames';
import {
  ComponentPropsWithoutRef,
  HTMLAttributes,
  MouseEvent as ReactMouseEvent,
  ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState
} from 'react';

import { useControllableState } from '../../hooks/use-controllable-state';
import { Portal } from '../../lib/portal';

interface DropdownContextValue {
  open: boolean;
  setOpen: (open: boolean) => void;
  triggerRef: React.RefObject<HTMLElement>;
  activeIndex: number;
  setActiveIndex: React.Dispatch<React.SetStateAction<number>>;
  registerItem: (el: HTMLElement) => number;
  labelledBy: string;
}

const DropdownMenuContext = createContext<DropdownContextValue | null>(null);

export interface DropdownMenuRootProps {
  children: ReactNode;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export const DropdownMenuRoot = ({ children, open, defaultOpen = false, onOpenChange }: DropdownMenuRootProps) => {
  const [isOpen, setIsOpen] = useControllableState({ value: open, defaultValue: defaultOpen, onChange: onOpenChange });
  const triggerRef = useRef<HTMLElement>(null);
  const [activeIndex, setActiveIndex] = useState(-1);
  const itemsRef = useRef<HTMLElement[]>([]);
  const labelId = useId();

  useEffect(() => {
    if (!isOpen) {
      itemsRef.current = [];
      setActiveIndex(-1);
    }
  }, [isOpen]);

  const registerItem = useCallback((el: HTMLElement) => {
    const index = itemsRef.current.indexOf(el);
    if (index >= 0) return index;
    itemsRef.current.push(el);
    return itemsRef.current.length - 1;
  }, []);

  const value = useMemo(
    () => ({
      open: isOpen,
      setOpen: setIsOpen,
      triggerRef,
      activeIndex,
      setActiveIndex,
      registerItem,
      labelledBy: labelId
    }),
    [activeIndex, labelId, registerItem, setActiveIndex, isOpen, setIsOpen]
  );

  return <DropdownMenuContext.Provider value={value}>{children}</DropdownMenuContext.Provider>;
};

const useDropdownContext = (component: string) => {
  const ctx = useContext(DropdownMenuContext);
  if (!ctx) throw new Error(`${component} must be used within <DropdownMenuRoot />`);
  return ctx;
};

interface DropdownMenuTriggerProps extends HTMLAttributes<HTMLSpanElement> {
  children: ReactNode;
  label?: string;
}

export const DropdownMenuTrigger = ({ children, label, className, ...props }: DropdownMenuTriggerProps) => {
  const { open, setOpen, triggerRef, setActiveIndex } = useDropdownContext('DropdownMenuTrigger');

  return (
    <span
      role="button"
      tabIndex={0}
      aria-label={label}
      aria-haspopup="menu"
      aria-expanded={open}
      ref={triggerRef}
      onClick={() => {
        setOpen(!open);
        setActiveIndex(0);
      }}
      onKeyDown={(event) => {
        if (event.key === 'ArrowDown') {
          event.preventDefault();
          setOpen(true);
          setActiveIndex(0);
        }
        if (event.key === 'ArrowUp') {
          event.preventDefault();
          setOpen(true);
          setActiveIndex(-1);
        }
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          setOpen(!open);
        }
      }}
      className={clsx('inline-flex', className)}
      {...props}
    >
      {children}
    </span>
  );
};

export interface DropdownMenuContentProps {
  children: ReactNode;
  className?: string;
  align?: 'start' | 'end';
}

export const DropdownMenuContent = ({ children, className, align = 'start' }: DropdownMenuContentProps) => {
  const { open, setOpen, triggerRef, activeIndex, setActiveIndex, labelledBy } = useDropdownContext('DropdownMenuContent');
  const contentRef = useRef<HTMLDivElement | null>(null);
  const [style, setStyle] = useState<React.CSSProperties>({});

  useEffect(() => {
    if (!open) return;
    const rect = triggerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const margin = 8;
    const contentRect = contentRef.current?.getBoundingClientRect();
    const width = contentRect?.width ?? 240;
    const height = contentRect?.height ?? 220;
    let top = rect.bottom + margin;
    let left = align === 'end' ? rect.right - width : rect.left;
    if (top + height > window.innerHeight) {
      top = Math.max(rect.top - margin - height, margin);
    }
    if (left + width > window.innerWidth) {
      left = Math.max(window.innerWidth - width - margin, margin);
    }
    if (left < margin) {
      left = margin;
    }
    setStyle({
      position: 'absolute',
      top: `${top + window.scrollY}px`,
      left: `${left + window.scrollX}px`
    });
    contentRef.current?.focus({ preventScroll: true });
  }, [align, open, triggerRef]);

  useEffect(() => {
    if (!open) return;
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
        triggerRef.current?.focus();
      }
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        setActiveIndex((index) => index + 1);
      }
      if (event.key === 'ArrowUp') {
        event.preventDefault();
        setActiveIndex((index) => (index <= 0 ? Number.MAX_SAFE_INTEGER : index - 1));
      }
      if (event.key === 'Home') {
        event.preventDefault();
        setActiveIndex(0);
      }
      if (event.key === 'End') {
        event.preventDefault();
        setActiveIndex(Number.MAX_SAFE_INTEGER);
      }
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [open, setActiveIndex, setOpen, triggerRef]);

  useEffect(() => {
    if (!open) return;
    const items = contentRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]');
    if (!items?.length) return;
    let nextIndex = activeIndex;
    if (activeIndex === Number.MAX_SAFE_INTEGER) {
      nextIndex = items.length - 1;
    }
    const target = items[nextIndex] ?? items[0];
    target?.focus({ preventScroll: true });
  }, [activeIndex, open]);

  useEffect(() => {
    if (!open) return;
    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (contentRef.current?.contains(target)) return;
      if (triggerRef.current?.contains(target as Node)) return;
      setOpen(false);
    };
    const handleFocusIn = (event: FocusEvent) => {
      const target = event.target as Node;
      if (contentRef.current?.contains(target)) return;
      if (triggerRef.current?.contains(target)) return;
      setOpen(false);
    };
    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('focusin', handleFocusIn);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('focusin', handleFocusIn);
    };
  }, [open, setOpen, triggerRef]);

  if (!open) return null;

  return (
    <Portal>
      <div
        role="menu"
        aria-labelledby={labelledBy}
        ref={contentRef}
        style={style}
        tabIndex={-1}
        className={clsx(
          'z-50 min-w-[220px] rounded-md border border-border bg-background p-1 text-sm shadow-lg focus:outline-none',
          className
        )}
      >
        {children}
      </div>
    </Portal>
  );
};

interface DropdownMenuItemProps extends ComponentPropsWithoutRef<'div'> {
  inset?: boolean;
  onSelect?: () => void;
  disabled?: boolean;
}

export const DropdownMenuItem = ({
  children,
  className,
  inset,
  onSelect,
  onKeyDown,
  disabled,
  ...props
}: DropdownMenuItemProps) => {
  const { setOpen, registerItem, setActiveIndex } = useDropdownContext('DropdownMenuItem');
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (ref.current) {
      registerItem(ref.current);
    }
  }, [registerItem]);

  const handleSelect = useCallback(
    (event?: ReactMouseEvent<HTMLDivElement>) => {
      if (disabled) {
        event?.preventDefault();
        return;
      }
      onSelect?.();
      setOpen(false);
    },
    [disabled, onSelect, setOpen]
  );

  return (
    <div
      role="menuitem"
      ref={ref}
      tabIndex={-1}
      className={clsx(
        'flex select-none items-center rounded-md px-3 py-2 text-sm text-surface outline-none focus-visible:focus-ring',
        disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer hover:bg-muted/20 focus:bg-muted/20',
        inset && 'pl-8',
        className
      )}
      aria-disabled={disabled ? 'true' : undefined}
      onClick={handleSelect}
      onMouseEnter={() => {
        if (!ref.current) return;
        setActiveIndex(() => {
          const items = ref.current?.parentElement?.querySelectorAll('[role="menuitem"]');
          if (!items) return 0;
          return Array.from(items).indexOf(ref.current!);
        });
      }}
      onFocus={() => {
        if (!ref.current) return;
        setActiveIndex(() => {
          const items = ref.current?.parentElement?.querySelectorAll('[role="menuitem"]');
          if (!items) return 0;
          return Array.from(items).indexOf(ref.current!);
        });
      }}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          handleSelect();
        }
        onKeyDown?.(event);
      }}
      {...props}
    >
      {children}
    </div>
  );
};

export const DropdownMenuSeparator = () => <div role="separator" className="my-1 h-px bg-border/40" />;

interface DropdownMenuCheckboxItemProps extends DropdownMenuItemProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}

export const DropdownMenuCheckboxItem = ({ checked, onCheckedChange, children, ...props }: DropdownMenuCheckboxItemProps) => (
  <DropdownMenuItem
    {...props}
    onSelect={() => onCheckedChange(!checked)}
    className={clsx('justify-between', props.className)}
  >
    <span>{children}</span>
    <span aria-hidden className="text-accent">
      {checked ? '✓' : ''}
    </span>
  </DropdownMenuItem>
);
