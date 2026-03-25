import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';

interface SimpleTooltipProps {
  content: string;
  children: React.ReactNode;
  position?: 'top' | 'right';
}

export function SimpleTooltip({ content, children, position = 'top' }: SimpleTooltipProps) {
  const [isVisible, setIsVisible] = useState(false);
  const triggerRef = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState({ top: 0, left: 0, width: 0, height: 0 });

  useEffect(() => {
    if (isVisible && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setCoords({
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height
      });
    }
  }, [isVisible]);

  return (
    <div 
      ref={triggerRef}
      className="relative inline-block"
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
    >
      {children}
      {isVisible && createPortal(
        <AnimatePresence>
          <motion.div
            initial={{ opacity: 0, y: position === 'top' ? 10 : 0, x: position === 'right' ? -10 : 0, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, x: 0, scale: 1 }}
            exit={{ opacity: 0, y: position === 'top' ? 10 : 0, x: position === 'right' ? -10 : 0, scale: 0.95 }}
            style={{
              position: 'fixed',
              top: position === 'top' ? coords.top - 8 : coords.top + coords.height / 2,
              left: position === 'top' ? coords.left + coords.width / 2 : coords.left + coords.width + 8,
              transform: position === 'top' ? 'translate(-50%, -100%)' : 'translate(0, -50%)',
            }}
            className="z-[10000] p-3 bg-neutral-900 border border-white/10 rounded-xl shadow-2xl pointer-events-none max-w-[250px] w-max whitespace-normal break-words"
          >
            <p className="text-[11px] leading-relaxed text-neutral-300 font-medium">
              {content}
            </p>
            {position === 'top' && (
              <div className="absolute top-full left-1/2 -translate-x-1/2 border-8 border-transparent border-t-neutral-900" />
            )}
            {position === 'right' && (
              <div className="absolute top-1/2 right-full -translate-y-1/2 border-8 border-transparent border-r-neutral-900" />
            )}
          </motion.div>
        </AnimatePresence>,
        document.body
      )}
    </div>
  );
}
