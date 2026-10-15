'use client';

import React from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';

export interface RewindOverlayProps {
  /** Hold progress from 0.0 to 1.0 */
  progress: number;
  /** Whether the overlay is visible (after initial hold delay threshold) */
  visible: boolean;
  /** Whether rewind has hit 100% and is executing completion confirmation */
  isCompleted?: boolean;
}

export function RewindOverlay({ progress, visible, isCompleted = false }: RewindOverlayProps) {
  const shouldReduceMotion = useReducedMotion();

  // Circle dimensions for a 96px x 96px circular progress indicator with 7px stroke
  const size = 96;
  const strokeWidth = 7;
  const center = size / 2; // 48
  const radius = center - strokeWidth / 2; // 44.5
  const circumference = 2 * Math.PI * radius; // ~279.6
  const clampedProgress = Math.min(Math.max(progress, 0), 1);
  const strokeDashoffset = circumference * (1 - clampedProgress);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="rewind-modal-overlay"
          initial={
            shouldReduceMotion
              ? { opacity: 0 }
              : { opacity: 0, scale: 0.96 }
          }
          animate={
            shouldReduceMotion
              ? { opacity: 1 }
              : { opacity: 1, scale: 1 }
          }
          exit={
            shouldReduceMotion
              ? { opacity: 0 }
              : { opacity: 0, scale: 0.96 }
          }
          transition={{ duration: 0.18, ease: 'easeOut' }}
          className="absolute inset-0 z-30 rounded-[32px] sm:rounded-[36px] md:rounded-[40px] flex flex-col items-center justify-center p-6 select-none pointer-events-none shadow-2xl"
          style={{
            backgroundColor: 'rgba(0, 0, 0, 0.55)',
            WebkitBackdropFilter: 'blur(6px)',
            backdropFilter: 'blur(6px)',
          }}
        >
          {/* Centered Ring + Icon Group with subtle completion scale pulse */}
          <motion.div
            animate={
              isCompleted && !shouldReduceMotion
                ? { scale: [1, 1.12, 1] }
                : { scale: 1 }
            }
            transition={{ duration: 0.15, ease: 'easeInOut' }}
            className="flex flex-col items-center justify-center"
          >
            {/* 96px Progress Ring and Rewind Icon */}
            <div className="relative w-24 h-24 flex items-center justify-center">
              <svg
                width={size}
                height={size}
                viewBox={`0 0 ${size} ${size}`}
                className="-rotate-90 pointer-events-none drop-shadow-md"
              >
                {/* Background Track: Faint white track */}
                <circle
                  cx={center}
                  cy={center}
                  r={radius}
                  fill="none"
                  stroke="rgba(255, 255, 255, 0.22)"
                  strokeWidth={strokeWidth}
                />
                {/* Dynamic Progress Stroke: Bright white */}
                <circle
                  cx={center}
                  cy={center}
                  r={radius}
                  fill="none"
                  stroke="#FFFFFF"
                  strokeWidth={strokeWidth}
                  strokeLinecap="round"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  style={{
                    transition: isCompleted ? 'stroke-dashoffset 80ms linear' : 'none',
                  }}
                />
              </svg>

              {/* White Rewind Icon inside the ring */}
              <div className="absolute inset-0 flex items-center justify-center text-white drop-shadow-sm">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="30"
                  height="30"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                  <path d="M3 3v5h5" />
                </svg>
              </div>
            </div>

            {/* Accessible Status Label */}
            <p
              role="status"
              aria-live="polite"
              className="mt-4 text-center font-bold text-white text-sm sm:text-base tracking-wide drop-shadow-md"
            >
              Rewinding to beginning...
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
