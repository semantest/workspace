import React, { useRef, useState, useEffect, ReactNode } from 'react';
import { clsx } from 'clsx';

interface SwipeableProps {
  children: ReactNode;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
  threshold?: number;
  className?: string;
}

export const Swipeable: React.FC<SwipeableProps> = ({
  children,
  onSwipeLeft,
  onSwipeRight,
  onSwipeUp,
  onSwipeDown,
  threshold = 50,
  className,
}) => {
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const touchEndX = useRef(0);
  const touchEndY = useRef(0);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.changedTouches[0].screenX;
    touchStartY.current = e.changedTouches[0].screenY;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    touchEndX.current = e.changedTouches[0].screenX;
    touchEndY.current = e.changedTouches[0].screenY;
    handleSwipe();
  };

  const handleSwipe = () => {
    const deltaX = touchEndX.current - touchStartX.current;
    const deltaY = touchEndY.current - touchStartY.current;
    const absDeltaX = Math.abs(deltaX);
    const absDeltaY = Math.abs(deltaY);

    if (absDeltaX > absDeltaY && absDeltaX > threshold) {
      if (deltaX > 0 && onSwipeRight) {
        onSwipeRight();
      } else if (deltaX < 0 && onSwipeLeft) {
        onSwipeLeft();
      }
    } else if (absDeltaY > threshold) {
      if (deltaY > 0 && onSwipeDown) {
        onSwipeDown();
      } else if (deltaY < 0 && onSwipeUp) {
        onSwipeUp();
      }
    }
  };

  return (
    <div
      className={className}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {children}
    </div>
  );
};

interface TouchButtonProps {
  children: ReactNode;
  onClick?: () => void;
  onLongPress?: () => void;
  longPressDelay?: number;
  hapticFeedback?: boolean;
  className?: string;
  disabled?: boolean;
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
}

export const TouchButton: React.FC<TouchButtonProps> = ({
  children,
  onClick,
  onLongPress,
  longPressDelay = 500,
  hapticFeedback = true,
  className,
  disabled = false,
  variant = 'primary',
  size = 'md',
}) => {
  const [isPressed, setIsPressed] = useState(false);
  const longPressTimer = useRef<number | null>(null);

  const handleTouchStart = () => {
    if (disabled) return;
    
    setIsPressed(true);
    
    if (hapticFeedback && 'vibrate' in navigator) {
      navigator.vibrate(10);
    }

    if (onLongPress) {
      longPressTimer.current = window.setTimeout(() => {
        onLongPress();
        if (hapticFeedback && 'vibrate' in navigator) {
          navigator.vibrate([50, 50, 50]);
        }
      }, longPressDelay);
    }
  };

  const handleTouchEnd = () => {
    setIsPressed(false);
    
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  const handleClick = () => {
    if (!disabled && onClick && !longPressTimer.current) {
      onClick();
    }
  };

  const baseStyles = 'touch-manipulation select-none transition-all duration-150';
  
  const sizeStyles = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-6 py-3 text-lg',
  };

  const variantStyles = {
    primary: clsx(
      'bg-indigo-600 text-white',
      'hover:bg-indigo-700 active:bg-indigo-800',
      'disabled:bg-gray-300 disabled:text-gray-500'
    ),
    secondary: clsx(
      'bg-gray-200 text-gray-900',
      'hover:bg-gray-300 active:bg-gray-400',
      'disabled:bg-gray-100 disabled:text-gray-400'
    ),
    ghost: clsx(
      'bg-transparent text-gray-700',
      'hover:bg-gray-100 active:bg-gray-200',
      'disabled:text-gray-400'
    ),
  };

  return (
    <button
      className={clsx(
        baseStyles,
        sizeStyles[size],
        variantStyles[variant],
        isPressed && 'scale-95',
        'rounded-lg font-medium',
        className
      )}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onClick={handleClick}
      disabled={disabled}
    >
      {children}
    </button>
  );
};

interface PullToRefreshProps {
  children: ReactNode;
  onRefresh: () => Promise<void>;
  threshold?: number;
  className?: string;
}

export const PullToRefresh: React.FC<PullToRefreshProps> = ({
  children,
  onRefresh,
  threshold = 80,
  className,
}) => {
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const startY = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (containerRef.current?.scrollTop === 0) {
      startY.current = e.touches[0].clientY;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!containerRef.current || containerRef.current.scrollTop > 0) return;
    
    const currentY = e.touches[0].clientY;
    const distance = Math.max(0, currentY - startY.current);
    
    if (distance > 0) {
      e.preventDefault();
      setPullDistance(Math.min(distance, threshold * 1.5));
    }
  };

  const handleTouchEnd = async () => {
    if (pullDistance > threshold && !isRefreshing) {
      setIsRefreshing(true);
      await onRefresh();
      setIsRefreshing(false);
    }
    setPullDistance(0);
  };

  const pullProgress = Math.min(pullDistance / threshold, 1);
  const rotation = pullProgress * 360;

  return (
    <div
      ref={containerRef}
      className={clsx('relative overflow-auto', className)}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <div
        className="absolute top-0 left-0 right-0 flex justify-center items-center transition-all duration-300"
        style={{
          height: `${pullDistance}px`,
          opacity: pullProgress,
        }}
      >
        <div
          className={clsx(
            'w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full',
            isRefreshing && 'animate-spin'
          )}
          style={{
            transform: `rotate(${rotation}deg)`,
          }}
        />
      </div>
      <div
        style={{
          transform: `translateY(${pullDistance}px)`,
          transition: pullDistance === 0 ? 'transform 0.3s' : 'none',
        }}
      >
        {children}
      </div>
    </div>
  );
};

interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
  snapPoints?: number[];
  className?: string;
}

export const BottomSheet: React.FC<BottomSheetProps> = ({
  isOpen,
  onClose,
  children,
  snapPoints = [0.25, 0.5, 0.9],
  className,
}) => {
  const [currentSnap, setCurrentSnap] = useState(1);
  const [isDragging, setIsDragging] = useState(false);
  const startY = useRef(0);
  const currentY = useRef(0);
  const sheetRef = useRef<HTMLDivElement>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    startY.current = e.touches[0].clientY;
    currentY.current = e.touches[0].clientY;
    setIsDragging(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return;
    currentY.current = e.touches[0].clientY;
    
    if (sheetRef.current) {
      const deltaY = currentY.current - startY.current;
      const currentHeight = window.innerHeight * snapPoints[currentSnap];
      const newHeight = Math.max(0, currentHeight - deltaY);
      sheetRef.current.style.height = `${newHeight}px`;
    }
  };

  const handleTouchEnd = () => {
    if (!isDragging) return;
    setIsDragging(false);
    
    const deltaY = currentY.current - startY.current;
    const threshold = window.innerHeight * 0.1;
    
    if (deltaY > threshold) {
      // Swipe down
      if (currentSnap > 0) {
        setCurrentSnap(currentSnap - 1);
      } else {
        onClose();
      }
    } else if (deltaY < -threshold && currentSnap < snapPoints.length - 1) {
      // Swipe up
      setCurrentSnap(currentSnap + 1);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-40"
        onClick={onClose}
      />
      <div
        ref={sheetRef}
        className={clsx(
          'fixed bottom-0 left-0 right-0 bg-white rounded-t-2xl shadow-2xl z-50',
          'transition-height duration-300 ease-out',
          className
        )}
        style={{
          height: `${snapPoints[currentSnap] * 100}vh`,
        }}
      >
        <div
          className="flex justify-center py-2 cursor-grab active:cursor-grabbing"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <div className="w-12 h-1.5 bg-gray-300 rounded-full" />
        </div>
        <div className="px-4 pb-4 overflow-auto h-full">
          {children}
        </div>
      </div>
    </>
  );
};