"use client";

import { motion } from "framer-motion";

export interface SwipeHintProps {
  isReducedMotion?: boolean | null;
  className?: string;
}

export function SwipeHint({ isReducedMotion = false, className = "" }: SwipeHintProps) {
  return (
    <motion.div
      aria-hidden="true"
      initial={{ opacity: 0 }}
      animate={
        isReducedMotion
          ? {
              opacity: [0, 0.9, 0.9, 0],
            }
          : {
              x: [32, -32, 32, -32],
              opacity: [0, 0.95, 0.95, 0, 0, 0.95, 0.95, 0],
            }
      }
      exit={{
        opacity: 0,
        transition: { duration: 0.15, ease: "easeOut" },
      }}
      transition={
        isReducedMotion
          ? {
              duration: 1.8,
              times: [0, 0.2, 0.8, 1],
              ease: "easeInOut",
            }
          : {
              x: {
                duration: 1.8,
                times: [0, 0.45, 0.5, 0.95],
                ease: ["easeOut", "linear", "easeOut", "linear"],
              },
              opacity: {
                duration: 1.8,
                times: [0, 0.08, 0.38, 0.48, 0.52, 0.6, 0.88, 0.98],
              },
            }
      }
      className={`pointer-events-none absolute bottom-16 sm:bottom-20 left-1/2 -translate-x-1/2 z-20 flex items-center justify-center select-none ${className}`}
    >
      {/* Frosted floating capsule with subtle trail and hand swipe icon */}
      <div className="relative flex items-center gap-2 px-3.5 py-2 rounded-full bg-white/90 backdrop-blur-md border border-[#F1D6DE] shadow-[0_4px_20px_rgba(212,83,126,0.22)]">
        {/* Directional swipe arrows */}
        <div className="flex items-center text-[#D4537E]">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="opacity-70 animate-pulse"
          >
            <path d="m15 18-6-6 6-6" />
          </svg>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="-ml-1.5"
          >
            <path d="m15 18-6-6 6-6" />
          </svg>
        </div>

        {/* Hand swipe icon */}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-[#D4537E]"
        >
          {/* Hand pointing / swiping gesture */}
          <path d="M18 11V6a2 2 0 0 0-4 0v4" />
          <path d="M14 10V4a2 2 0 0 0-4 0v6" />
          <path d="M10 10V2a2 2 0 0 0-4 0v11" />
          <path d="M6 13a5 5 0 0 0 10 3" />
        </svg>

        {/* Subtle text hint */}
        <span className="text-[11px] font-semibold tracking-wide text-[#D4537E] uppercase pr-0.5">
          Swipe
        </span>
      </div>
    </motion.div>
  );
}
export default SwipeHint;
