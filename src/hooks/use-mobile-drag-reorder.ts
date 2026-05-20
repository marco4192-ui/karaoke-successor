'use client';

import { useState, useRef, useCallback } from 'react';

// ===================== TYPES =====================
export interface DragReorderConfig<T> {
  items: T[];
  onReorder: (newItems: T[]) => void;
  identifier: (item: T) => string;
}

export interface DragItemProps {
  onTouchStart: (e: React.TouchEvent) => void;
  onTouchMove: (e: React.TouchEvent) => void;
  onTouchEnd: (e: React.TouchEvent) => void;
  style: React.CSSProperties;
  'data-drag-id': string;
}

export interface UseMobileDragReorderReturn<T> {
  getItemProps: (item: T, index: number) => DragItemProps;
  isDragging: boolean;
}

const LONG_PRESS_MS = 300;
const SCROLL_THRESHOLD = 10; // px of movement before canceling as scroll

// ===================== HOOK =====================
export function useMobileDragReorder<T>({
  items,
  onReorder,
  identifier,
}: DragReorderConfig<T>): UseMobileDragReorderReturn<T> {
  const [isDragging, setIsDragging] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOffsetY, setDragOffsetY] = useState(0);
  const [overIndex, setOverIndex] = useState<number | null>(null);

  // Refs for touch tracking
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const touchStartY = useRef(0);
  const touchCurrentY = useRef(0);
  const isLongPressed = useRef(false);
  const draggedElRef = useRef<HTMLElement | null>(null);
  const itemHeightRef = useRef(0);
  const itemsRef = useRef(items);
  itemsRef.current = items;

  // Long press activation
  const handleTouchStart = useCallback(
    (e: React.TouchEvent, index: number) => {
      const touch = e.touches[0];
      touchStartY.current = touch.clientY;
      touchCurrentY.current = touch.clientY;
      isLongPressed.current = false;

      longPressTimer.current = setTimeout(() => {
        isLongPressed.current = true;
        setIsDragging(true);
        setDraggedIndex(index);
        setOverIndex(index);

        // Measure item height
        const target = e.currentTarget as HTMLElement;
        draggedElRef.current = target;
        itemHeightRef.current = target.offsetHeight;

        // Haptic feedback if available
        if (navigator.vibrate) {
          navigator.vibrate(10);
        }

        // Prevent scroll while dragging
        e.preventDefault();
      }, LONG_PRESS_MS);
    },
    []
  );

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      const touch = e.touches[0];
      const deltaY = touch.clientY - touchStartY.current;
      touchCurrentY.current = touch.clientY;

      // If not yet long-pressed, check if user is scrolling
      if (!isLongPressed.current) {
        if (Math.abs(deltaY) > SCROLL_THRESHOLD) {
          // Cancel long press — user is scrolling
          if (longPressTimer.current) {
            clearTimeout(longPressTimer.current);
            longPressTimer.current = null;
          }
          return;
        }
        return;
      }

      // Prevent scrolling while dragging
      e.preventDefault();

      // Calculate drag offset
      setDragOffsetY(deltaY);

      // Calculate which item we're over
      if (draggedElRef.current && itemHeightRef.current > 0) {
        const rect = draggedElRef.current.getBoundingClientRect();
        const containerTop = rect.top - dragOffsetY;
        const relativeY = touch.clientY - containerTop;
        const newIndex = Math.max(0, Math.min(items.length - 1, Math.floor(relativeY / itemHeightRef.current)));
        setOverIndex(newIndex);
      }
    },
    [items.length, dragOffsetY]
  );

  const handleTouchEnd = useCallback(() => {
    // Clear long press timer
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }

    // If we were dragging, finalize the reorder
    if (isLongPressed.current && draggedIndex !== null && overIndex !== null && draggedIndex !== overIndex) {
      const newItems = [...itemsRef.current];
      const [moved] = newItems.splice(draggedIndex, 1);
      newItems.splice(overIndex, 0, moved);
      onReorder(newItems);
    }

    // Reset state
    setIsDragging(false);
    setDraggedIndex(null);
    setDragOffsetY(0);
    setOverIndex(null);
    isLongPressed.current = false;
    draggedElRef.current = null;
  }, [draggedIndex, overIndex, onReorder]);

  const getItemProps = useCallback(
    (item: T, index: number): DragItemProps => {
      const id = identifier(item);
      const style: React.CSSProperties = {};

      if (isDragging && draggedIndex === index) {
        style.zIndex = 50;
        style.opacity = 0.85;
        style.transform = `translateY(${dragOffsetY}px) scale(1.02)`;
        style.boxShadow = '0 8px 25px rgba(0,0,0,0.3)';
        style.transition = 'transform 0.05s ease, box-shadow 0.05s ease';
      } else if (isDragging && overIndex !== null && draggedIndex !== null) {
        // Shift items to make room for the dragged item
        if (draggedIndex < overIndex && index > draggedIndex && index <= overIndex) {
          style.transform = `translateY(-${itemHeightRef.current}px)`;
          style.transition = 'transform 0.15s ease';
        } else if (draggedIndex > overIndex && index < draggedIndex && index >= overIndex) {
          style.transform = `translateY(${itemHeightRef.current}px)`;
          style.transition = 'transform 0.15s ease';
        }
      }

      return {
        onTouchStart: (e: React.TouchEvent) => handleTouchStart(e, index),
        onTouchMove: handleTouchMove,
        onTouchEnd: handleTouchEnd,
        style,
        'data-drag-id': id,
      };
    },
    [isDragging, draggedIndex, dragOffsetY, overIndex, identifier, handleTouchStart, handleTouchMove, handleTouchEnd]
  );

  return { getItemProps, isDragging };
}
