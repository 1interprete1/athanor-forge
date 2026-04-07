/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ReactNode, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { PanelLeftClose, PanelLeftOpen, PanelRightClose, PanelRightOpen, ChevronLeft, ChevronRight, Menu, Settings, X } from 'lucide-react';
import { LayoutConfig } from '../types';
import { useStore } from '../contexts/StoreContext';

interface BentoShellProps {
  sidebar: ReactNode;
  stage: ReactNode;
  inspector: ReactNode;
  canvas?: ReactNode;
  initialLayout?: LayoutConfig;
  onLayoutChange?: (config: LayoutConfig) => void;
  canvasActive?: boolean;
}

export function BentoShell({ sidebar, stage, inspector, canvas, initialLayout, onLayoutChange, canvasActive }: BentoShellProps) {
  const { isMobile } = useStore();
  const [leftOpen, setLeftOpen] = useState(initialLayout?.leftPanelOpen ?? true);
  const [rightOpen, setRightOpen] = useState(initialLayout?.rightPanelOpen ?? true);
  const [touchStart, setTouchStart] = useState<{ x: number, y: number } | null>(null);

  useEffect(() => {
    if (initialLayout) {
      setLeftOpen(initialLayout.leftPanelOpen);
      setRightOpen(initialLayout.rightPanelOpen);
    }
  }, [initialLayout]);

  const handleLeftToggle = () => {
    const next = !leftOpen;
    setLeftOpen(next);
    if (isMobile && next) setRightOpen(false);
    onLayoutChange?.({ leftPanelOpen: next, rightPanelOpen: isMobile && next ? false : rightOpen });
  };

  const handleRightToggle = () => {
    const next = !rightOpen;
    setRightOpen(next);
    if (isMobile && next) setLeftOpen(false);
    onLayoutChange?.({ leftPanelOpen: isMobile && next ? false : leftOpen, rightPanelOpen: next });
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart({ x: e.touches[0].clientX, y: e.touches[0].clientY });
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStart) return;
    const touchEndX = e.changedTouches[0].clientX;
    const touchEndY = e.changedTouches[0].clientY;
    
    const deltaX = touchEndX - touchStart.x;
    const deltaY = touchEndY - touchStart.y;

    if (isMobile) {
      // Swipe down to close panels
      if (deltaY > 50 && Math.abs(deltaY) > Math.abs(deltaX)) {
        if (leftOpen) {
          setLeftOpen(false);
          onLayoutChange?.({ leftPanelOpen: false, rightPanelOpen: rightOpen });
        } else if (rightOpen) {
          setRightOpen(false);
          onLayoutChange?.({ leftPanelOpen: leftOpen, rightPanelOpen: false });
        }
      }
    } else {
      // Check if swipe is mostly horizontal and significant enough
      if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 40) {
        if (deltaX > 0) {
          // Swipe Right
          if (touchStart.x < 50 && !leftOpen) {
            // Open left panel if swiped from left edge
            setLeftOpen(true);
            onLayoutChange?.({ leftPanelOpen: true, rightPanelOpen: rightOpen });
          } else if (rightOpen && touchStart.x > window.innerWidth / 2) {
            // Close right panel if swiped right on the right side
            setRightOpen(false);
            onLayoutChange?.({ leftPanelOpen: leftOpen, rightPanelOpen: false });
          }
        } else {
          // Swipe Left
          if (touchStart.x > window.innerWidth - 50 && !rightOpen && !canvasActive) {
            // Open right panel if swiped from right edge
            setRightOpen(true);
            onLayoutChange?.({ leftPanelOpen: leftOpen, rightPanelOpen: true });
          } else if (leftOpen && touchStart.x < window.innerWidth / 2) {
            // Close left panel if swiped left on the left side
            setLeftOpen(false);
            onLayoutChange?.({ leftPanelOpen: false, rightPanelOpen: rightOpen });
          }
        }
      }
    }
    setTouchStart(null);
  };

  // Auto-collapse panels if screen is too narrow
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const handleResize = () => {
        if (window.innerWidth < 768) {
          // If screen is narrow, ensure at least one panel is closed to make room for center
          if (leftOpen && rightOpen) {
            setRightOpen(false);
            onLayoutChange?.({ leftPanelOpen: leftOpen, rightPanelOpen: false });
          }
        }
      };
      
      window.addEventListener('resize', handleResize);
      // Run once on mount
      handleResize();
      
      return () => window.removeEventListener('resize', handleResize);
    }
  }, [leftOpen, rightOpen, onLayoutChange]);

  return (
    <div 
      className="h-[100dvh] w-screen bg-[#0a0a0a] text-white flex overflow-hidden font-sans selection:bg-cyan-500/30 relative"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Mobile Backdrop */}
      <AnimatePresence>
        {isMobile && (leftOpen || rightOpen) && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => {
              setLeftOpen(false);
              setRightOpen(false);
              onLayoutChange?.({ leftPanelOpen: false, rightPanelOpen: false });
            }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm z-40"
          />
        )}
      </AnimatePresence>

      {/* Left Panel */}
      <AnimatePresence initial={false}>
        {leftOpen && (
          <motion.aside
            initial={isMobile ? { y: "100%", opacity: 0 } : { x: 0, width: 0, opacity: 0 }}
            animate={isMobile ? { y: 0, opacity: 1 } : { x: 0, width: 240, opacity: 1 }}
            exit={isMobile ? { y: "100%", opacity: 0 } : { x: 0, width: 0, opacity: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 200, duration: 0.3 }}
            className={isMobile 
              ? "fixed inset-x-0 bottom-0 top-14 bg-[#050505] z-50 rounded-t-2xl border-t border-zinc-800 shadow-2xl flex flex-col overflow-hidden" 
              : "border-r border-zinc-900 shadow-[inset_-1px_0_0_0_rgba(255,255,255,0.05)] flex flex-col bg-[#050505] backdrop-blur-xl shrink-0 overflow-hidden relative z-50"}
          >
            <div className={`${isMobile ? 'w-full' : 'w-60'} h-full flex flex-col relative`}>
              {isMobile && (
                <div className="flex items-center justify-center pt-3 pb-1 shrink-0">
                  <div className="w-12 h-1.5 bg-zinc-800 rounded-full" />
                </div>
              )}
              <div className={`flex items-center justify-between p-2 shrink-0 bg-[#050505] relative z-50 ${!isMobile ? 'border-b border-zinc-900/50 justify-end' : ''}`}>
                {isMobile && <span className="px-4 text-xs font-bold text-zinc-400 uppercase tracking-widest">Navigation</span>}
                <button 
                  onClick={() => {
                    setLeftOpen(false);
                    onLayoutChange?.({ leftPanelOpen: false, rightPanelOpen: rightOpen });
                  }} 
                  className="p-3 text-zinc-500 hover:text-white transition-colors rounded-lg hover:bg-white/5 min-w-[48px] min-h-[48px] flex items-center justify-center"
                  title="Close Panel"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              <div className="flex-1 min-h-0 relative z-10 overflow-y-auto">
                {sidebar}
              </div>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Center Panel */}
      <main className="flex-1 flex flex-col relative bg-[#0a0a0a] min-w-0 z-10">
        
        {/* Desktop Panel Toggles (Visible when panels are open and screen is narrow) */}
        {!isMobile && (leftOpen || rightOpen) && (
          <div className="absolute bottom-24 left-0 right-0 flex justify-center pointer-events-none z-[100]">
            <button
              onClick={() => {
                setLeftOpen(false);
                setRightOpen(false);
                onLayoutChange?.({ leftPanelOpen: false, rightPanelOpen: false });
              }}
              className="pointer-events-auto flex items-center gap-2 px-4 py-2 bg-zinc-900/90 border border-zinc-700/50 rounded-full text-xs font-bold text-zinc-400 hover:text-white hover:bg-zinc-800 shadow-[0_0_20px_rgba(0,0,0,0.8)] backdrop-blur-md transition-all"
            >
              <X className="w-4 h-4" />
              CLOSE SIDEBARS
            </button>
          </div>
        )}

        {/* Mobile Top Navigation Bar */}
        {isMobile && (
          <div className="absolute top-0 left-0 right-0 h-14 bg-[#050505]/95 backdrop-blur-xl z-[40] flex items-center justify-between px-2 border-b border-zinc-900 shadow-sm">
            <button 
              onClick={handleLeftToggle}
              className="p-3 text-zinc-400 hover:text-orange-400 transition-colors min-w-[48px] min-h-[48px] flex items-center justify-center"
            >
              <Menu className="w-6 h-6" />
            </button>
            <span className="font-mono text-[12px] font-bold tracking-[0.2em] text-zinc-300 uppercase">
              Athanor Forja
            </span>
            {!canvasActive ? (
              <button 
                onClick={handleRightToggle}
                className="p-3 text-zinc-400 hover:text-orange-400 transition-colors min-w-[48px] min-h-[48px] flex items-center justify-center"
              >
                <Settings className="w-6 h-6" />
              </button>
            ) : (
              <div className="w-[48px]" /> /* Spacer to keep title centered */
            )}
          </div>
        )}

        {/* Desktop Edge Tabs for toggles */}
        {!isMobile && (
          <>
            <motion.div 
              className="absolute top-1/2 -translate-y-1/2 z-[100]"
              animate={{ x: leftOpen ? 0 : 0 }} // No need to translate on desktop since panel pushes content
              transition={{ type: "spring", damping: 25, stiffness: 200, duration: 0.3 }}
              style={{ left: 0 }}
              drag="x"
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.2}
              onDragEnd={(e, info) => {
                const threshold = 20;
                if (info.offset.x > threshold && !leftOpen) handleLeftToggle();
                else if (info.offset.x < -threshold && leftOpen) handleLeftToggle();
              }}
            >
              <button 
                onClick={handleLeftToggle} 
                className="py-12 px-0.5 bg-transparent hover:bg-white/5 transition-colors flex items-center justify-center group touch-none h-32"
              >
                <div className="w-1 h-full bg-zinc-800/50 rounded-r-full group-hover:bg-orange-500/50 transition-colors flex items-center justify-center">
                  {leftOpen ? <ChevronLeft className="w-3 h-3 opacity-0 group-hover:opacity-100 text-orange-400 -ml-1" /> : <ChevronRight className="w-3 h-3 opacity-0 group-hover:opacity-100 text-orange-400 -ml-1" />}
                </div>
              </button>
            </motion.div>

            {!canvasActive && (
              <motion.div 
                className="absolute top-1/2 -translate-y-1/2 z-[100]"
                animate={{ x: rightOpen ? 0 : 0 }}
                transition={{ type: "spring", damping: 25, stiffness: 200, duration: 0.3 }}
                style={{ right: 0 }}
                drag="x"
                dragConstraints={{ left: 0, right: 0 }}
                dragElastic={0.2}
                onDragEnd={(e, info) => {
                  const threshold = 20;
                  if (info.offset.x < -threshold && !rightOpen) handleRightToggle();
                  else if (info.offset.x > threshold && rightOpen) handleRightToggle();
                }}
              >
                <button 
                  onClick={handleRightToggle} 
                  className="py-12 px-0.5 bg-transparent hover:bg-white/5 transition-colors flex items-center justify-center group touch-none h-32"
                >
                  <div className="w-1 h-full bg-zinc-800/50 rounded-l-full group-hover:bg-orange-500/50 transition-colors flex items-center justify-center">
                    {rightOpen ? <ChevronRight className="w-3 h-3 opacity-0 group-hover:opacity-100 text-orange-400 -mr-1" /> : <ChevronLeft className="w-3 h-3 opacity-0 group-hover:opacity-100 text-orange-400 -mr-1" />}
                  </div>
                </button>
              </motion.div>
            )}
          </>
        )}

        <motion.div 
          layout
          className={`flex-1 min-h-0 ${isMobile ? 'pt-14' : 'p-4'}`}
        >
          {stage}
        </motion.div>
      </main>

      {/* Right Panel / Canvas */}
      <AnimatePresence initial={false} mode="wait">
        {canvasActive ? (
          <motion.div 
            key="canvas"
            layout
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: isMobile ? '100vw' : 'auto', opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            className={`z-30 flex shrink-0 ${isMobile ? 'fixed inset-0 bg-[#0a0a0a]' : ''}`}
          >
            {canvas}
          </motion.div>
        ) : (
          rightOpen && (
            <motion.aside
              key="inspector"
              initial={isMobile ? { y: "100%", opacity: 0 } : { x: 0, width: 0, opacity: 0 }}
              animate={isMobile ? { y: 0, opacity: 1 } : { x: 0, width: 280, opacity: 1 }}
              exit={isMobile ? { y: "100%", opacity: 0 } : { x: 0, width: 0, opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 200, duration: 0.3 }}
              className={isMobile
                ? "fixed inset-x-0 bottom-0 top-14 bg-[#050505] z-50 rounded-t-2xl border-t border-zinc-800 shadow-2xl flex flex-col overflow-hidden"
                : "border-l border-zinc-900 shadow-[inset_1px_0_0_0_rgba(255,255,255,0.05)] flex flex-col bg-[#050505] backdrop-blur-xl shrink-0 overflow-hidden relative z-50"}
            >
              <div className={`${isMobile ? 'w-full' : 'w-70'} h-full flex flex-col relative`}>
                {isMobile && (
                  <div className="flex items-center justify-center pt-3 pb-1 shrink-0">
                    <div className="w-12 h-1.5 bg-zinc-800 rounded-full" />
                  </div>
                )}
                <div className={`flex items-center justify-between p-2 shrink-0 bg-[#050505] relative z-50 ${!isMobile ? 'border-b border-zinc-900/50 justify-start' : ''}`}>
                  {isMobile && <span className="px-4 text-xs font-bold text-zinc-400 uppercase tracking-widest">Configuration</span>}
                  <button 
                    onClick={() => {
                      setRightOpen(false);
                      onLayoutChange?.({ leftPanelOpen: leftOpen, rightPanelOpen: false });
                    }} 
                    className="p-3 text-zinc-500 hover:text-white transition-colors rounded-lg hover:bg-white/5 min-w-[48px] min-h-[48px] flex items-center justify-center"
                    title="Close Panel"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>
                <div className="flex-1 min-h-0 relative z-10 overflow-y-auto">
                  {inspector}
                </div>
              </div>
            </motion.aside>
          )
        )}
      </AnimatePresence>
    </div>
  );
}
