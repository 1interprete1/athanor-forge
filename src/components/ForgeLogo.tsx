import React from 'react';
import { motion } from 'motion/react';

export const ForgeLogo: React.FC<{ className?: string; size?: number; isStreaming?: boolean }> = ({ className = "", size = 32, isStreaming }) => {
  return (
    <div className={`relative flex items-center justify-center ${className}`} style={{ width: size, height: size }}>
      {/* Resplandor técnico (Calor emanando del metal) */}
      <div 
        className="absolute w-1/2 h-1/2 bg-orange-600/20 blur-xl rounded-full z-0"
        style={{ top: '25%', left: '25%' }}
      />
      
      <svg viewBox="0 0 100 100" width={size} height={size} fill="none" xmlns="http://www.w3.org/2000/svg" className="relative z-10">
        {/* Trazo 1: La Base (Zinc-600) */}
        <motion.rect
          x="10" y="70" width="80" height="10" rx="2"
          fill="#52525b" // Zinc-600
          initial={{ opacity: 0, scaleX: 0 }}
          animate={{ opacity: 1, scaleX: 1 }}
          transition={{ duration: 0.5 }}
        />

        {/* Trazo 2: El Arco (Línea fina y tensa) */}
        <motion.path
          d="M30 75 Q 50 20, 85 75"
          stroke="#a1a1aa" // Zinc-400
          strokeWidth="3"
          strokeLinecap="round"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.3 }}
        />
      </svg>
    </div>
  );
};
