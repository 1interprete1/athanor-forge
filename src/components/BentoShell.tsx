/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ReactNode, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { PanelLeftClose, PanelLeftOpen, PanelRightClose, PanelRightOpen } from 'lucide-react';
import { LayoutConfig } from '../types';

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
  const [leftOpen, setLeftOpen] = useState(initialLayout?.leftPanelOpen ?? true);
  const [rightOpen, setRightOpen] = useState(initialLayout?.rightPanelOpen ?? true);

  const handleLeftToggle = () => {
    const next = !leftOpen;
    setLeftOpen(next);
    onLayoutChange?.({ leftPanelOpen: next, rightPanelOpen: rightOpen });
  };

  const handleRightToggle = () => {
    const next = !rightOpen;
    setRightOpen(next);
    onLayoutChange?.({ leftPanelOpen: leftOpen, rightPanelOpen: next });
  };

  return (
    <div className="h-screen w-screen bg-[#0a0a0a] text-white flex overflow-hidden font-sans selection:bg-cyan-500/30">
      {/* Left Panel */}
      <AnimatePresence initial={false}>
        {leftOpen && (
          <motion.aside
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 288, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ 
              type: "tween", 
              ease: [0.23, 1, 0.32, 1], 
              duration: 0.3 
            }}
            className="border-r border-zinc-900 shadow-[inset_-1px_0_0_0_rgba(255,255,255,0.05)] flex flex-col bg-[#050505] backdrop-blur-xl shrink-0 overflow-hidden z-20"
          >
            <div className="w-72 h-full flex flex-col">
              {sidebar}
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Center Panel */}
      <main className="flex-1 flex flex-col relative bg-[#0a0a0a] min-w-0 z-10">
        {/* Top bar for toggles */}
        <div className="absolute top-4 left-4 z-20 flex items-center gap-2">
          <button onClick={handleLeftToggle} className="p-2 rounded-lg bg-neutral-900/80 border border-zinc-800/50 hover:bg-orange-500/20 hover:text-orange-400 transition-colors backdrop-blur-md text-neutral-400">
            {leftOpen ? <PanelLeftClose className="w-4 h-4" /> : <PanelLeftOpen className="w-4 h-4" />}
          </button>
        </div>
        <div className="absolute top-4 right-4 z-20 flex items-center gap-2">
          {!canvasActive && (
            <button onClick={handleRightToggle} className="p-2 rounded-lg bg-neutral-900/80 border border-zinc-800/50 hover:bg-orange-500/20 hover:text-orange-400 transition-colors backdrop-blur-md text-neutral-400">
              {rightOpen ? <PanelRightClose className="w-4 h-4" /> : <PanelRightOpen className="w-4 h-4" />}
            </button>
          )}
        </div>

        <motion.div 
          layout
          className="flex-1 p-6 min-h-0"
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
            animate={{ width: 'auto', opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            className="z-30 flex shrink-0"
          >
            {canvas}
          </motion.div>
        ) : (
          rightOpen && (
            <motion.aside
              key="inspector"
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 320, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ 
                type: "tween", 
                ease: [0.23, 1, 0.32, 1], 
                duration: 0.3 
              }}
              className="border-l border-zinc-900 shadow-[inset_1px_0_0_0_rgba(255,255,255,0.05)] flex flex-col bg-[#050505] backdrop-blur-xl shrink-0 overflow-hidden z-20"
            >
              <div className="w-80 h-full flex flex-col">
                {inspector}
              </div>
            </motion.aside>
          )
        )}
      </AnimatePresence>
    </div>
  );
}
