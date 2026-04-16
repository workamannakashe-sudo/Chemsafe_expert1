import React from 'react';
import { motion } from 'motion/react';

interface ScannerOverlayProps {
  active?: boolean;
  theme?: 'dark' | 'light';
}

export const ScannerOverlay: React.FC<ScannerOverlayProps> = ({ active, theme }) => {
  const bracketPulse = {
    scale: active ? [1, 1.05, 1] : [1, 1.02, 1],
    opacity: active ? [0.8, 1, 0.8] : [0.5, 1, 0.5],
  };

  const bracketTransition = {
    duration: active ? 1 : 2,
    repeat: Infinity,
    ease: "easeInOut" as const
  };

  const isLight = theme === 'light';
  const maskColor = isLight ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.6)";
  const maskColorActive = isLight ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.7)";

  return (
    <div className="absolute inset-0 pointer-events-none z-10 overflow-hidden">
      {/* Darkened Mask with Hole */}
      <div className="absolute inset-0 flex items-center justify-center">
        <motion.div 
          animate={{ 
            boxShadow: [
              `0 0 0 1000px ${maskColor}`,
              `0 0 0 1000px ${maskColorActive}`,
              `0 0 0 1000px ${maskColor}`
            ]
          }}
          transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
          className="w-[85%] sm:w-[70%] md:w-[60%] lg:w-[75%] aspect-[1/1] sm:aspect-[4/3] md:aspect-[16/9] lg:aspect-[4/3] rounded-[32px] md:rounded-[40px] border-2 border-brand-emerald/30 relative"
        >
          {/* Corner Brackets (Relative to the hole) */}
          <motion.div 
            animate={bracketPulse}
            transition={bracketTransition}
            className="absolute -top-1 -left-1 w-12 h-12 border-t-4 border-l-4 border-brand-emerald rounded-tl-3xl" 
          />
          <motion.div 
            animate={bracketPulse}
            transition={bracketTransition}
            className="absolute -top-1 -right-1 w-12 h-12 border-t-4 border-r-4 border-brand-emerald rounded-tr-3xl" 
          />
          <motion.div 
            animate={bracketPulse}
            transition={bracketTransition}
            className="absolute -bottom-1 -left-1 w-12 h-12 border-b-4 border-l-4 border-brand-emerald rounded-bl-3xl" 
          />
          <motion.div 
            animate={bracketPulse}
            transition={bracketTransition}
            className="absolute -bottom-1 -right-1 w-12 h-12 border-b-4 border-r-4 border-brand-emerald rounded-br-3xl" 
          />

          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <motion.div 
              animate={{ 
                scale: active ? [1.1, 1.2, 1.1] : [1, 1.1, 1],
                opacity: active ? [0.6, 0.9, 0.6] : [0.3, 0.6, 0.3],
                rotate: active ? 90 : 0
              }}
              transition={{ duration: active ? 1 : 3, repeat: Infinity }}
              className="w-16 h-16 flex items-center justify-center"
            >
              {/* Target Crosshair */}
              <div className="absolute w-full h-[1px] bg-brand-emerald/20" />
              <div className="absolute h-full w-[1px] bg-brand-emerald/20" />
              <div className="w-2 h-2 border border-brand-emerald/50 rounded-full" />
            </motion.div>
          </div>

          {/* Alignment Markers (Sides) */}
          <div className="absolute inset-x-8 top-1/2 -translate-y-1/2 flex justify-between">
            <motion.div 
              animate={{ x: active ? [-10, 10, -10] : [-5, 5, -5], opacity: active ? [0.2, 0.8, 0.2] : 0.2 }}
              transition={{ duration: active ? 1.5 : 4, repeat: Infinity }}
              className="w-1 h-8 bg-brand-emerald rounded-full" 
            />
            <motion.div 
              animate={{ x: active ? [10, -10, 10] : [5, -5, 5], opacity: active ? [0.2, 0.8, 0.2] : 0.2 }}
              transition={{ duration: active ? 1.5 : 4, repeat: Infinity }}
              className="w-1 h-8 bg-brand-emerald rounded-full" 
            />
          </div>

          {/* Laser Line (Contained within the hole) */}
          <motion.div 
            className="absolute left-1/2 w-[90%] h-1 bg-gradient-to-r from-transparent via-brand-emerald to-transparent shadow-[0_0_20px_rgba(52,211,153,0.8)]"
            animate={{
              top: ['5%', '95%', '5%'],
              x: ['-50%', '-49.5%', '-50.5%', '-50%'],
              scaleX: [1, 1.05, 0.95, 1],
              opacity: active ? [0.6, 1, 0.6] : 1
            }}
            transition={{
              top: {
                duration: active ? 1.2 : 2.5,
                repeat: Infinity,
                ease: "easeInOut" as const
              },
              x: {
                duration: 0.15,
                repeat: Infinity,
                ease: "linear" as const
              },
              scaleX: {
                duration: 0.4,
                repeat: Infinity,
                ease: "easeInOut" as const
              },
              opacity: {
                duration: 0.5,
                repeat: Infinity
              }
            }}
          />
        </motion.div>
      </div>

      {/* Grid Pattern Overlay (Subtle) */}
      <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#10b981_1px,transparent_1px)] [background-size:20px_20px]" />
    </div>
  );
};
