'use client';

/**
 * useRovingFocus — 2D arrow-key navigation with roving tabindex for grids/lists.
 *
 * Usage:
 *   const { containerProps, focusedIndex, setFocusedIndex } = useRovingFocus({
 *     itemCount: songs.length,
 *     columns: 5,                // for 2D grids
 *     onSelect: (idx) => openSong(songs[idx]),
 *     loop: true,                // wrap around edges
 *   });
 *
 * Each item gets:
 *   tabIndex={idx === focusedIndex ? 0 : -1}
 *   ref={itemRefs[idx]}
 *   onKeyDown={containerProps.onKeyDown}
 *
 * The container gets:
 *   role="grid" (or "listbox")
 *   ref={containerRef}
 *   {...containerProps}
 */

import { useState, useCallback, useRef, useEffect, useMemo } from 'react';

export interface RovingFocusOptions {
  /** Total number of items in the grid/list */
  itemCount: number;
  /** Number of columns for 2D navigation. 1 = vertical list, 0 = auto from container width */
  columns?: number;
  /** Callback when an item is activated (Enter/Space) */
  onSelect?: (_index: number) => void;
  /** Callback when focus changes (for scroll-into-view etc.) */
  onFocusChange?: (_index: number) => void;
  /** Whether to wrap around at edges */
  loop?: boolean;
  /** Orientation: 'grid' for 2D, 'list' for 1D vertical */
  orientation?: 'grid' | 'list';
  /** Initial focused index */
  initialIndex?: number;
  /** Whether navigation is currently disabled */
  disabled?: boolean;
  /** ARIA role for the container */
  role?: string;
  /** ARIA label for the container */
  ariaLabel?: string;
}

export interface RovingFocusResult {
  /** Props to spread on the container element */
  containerProps: {
    ref: React.RefObject<HTMLDivElement | null>;
    role: string;
    'aria-label'?: string;
    tabIndex: number;
    onKeyDown: React.KeyboardEventHandler;
    onFocus: React.FocusEventHandler;
  };
  /** Currently focused index */
  focusedIndex: number;
  /** Programmatically set the focused index */
  setFocusedIndex: (_index: number) => void;
  /** Get props for a specific item at the given index */
  getItemProps: (_index: number) => {
    tabIndex: number;
    'aria-selected'?: boolean;
    role?: string;
    ref: React.RefCallback<HTMLElement>;
    onKeyDown?: React.KeyboardEventHandler;
  };
  /** Ref to the container element (for programmatic access) */
  containerRef: React.RefObject<HTMLDivElement | null>;
}

export function useRovingFocus(options: RovingFocusOptions): RovingFocusResult {
  const {
    itemCount,
    columns: columnsProp = 0,
    onSelect,
    onFocusChange,
    loop = true,
    orientation = 'grid',
    initialIndex = 0,
    disabled = false,
    role = 'grid',
    ariaLabel,
  } = options;

  const [focusedIndex, setFocusedIndex] = useState(initialIndex);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const itemRefs = useRef<Map<number, HTMLElement>>(new Map());
  const isInternalRef = useRef(false);

  // Compute columns dynamically from container width if not specified
  const [computedColumns, setComputedColumns] = useState(columnsProp || 1);

  useEffect(() => {
    if (columnsProp > 0) {
      setComputedColumns(columnsProp);
      return;
    }

    const container = containerRef.current;
    if (!container) return;

    const updateColumns = () => {
      const width = container.clientWidth;
      if (width >= 1536) setComputedColumns(7);
      else if (width >= 1280) setComputedColumns(6);
      else if (width >= 1024) setComputedColumns(5);
      else if (width >= 768) setComputedColumns(4);
      else if (width >= 640) setComputedColumns(3);
      else setComputedColumns(2);
    };

    updateColumns();
    const observer = new ResizeObserver(updateColumns);
    observer.observe(container);
    return () => observer.disconnect();
  }, [columnsProp]);

  const cols = columnsProp > 0 ? columnsProp : computedColumns;

  // Scroll focused item into view
  useEffect(() => {
    if (focusedIndex < 0 || focusedIndex >= itemCount) return;
    const el = itemRefs.current.get(focusedIndex);
    if (el) {
      el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
    onFocusChange?.(focusedIndex);
  }, [focusedIndex, itemCount, onFocusChange]);

  // Clamp focused index when items change
  useEffect(() => {
    if (itemCount === 0) {
      setFocusedIndex(-1);
    } else if (focusedIndex >= itemCount) {
      setFocusedIndex(itemCount - 1);
    }
  }, [itemCount, focusedIndex]);

  const handleNavigation = useCallback((key: string, e: React.KeyboardEvent) => {
    if (disabled || focusedIndex < 0 || itemCount === 0) return;

    let nextIndex = focusedIndex;
    const rows = Math.ceil(itemCount / cols);

    switch (key) {
      case 'ArrowDown':
      case 'j': {
        const currentRow = Math.floor(focusedIndex / cols);
        const currentCol = focusedIndex % cols;
        const nextRow = currentRow + 1;
        if (nextRow < rows) {
          nextIndex = Math.min(nextRow * cols + currentCol, itemCount - 1);
        } else if (loop) {
          nextIndex = currentCol;
        }
        break;
      }
      case 'ArrowUp':
      case 'k': {
        const currentRow = Math.floor(focusedIndex / cols);
        const currentCol = focusedIndex % cols;
        const nextRow = currentRow - 1;
        if (nextRow >= 0) {
          nextIndex = Math.min(nextRow * cols + currentCol, itemCount - 1);
        } else if (loop) {
          const lastRow = rows - 1;
          nextIndex = Math.min(lastRow * cols + currentCol, itemCount - 1);
        }
        break;
      }
      case 'ArrowRight':
      case 'l': {
        if (orientation === 'grid') {
          if (focusedIndex < itemCount - 1) {
            nextIndex = focusedIndex + 1;
          } else if (loop) {
            nextIndex = 0;
          }
        }
        break;
      }
      case 'ArrowLeft':
      case 'h': {
        if (orientation === 'grid') {
          if (focusedIndex > 0) {
            nextIndex = focusedIndex - 1;
          } else if (loop) {
            nextIndex = itemCount - 1;
          }
        }
        break;
      }
      case 'Home':
        nextIndex = 0;
        break;
      case 'End':
        nextIndex = itemCount - 1;
        break;
      case 'PageDown': {
        const currentRow = Math.floor(focusedIndex / cols);
        const visibleRows = containerRef.current
          ? Math.ceil(containerRef.current.clientHeight / 300) // approximate row height
          : 3;
        const targetRow = Math.min(currentRow + visibleRows, rows - 1);
        nextIndex = Math.min(targetRow * cols + (focusedIndex % cols), itemCount - 1);
        break;
      }
      case 'PageUp': {
        const currentRow = Math.floor(focusedIndex / cols);
        const visibleRows = containerRef.current
          ? Math.ceil(containerRef.current.clientHeight / 300)
          : 3;
        const targetRow = Math.max(currentRow - visibleRows, 0);
        nextIndex = Math.min(targetRow * cols + (focusedIndex % cols), itemCount - 1);
        break;
      }
      default:
        return; // Don't prevent default for unhandled keys
    }

    if (nextIndex !== focusedIndex) {
      e.preventDefault();
      isInternalRef.current = true;
      setFocusedIndex(nextIndex);
      // Focus the element after state update
      requestAnimationFrame(() => {
        const el = itemRefs.current.get(nextIndex);
        if (el) el.focus();
        isInternalRef.current = false;
      });
    }
  }, [disabled, focusedIndex, itemCount, cols, orientation, loop]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    // Skip when typing in inputs
    const target = e.target as HTMLElement;
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT' || target.isContentEditable) {
      return;
    }

    // Enter/Space to activate
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onSelect?.(focusedIndex);
      return;
    }

    // Navigation keys
    handleNavigation(e.key, e);
  }, [focusedIndex, handleNavigation, onSelect]);

  const handleContainerFocus = useCallback(() => {
    // If the container gets focus (e.g. via Tab), focus the current item
    if (!isInternalRef.current && focusedIndex >= 0 && focusedIndex < itemCount) {
      requestAnimationFrame(() => {
        const el = itemRefs.current.get(focusedIndex);
        if (el) el.focus();
      });
    }
  }, [focusedIndex, itemCount]);

  const getItemProps = useCallback((index: number) => {
    return {
      tabIndex: index === focusedIndex ? 0 : -1,
      'aria-selected': index === focusedIndex ? true : undefined,
      role: role === 'grid' ? 'gridcell' : 'option',
      ref: (el: HTMLElement | null) => {
        if (el) {
          itemRefs.current.set(index, el);
        } else {
          itemRefs.current.delete(index);
        }
      },
      onKeyDown: (e: React.KeyboardEvent) => {
        // Skip when typing in inputs inside the item
        const target = e.target as HTMLElement;
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT' || target.isContentEditable) {
          return;
        }

        // Enter/Space to activate
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          e.stopPropagation();
          onSelect?.(index);
          return;
        }

        // Arrow key navigation
        handleNavigation(e.key, e);
      },
    };
  }, [focusedIndex, handleNavigation, onSelect, role]);

  const containerProps = useMemo(() => ({
    ref: containerRef,
    role,
    'aria-label': ariaLabel,
    tabIndex: -1 as const,
    onKeyDown: handleKeyDown,
    onFocus: handleContainerFocus,
  }), [role, ariaLabel, handleKeyDown, handleContainerFocus]);

  return {
    containerProps,
    focusedIndex,
    setFocusedIndex,
    getItemProps,
    containerRef,
  };
}


/**
 * useFocusTrap — Traps Tab focus within a container element.
 * Used for modals, dialogs, and overlays.
 */

export function useFocusTrap(
  containerRef: React.RefObject<HTMLElement | null>,
  active: boolean = true,
) {
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!active || !containerRef.current) return;

    const container = containerRef.current;

    // Save previously focused element
    previouslyFocusedRef.current = document.activeElement as HTMLElement;

    // Focus the first focusable element in the container
    const focusFirst = () => {
      const focusable = container.querySelectorAll<HTMLElement>(
        'button, [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );
      if (focusable.length > 0) {
        focusable[0].focus();
      } else {
        // If no focusable element, make the container itself focusable
        container.setAttribute('tabindex', '0');
        container.focus();
      }
    };

    // Small delay to ensure the dialog is rendered
    const timer = setTimeout(focusFirst, 50);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      const focusable = container.querySelectorAll<HTMLElement>(
        'button, [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (e.shiftKey) {
        // Shift+Tab: if on first element, wrap to last
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        // Tab: if on last element, wrap to first
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      clearTimeout(timer);
      document.removeEventListener('keydown', handleKeyDown);
      // Restore focus to previously focused element
      if (previouslyFocusedRef.current && previouslyFocusedRef.current.isConnected) {
        previouslyFocusedRef.current.focus();
      }
    };
  }, [active, containerRef]);
}


/**
 * useAutoFocus — Automatically focuses the first focusable element
 * in a container when a condition is met (e.g. screen change).
 */

export function useAutoFocus(
  containerRef: React.RefObject<HTMLElement | null>,
  trigger: unknown,
) {
  const prevTrigger = useRef(trigger);

  useEffect(() => {
    // Only trigger when the 'trigger' value changes
    if (trigger === prevTrigger.current) return;
    prevTrigger.current = trigger;

    const container = containerRef.current;
    if (!container) return;

    // Small delay to ensure the new screen is rendered
    const timer = setTimeout(() => {
      // Try to find and focus the first focusable element
      const focusable = container.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), [tabindex="0"]:not([disabled])'
      );
      if (focusable.length > 0) {
        focusable[0].focus();
      }
    }, 100);

    return () => clearTimeout(timer);
  }, [trigger, containerRef]);
}
