import React, { useState, useRef, useEffect } from 'react';
import { ChevronRight } from 'lucide-react';

interface SwipeButtonProps {
  text: string;
  onSwipeComplete: () => void;
  activeColorClass?: string;
  icon?: React.ReactNode;
}

export const SwipeButton: React.FC<SwipeButtonProps> = ({
  text,
  onSwipeComplete,
  activeColorClass = 'bg-[#13AA52]',
  icon = <ChevronRight className="w-5 h-5 text-white" />,
}) => {
  const [dragProgress, setDragProgress] = useState<number>(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const handleRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef<boolean>(false);
  const startX = useRef<number>(0);
  const maxDragWidth = useRef<number>(0);

  // Recalculate max drag width when container size changes
  const updateMaxDragWidth = () => {
    if (containerRef.current && handleRef.current) {
      maxDragWidth.current = containerRef.current.clientWidth - handleRef.current.clientWidth - 8;
    }
  };

  useEffect(() => {
    updateMaxDragWidth();
    window.addEventListener('resize', updateMaxDragWidth);
    return () => window.removeEventListener('resize', updateMaxDragWidth);
  }, []);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    try {
      if (!containerRef.current || !handleRef.current) return;
      isDragging.current = true;
      startX.current = e.clientX;
      updateMaxDragWidth();
      handleRef.current.setPointerCapture(e.pointerId);
    } catch (err) {
      console.warn("PointerCapture failed:", err);
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging.current || maxDragWidth.current <= 0) return;
    const deltaX = e.clientX - startX.current;
    const clampedX = Math.max(0, Math.min(deltaX, maxDragWidth.current));
    const progress = (clampedX / maxDragWidth.current) * 100;
    setDragProgress(progress);

    if (progress >= 95) {
      isDragging.current = false;
      setDragProgress(100);
      onSwipeComplete();
      // Snap back shortly after completing to reset the visual state for the next phase
      setTimeout(() => {
        setDragProgress(0);
      }, 500);
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging.current) return;
    isDragging.current = false;
    if (dragProgress < 95) {
      setDragProgress(0);
    }
  };

  const handlePointerCancel = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging.current) return;
    isDragging.current = false;
    setDragProgress(0);
  };

  return (
    <div 
      ref={containerRef}
      className="relative w-full h-12 bg-gray-100 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-full flex items-center justify-center overflow-hidden select-none touch-none"
    >
      {/* Background tint based on progress */}
      <div 
        className={`absolute left-0 top-0 bottom-0 ${activeColorClass} opacity-10 transition-all duration-75`}
        style={{ width: `${dragProgress}%` }}
      />

      {/* Instructional text */}
      <span className="text-[10px] font-black uppercase tracking-wider text-gray-400 dark:text-zinc-500 animate-pulse pointer-events-none select-none z-10 font-sans">
        {text}
      </span>

      {/* Swipeable Thumb */}
      <div
        ref={handleRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
        className={`absolute left-1 top-1 bottom-1 w-10.5 rounded-full ${activeColorClass} hover:brightness-105 flex items-center justify-center shadow-md cursor-grab active:cursor-grabbing z-20 flex-col`}
        style={{ 
          transform: `translateX(${(dragProgress / 100) * (maxDragWidth.current || 0)}px)`,
          transition: isDragging.current ? 'none' : 'transform 200ms cubic-bezier(0.16, 1, 0.3, 1)'
        }}
      >
        {icon}
      </div>
    </div>
  );
};
