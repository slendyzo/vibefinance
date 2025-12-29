"use client";

import { useCallback, useRef, useState } from "react";

interface SwipeState {
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
  isSwiping: boolean;
}

interface UseSwipeOptions {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
  threshold?: number; // Minimum distance to trigger swipe
  preventScroll?: boolean; // Prevent vertical scroll during horizontal swipe
}

export function useSwipe(options: UseSwipeOptions = {}) {
  const {
    onSwipeLeft,
    onSwipeRight,
    onSwipeUp,
    onSwipeDown,
    threshold = 50,
    preventScroll = false,
  } = options;

  const swipeState = useRef<SwipeState>({
    startX: 0,
    startY: 0,
    currentX: 0,
    currentY: 0,
    isSwiping: false,
  });

  const [deltaX, setDeltaX] = useState(0);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    swipeState.current = {
      startX: touch.clientX,
      startY: touch.clientY,
      currentX: touch.clientX,
      currentY: touch.clientY,
      isSwiping: true,
    };
    setDeltaX(0);
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!swipeState.current.isSwiping) return;

    const touch = e.touches[0];
    swipeState.current.currentX = touch.clientX;
    swipeState.current.currentY = touch.clientY;

    const dx = touch.clientX - swipeState.current.startX;
    const dy = touch.clientY - swipeState.current.startY;

    // If horizontal swipe is larger than vertical, prevent scroll
    if (preventScroll && Math.abs(dx) > Math.abs(dy)) {
      e.preventDefault();
    }

    setDeltaX(dx);
  }, [preventScroll]);

  const handleTouchEnd = useCallback(() => {
    if (!swipeState.current.isSwiping) return;

    const dx = swipeState.current.currentX - swipeState.current.startX;
    const dy = swipeState.current.currentY - swipeState.current.startY;

    const isHorizontalSwipe = Math.abs(dx) > Math.abs(dy);

    if (isHorizontalSwipe) {
      if (dx > threshold && onSwipeRight) {
        onSwipeRight();
      } else if (dx < -threshold && onSwipeLeft) {
        onSwipeLeft();
      }
    } else {
      if (dy > threshold && onSwipeDown) {
        onSwipeDown();
      } else if (dy < -threshold && onSwipeUp) {
        onSwipeUp();
      }
    }

    swipeState.current.isSwiping = false;
    setDeltaX(0);
  }, [threshold, onSwipeLeft, onSwipeRight, onSwipeUp, onSwipeDown]);

  return {
    handlers: {
      onTouchStart: handleTouchStart,
      onTouchMove: handleTouchMove,
      onTouchEnd: handleTouchEnd,
    },
    deltaX,
    isSwiping: swipeState.current.isSwiping,
  };
}
