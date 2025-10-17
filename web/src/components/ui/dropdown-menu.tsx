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
  typeaheadQuery: string;
  setTypeaheadQuery: React.Dispatch<React.SetStateAction<string>>;
  searchable: boolean;
  searchQuery: string;
  setSearchQuery: React.Dispatch<React.SetStateAction<string>>;
  closeOnSelect: boolean;
}

const DropdownMenuContext = createContext<DropdownContextValue | null>(null);

export interface DropdownMenuRootProps {
  children: ReactNode;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  searchable?: boolean;
  closeOnSelect?: boolean;
}

export const DropdownMenuRoot = ({
  children,
  open,
  defaultOpen = false,
  onOpenChange,
  searchable = false,
  closeOnSelect = true
}: DropdownMenuRootProps) => {
  const [isOpen, setIsOpen] = useControllableState({ value: open, defaultValue: defaultOpen, onChange: onOpenChange });
  const triggerRef = useRef<HTMLElement>(null);
  const [activeIndex, setActiveIndex] = useState(-1);
  const itemsRef = useRef<HTMLElement[]>([]);
  const labelId = useId();
  const [typeaheadQuery, setTypeaheadQuery] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const typeaheadTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!isOpen) {
      itemsRef.current = [];
      setActiveIndex(-1);
      setSearchQuery('');
      setTypeaheadQuery('');
    }
  }, [isOpen]);

  // Clear typeahead query after 500ms of inactivity
  useEffect(() => {
    if (typeaheadQuery) {
      if (typeaheadTimeoutRef.current) {
        clearTimeout(typeaheadTimeoutRef.current);
      }
      typeaheadTimeoutRef.current = setTimeout(() => {
        setTypeaheadQuery('');
      }, 500);
    }
    return () => {
      if (typeaheadTimeoutRef.current) {
        clearTimeout(typeaheadTimeoutRef.current);
      }
    };
  }, [typeaheadQuery]);

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
      labelledBy: labelId,
      typeaheadQuery,
      setTypeaheadQuery,
      searchable,
      searchQuery,
      setSearchQuery,
      closeOnSelect
    }),
    [activeIndex, labelId, registerItem, setActiveIndex, isOpen, setIsOpen, typeaheadQuery, searchable, searchQuery, closeOnSelect]
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
  showChevron?: boolean;
}

export const DropdownMenuTrigger = ({ children, label, showChevron = false, className, ...props }: DropdownMenuTriggerProps) => {
  const { open, setOpen, triggerRef, setActiveIndex, searchable } = useDropdownContext('DropdownMenuTrigger');

  return (
    <span
      role="button"
      tabIndex={0}
      aria-label={label}
      aria-haspopup={searchable ? 'listbox' : 'menu'}
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
      className={clsx('inline-flex items-center gap-1 outline-none', className)}
      {...props}
    >
      {children}
      {showChevron && (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          className={clsx('h-4 w-4 transition-transform duration-200', open && 'rotate-180')}
          aria-hidden="true"
        >
          <path
            fillRule="evenodd"
            d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
            clipRule="evenodd"
          />
        </svg>
      )}
    </span>
  );
};

export interface DropdownMenuContentProps {
  children: ReactNode;
  className?: string;
  align?: 'start' | 'end';
  sideOffset?: number;
  maxHeight?: number;
  loading?: boolean;
  emptyMessage?: string;
  errorMessage?: string;
  onRetry?: () => void;
}

export const DropdownMenuContent = ({
  children,
  className,
  align = 'start',
  sideOffset = 8,
  maxHeight = 360,
  loading = false,
  emptyMessage,
  errorMessage,
  onRetry
}: DropdownMenuContentProps) => {
  const {
    open,
    setOpen,
    triggerRef,
    activeIndex,
    setActiveIndex,
    labelledBy,
    typeaheadQuery,
    setTypeaheadQuery,
    searchable,
    searchQuery,
    setSearchQuery
  } = useDropdownContext('DropdownMenuContent');
  const contentRef = useRef<HTMLDivElement | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const [style, setStyle] = useState<React.CSSProperties>({});
  const [placement, setPlacement] = useState<'bottom' | 'top'>('bottom');
  const [isAnimating, setIsAnimating] = useState(false);
  const [showTopShadow, setShowTopShadow] = useState(false);
  const [showBottomShadow, setShowBottomShadow] = useState(false);
  const prefersReducedMotion = useRef(window.matchMedia('(prefers-reduced-motion: reduce)').matches);

  // Positioning logic with collision detection
  useEffect(() => {
    if (!open) return;
    const rect = triggerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const margin = 8;
    const contentRect = contentRef.current?.getBoundingClientRect();
    const width = Math.max(contentRect?.width ?? 240, rect.width);
    const height = contentRect?.height ?? 220;

    // Determine vertical placement
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;
    const shouldFlip = spaceBelow < height + sideOffset && spaceAbove > spaceBelow;
    const newPlacement = shouldFlip ? 'top' : 'bottom';
    setPlacement(newPlacement);

    let top = newPlacement === 'bottom' ? rect.bottom + sideOffset : rect.top - sideOffset - height;
    let left = align === 'end' ? rect.right - width : rect.left;

    // Horizontal collision detection
    if (left + width > window.innerWidth - margin) {
      left = Math.max(window.innerWidth - width - margin, margin);
    }
    if (left < margin) {
      left = margin;
    }

    // Vertical boundary check
    if (top < margin) {
      top = margin;
    }
    if (top + height > window.innerHeight - margin) {
      top = Math.max(window.innerHeight - height - margin, margin);
    }

    setStyle({
      position: 'absolute',
      top: `${top + window.scrollY}px`,
      left: `${left + window.scrollX}px`,
      minWidth: `${rect.width}px`,
      maxHeight: `${maxHeight}px`
    });

    // Focus search input if searchable, otherwise focus content
    if (searchable && searchInputRef.current) {
      searchInputRef.current.focus({ preventScroll: true });
    } else {
      contentRef.current?.focus({ preventScroll: true });
    }
  }, [align, open, triggerRef, sideOffset, maxHeight, searchable]);

  // Animation on mount/unmount
  useEffect(() => {
    if (open) {
      setIsAnimating(true);
      const timer = setTimeout(() => setIsAnimating(false), 180);
      return () => clearTimeout(timer);
    }
  }, [open]);

  // Keyboard navigation
  useEffect(() => {
    if (!open) return;
    const handleKey = (event: KeyboardEvent) => {
      // Don't interfere with search input typing
      if (searchable && document.activeElement === searchInputRef.current) {
        if (event.key === 'Escape') {
          setOpen(false);
          triggerRef.current?.focus();
        } else if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
          event.preventDefault();
          setActiveIndex(event.key === 'ArrowDown' ? 0 : Number.MAX_SAFE_INTEGER);
          contentRef.current?.focus({ preventScroll: true });
        }
        return;
      }

      if (event.key === 'Escape') {
        event.preventDefault();
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
      if (event.key === 'PageDown') {
        event.preventDefault();
        setActiveIndex((index) => index + 10);
      }
      if (event.key === 'PageUp') {
        event.preventDefault();
        setActiveIndex((index) => Math.max(0, index - 10));
      }

      // Typeahead (when not in searchable mode)
      if (!searchable && event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
        setTypeaheadQuery((prev) => prev + event.key);

        // Find matching item
        const selector = '[role="menuitem"]:not([aria-disabled="true"])';
        const items = contentRef.current?.querySelectorAll<HTMLElement>(selector);
        if (!items) return;

        const query = (typeaheadQuery + event.key).toLowerCase();
        let foundIndex = -1;

        items.forEach((item, index) => {
          const text = item.textContent?.trim().toLowerCase();
          if (foundIndex === -1 && text?.startsWith(query)) {
            foundIndex = index;
          }
        });

        if (foundIndex !== -1) {
          setActiveIndex(foundIndex);
        }
      }
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [open, setActiveIndex, setOpen, triggerRef, searchable, typeaheadQuery, setTypeaheadQuery]);

  // Focus active item
  useEffect(() => {
    if (!open) return;
    const selector = searchable
      ? '[role="option"]:not([aria-disabled="true"])'
      : '[role="menuitem"]:not([aria-disabled="true"])';
    const items = contentRef.current?.querySelectorAll<HTMLElement>(selector);
    if (!items?.length) return;
    let nextIndex = activeIndex;
    if (activeIndex === Number.MAX_SAFE_INTEGER) {
      nextIndex = items.length - 1;
    }
    if (nextIndex >= items.length) {
      nextIndex = 0;
    }
    const target = items[nextIndex];
    if (target) {
      target.focus({ preventScroll: true });
      target.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }, [activeIndex, open, searchable]);

  // Handle outside clicks
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

  // Scroll shadows
  useEffect(() => {
    if (!open || !scrollRef.current) return;

    const handleScroll = () => {
      if (!scrollRef.current) return;
      const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
      setShowTopShadow(scrollTop > 0);
      setShowBottomShadow(scrollTop + clientHeight < scrollHeight - 1);
    };

    handleScroll();
    const scrollEl = scrollRef.current;
    scrollEl.addEventListener('scroll', handleScroll);

    // Also check on content changes
    const observer = new MutationObserver(handleScroll);
    observer.observe(scrollEl, { childList: true, subtree: true });

    return () => {
      scrollEl.removeEventListener('scroll', handleScroll);
      observer.disconnect();
    };
  }, [open]);

  if (!open) return null;

  const animationClass = prefersReducedMotion.current
    ? ''
    : isAnimating
      ? placement === 'bottom'
        ? 'animate-in fade-in slide-in-from-top-2'
        : 'animate-in fade-in slide-in-from-bottom-2'
      : '';

  return (
    <Portal>
      <div
        role={searchable ? 'listbox' : 'menu'}
        aria-labelledby={labelledBy}
        ref={contentRef}
        style={style}
        tabIndex={-1}
        className={clsx(
          'z-50 min-w-[220px] rounded-lg border border-border bg-background text-sm shadow-xl focus:outline-none',
          'overflow-hidden',
          animationClass,
          className
        )}
      >
        {searchable && (
          <div className="border-b border-border/40 p-2">
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-md border border-border/60 bg-background px-3 py-1.5 text-sm text-surface placeholder:text-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent/30"
              aria-label="Search options"
            />
          </div>
        )}

        <div className="relative">
          {showTopShadow && (
            <div className="pointer-events-none absolute left-0 right-0 top-0 z-10 h-4 bg-gradient-to-b from-background to-transparent" />
          )}

          <div
            ref={scrollRef}
            className="overflow-y-auto p-1"
            style={{ maxHeight: searchable ? `${maxHeight - 60}px` : `${maxHeight}px` }}
          >
            {loading ? (
              <div className="flex items-center justify-center px-3 py-8 text-muted">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-muted border-t-accent" />
                <span className="ml-3">Loading...</span>
              </div>
            ) : errorMessage ? (
              <div className="px-3 py-4 text-center">
                <p className="text-sm text-danger">{errorMessage}</p>
                {onRetry && (
                  <button
                    onClick={onRetry}
                    className="mt-2 rounded-md border border-border px-3 py-1 text-xs text-surface hover:bg-muted/20"
                  >
                    Retry
                  </button>
                )}
              </div>
            ) : emptyMessage ? (
              <div className="px-3 py-8 text-center text-sm text-muted">{emptyMessage}</div>
            ) : (
              children
            )}
          </div>

          {showBottomShadow && (
            <div className="pointer-events-none absolute bottom-0 left-0 right-0 z-10 h-4 bg-gradient-to-t from-background to-transparent" />
          )}
        </div>
      </div>
    </Portal>
  );
};

interface DropdownMenuItemProps extends ComponentPropsWithoutRef<'div'> {
  inset?: boolean;
  onSelect?: () => void;
  disabled?: boolean;
  icon?: ReactNode;
  description?: string;
  metadata?: ReactNode;
  selected?: boolean;
}

export const DropdownMenuItem = ({
  children,
  className,
  inset,
  onSelect,
  onKeyDown,
  disabled,
  icon,
  description,
  metadata,
  selected,
  ...props
}: DropdownMenuItemProps) => {
  const { setOpen, registerItem, setActiveIndex, closeOnSelect, searchable } = useDropdownContext('DropdownMenuItem');
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
      if (closeOnSelect) {
        setOpen(false);
      }
    },
    [disabled, onSelect, setOpen, closeOnSelect]
  );

  return (
    <div
      role={searchable ? 'option' : 'menuitem'}
      ref={ref}
      tabIndex={-1}
      className={clsx(
        'group relative flex select-none items-center gap-3 rounded-md px-3 py-2 text-sm outline-none transition-all duration-200',
        disabled
          ? 'cursor-not-allowed opacity-50'
          : 'cursor-pointer hover:bg-white/10 focus:bg-white/8 active:bg-white/12',
        selected && 'bg-accent/10',
        inset && !icon && 'pl-10',
        className
      )}
      aria-disabled={disabled ? 'true' : undefined}
      aria-selected={searchable && selected ? 'true' : undefined}
      onClick={handleSelect}
      onMouseEnter={() => {
        if (disabled || !ref.current) return;
        setActiveIndex(() => {
          const selector = searchable
            ? '[role="option"]:not([aria-disabled="true"])'
            : '[role="menuitem"]:not([aria-disabled="true"])';
          const items = ref.current?.parentElement?.parentElement?.querySelectorAll(selector);
          if (!items) return 0;
          return Array.from(items).indexOf(ref.current!);
        });
      }}
      onFocus={() => {
        if (!ref.current) return;
        setActiveIndex(() => {
          const selector = searchable
            ? '[role="option"]:not([aria-disabled="true"])'
            : '[role="menuitem"]:not([aria-disabled="true"])';
          const items = ref.current?.parentElement?.parentElement?.querySelectorAll(selector);
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
      {/* Icon slot */}
      {icon && <span className="flex h-5 w-5 shrink-0 items-center justify-center text-current">{icon}</span>}

      {/* Label and description */}
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="truncate text-surface">{children}</span>
        {description && <span className="truncate text-xs text-muted">{description}</span>}
      </div>

      {/* Metadata slot */}
      {metadata && <span className="ml-auto shrink-0 text-xs text-muted">{metadata}</span>}

      {/* Selection indicator */}
      {selected && (
        <span className="ml-auto shrink-0 text-accent" aria-hidden="true">
          ✓
        </span>
      )}

    </div>
  );
};

export const DropdownMenuSeparator = () => <div role="separator" className="my-1 h-px bg-border/40" />;

export const DropdownMenuLabel = ({ children, className }: { children: ReactNode; className?: string }) => (
  <div className={clsx('px-3 py-2 text-xs font-semibold uppercase tracking-wider text-muted', className)} role="presentation">
    {children}
  </div>
);

export const DropdownMenuGroup = ({ children, label }: { children: ReactNode; label?: string }) => (
  <div role="group" className="my-1">
    {label && <DropdownMenuLabel>{label}</DropdownMenuLabel>}
    {children}
  </div>
);

interface DropdownMenuCheckboxItemProps extends DropdownMenuItemProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}

export const DropdownMenuCheckboxItem = ({
  checked,
  onCheckedChange,
  children,
  description,
  icon,
  disabled,
  ...props
}: DropdownMenuCheckboxItemProps) => (
  <DropdownMenuItem
    {...props}
    onSelect={() => onCheckedChange(!checked)}
    disabled={disabled}
    icon={
      icon ? (
        icon
      ) : (
        <span className={clsx('flex h-4 w-4 items-center justify-center rounded border', checked ? 'border-accent bg-accent' : 'border-border')}>
          {checked && (
            <span className="text-[10px] text-white" aria-hidden="true">
              ✓
            </span>
          )}
        </span>
      )
    }
    description={description}
  >
    {children}
  </DropdownMenuItem>
);
