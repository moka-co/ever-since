'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  DEFAULT_VALENTINE_QUESTION,
  DEFAULT_VALENTINE_NO_MESSAGES,
  type ValentineConfig,
} from '@/lib/storage/schema';

export const VALENTINE_PROXIMITY_RADIUS_PX = 90;
export const VALENTINE_MAX_NO_TAPS = 5;
export const VALENTINE_YES_SCALE_STEPS = [1.0, 1.35, 1.75, 2.25, 2.9, 3.8] as const;
export const VALENTINE_NO_SCALE_STEPS = [1.0, 0.9, 0.8, 0.7, 0.6, 0] as const;
export const VALENTINE_NO_OPACITY_REDUCED_MOTION = [1.0, 0.8, 0.6, 0.4, 0.2, 0] as const;

export interface BoxRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export function getValentineButtonContourClasses(
  type: 'yes' | 'no',
  isClicked: boolean
): string {
  if (type === 'yes') {
    return isClicked
      ? 'border-white/50 ring-2 ring-[#FB7185]/70 ring-offset-2 ring-offset-white'
      : 'border-transparent ring-2 ring-transparent ring-offset-2 ring-offset-transparent active:border-white/40 active:ring-2 active:ring-[#FB7185]/60 active:ring-offset-2 active:ring-offset-white';
  }
  return isClicked
    ? 'border-[#F472B6]/70 ring-2 ring-[#F1D6DE] ring-offset-1 ring-offset-white shadow-md'
    : 'border-[#F1E8EC] ring-2 ring-transparent ring-offset-1 ring-offset-transparent active:border-[#F472B6]/60 active:ring-2 active:ring-[#F1D6DE] active:ring-offset-1 active:ring-offset-white';
}

export interface MobileValentineStepState {
  step: number;
  yesScale: number;
  noScale: number;
  noOpacity: number;
  noOffsetY: number;
  isNoHidden: boolean;
  activeMicrocopy: string | null;
}

export function getMobileValentineStepState(
  noTapCount: number,
  noMessages: string[] = DEFAULT_VALENTINE_NO_MESSAGES,
  isReducedMotion = false
): MobileValentineStepState {
  const step = Math.min(Math.max(0, Math.floor(noTapCount)), VALENTINE_MAX_NO_TAPS);
  const isNoHidden = step >= VALENTINE_MAX_NO_TAPS;
  const messages = noMessages.length > 0 ? noMessages : DEFAULT_VALENTINE_NO_MESSAGES;
  const activeMicrocopy =
    step > 0 ? messages[Math.min(step - 1, messages.length - 1)] ?? null : null;

  if (isReducedMotion) {
    return {
      step,
      yesScale: 1.0,
      noScale: 1.0,
      noOpacity: VALENTINE_NO_OPACITY_REDUCED_MOTION[step] ?? 0,
      noOffsetY: 0,
      isNoHidden,
      activeMicrocopy,
    };
  }

  return {
    step,
    yesScale: VALENTINE_YES_SCALE_STEPS[step] ?? 3.8,
    noScale: VALENTINE_NO_SCALE_STEPS[step] ?? 0,
    noOpacity: isNoHidden ? 0 : 1,
    noOffsetY: step * 20,
    isNoHidden,
    activeMicrocopy,
  };
}

export function isPointerWithinProximity(
  pointerX: number,
  pointerY: number,
  noCenterX: number,
  noCenterY: number,
  radius: number = VALENTINE_PROXIMITY_RADIUS_PX
): boolean {
  const dx = pointerX - noCenterX;
  const dy = pointerY - noCenterY;
  return Math.hypot(dx, dy) <= radius;
}

export function rectsOverlap(a: BoxRect, b: BoxRect, buffer = 0): boolean {
  return !(
    a.x + a.width <= b.x - buffer ||
    a.x >= b.x + b.width + buffer ||
    a.y + a.height <= b.y - buffer ||
    a.y >= b.y + b.height + buffer
  );
}

export interface DodgeCalculationInput {
  stageWidth: number;
  stageHeight: number;
  noWidth: number;
  noHeight: number;
  pointerX: number;
  pointerY: number;
  yesRect: BoxRect;
  headingRect: BoxRect;
  rng?: () => number;
}

export function computeSafeDodgePosition({
  stageWidth,
  stageHeight,
  noWidth,
  noHeight,
  pointerX,
  pointerY,
  yesRect,
  headingRect,
  rng = Math.random,
}: DodgeCalculationInput): { x: number; y: number } {
  const edgePadding = 16;
  const minX = edgePadding;
  const maxX = Math.max(minX, stageWidth - noWidth - edgePadding);
  const minY = edgePadding;
  const maxY = Math.max(minY, stageHeight - noHeight - edgePadding);

  let bestCandidate = { x: minX, y: maxY };
  let bestScore = -Infinity;

  for (let i = 0; i < 36; i++) {
    const candX = Math.round(minX + rng() * (maxX - minX));
    const candY = Math.round(minY + rng() * (maxY - minY));
    const candRect: BoxRect = {
      x: candX,
      y: candY,
      width: noWidth,
      height: noHeight,
    };

    const overlapsYes = rectsOverlap(candRect, yesRect, 24);
    const overlapsHeading = rectsOverlap(candRect, headingRect, 18);

    const candCenterX = candX + noWidth / 2;
    const candCenterY = candY + noHeight / 2;
    const distFromPointer = Math.hypot(candCenterX - pointerX, candCenterY - pointerY);

    if (!overlapsYes && !overlapsHeading && distFromPointer >= VALENTINE_PROXIMITY_RADIUS_PX + 20) {
      return { x: candX, y: candY };
    }

    const penalty = (overlapsYes ? 1000 : 0) + (overlapsHeading ? 800 : 0);
    const score = distFromPointer - penalty;
    if (score > bestScore) {
      bestScore = score;
      bestCandidate = { x: candX, y: candY };
    }
  }

  return bestCandidate;
}

interface ValentineMemoryProps {
  heading: string | null;
  config: ValentineConfig | null | undefined;
  isReducedMotion: boolean;
  isLastCard: boolean;
  onYes: () => void;
}

export default function ValentineMemory({
  heading,
  config,
  isReducedMotion,
  isLastCard,
  onYes,
}: ValentineMemoryProps) {
  const questionText = heading?.trim() || DEFAULT_VALENTINE_QUESTION;
  const yesLabel = config?.yesLabel?.trim() || 'Yes';
  const noLabel = config?.noLabel?.trim() || 'No';
  const noMessages =
    config?.noMessages && config.noMessages.length > 0
      ? config.noMessages
      : DEFAULT_VALENTINE_NO_MESSAGES;

  const [inputMode, setInputMode] = useState<'desktop' | 'mobile'>('mobile');
  const [noTapCount, setNoTapCount] = useState(0);
  const [dodgePosition, setDodgePosition] = useState<{ x: number; y: number } | null>(null);
  const [resolvedOnLastCard, setResolvedOnLastCard] = useState(false);
  const [isYesClicked, setIsYesClicked] = useState(false);
  const [isNoClicked, setIsNoClicked] = useState(false);

  const stageRef = useRef<HTMLDivElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const yesBtnRef = useRef<HTMLButtonElement>(null);
  const noBtnRef = useRef<HTMLButtonElement>(null);
  const yesClickTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const noClickTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (yesClickTimeoutRef.current) clearTimeout(yesClickTimeoutRef.current);
      if (noClickTimeoutRef.current) clearTimeout(noClickTimeoutRef.current);
    };
  }, []);

  // Detect input mode using media queries inside useEffect (hydration-safe)
  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;

    const desktopQuery = window.matchMedia('(hover: hover) and (pointer: fine)');
    const mobileQuery = window.matchMedia('(hover: none) and (pointer: coarse)');

    const updateMode = () => {
      if (desktopQuery.matches && !mobileQuery.matches) {
        setInputMode('desktop');
      } else {
        setInputMode('mobile');
      }
    };

    queueMicrotask(updateMode);

    desktopQuery.addEventListener('change', updateMode);
    mobileQuery.addEventListener('change', updateMode);
    return () => {
      desktopQuery.removeEventListener('change', updateMode);
      mobileQuery.removeEventListener('change', updateMode);
    };
  }, []);

  // Lock body & document scroll during the Valentine interaction
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const prevBodyOverflow = document.body.style.overflow;
    const prevHtmlOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevBodyOverflow;
      document.documentElement.style.overflow = prevHtmlOverflow;
    };
  }, []);

  const triggerDodge = useCallback(
    (clientX: number, clientY: number) => {
      if (isReducedMotion || resolvedOnLastCard) return;
      const stageEl = stageRef.current;
      const yesEl = yesBtnRef.current;
      const noEl = noBtnRef.current;
      const headingEl = headingRef.current;
      if (!stageEl || !yesEl || !noEl || !headingEl) return;

      const stageRect = stageEl.getBoundingClientRect();
      const yesRectRaw = yesEl.getBoundingClientRect();
      const noRectRaw = noEl.getBoundingClientRect();
      const headingRectRaw = headingEl.getBoundingClientRect();

      const pointerX = clientX - stageRect.left;
      const pointerY = clientY - stageRect.top;

      const yesRect: BoxRect = {
        x: yesRectRaw.left - stageRect.left,
        y: yesRectRaw.top - stageRect.top,
        width: yesRectRaw.width,
        height: yesRectRaw.height,
      };
      const headingRect: BoxRect = {
        x: headingRectRaw.left - stageRect.left,
        y: headingRectRaw.top - stageRect.top,
        width: headingRectRaw.width,
        height: headingRectRaw.height,
      };

      const nextPos = computeSafeDodgePosition({
        stageWidth: stageRect.width,
        stageHeight: stageRect.height,
        noWidth: noRectRaw.width || 100,
        noHeight: noRectRaw.height || 48,
        pointerX,
        pointerY,
        yesRect,
        headingRect,
      });

      setDodgePosition(nextPos);
    },
    [isReducedMotion, resolvedOnLastCard]
  );

  const handleStagePointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (inputMode !== 'desktop' || isReducedMotion || resolvedOnLastCard) return;
      const noEl = noBtnRef.current;
      if (!noEl) return;
      const noRect = noEl.getBoundingClientRect();
      const noCenterX = noRect.left + noRect.width / 2;
      const noCenterY = noRect.top + noRect.height / 2;

      if (
        isPointerWithinProximity(
          e.clientX,
          e.clientY,
          noCenterX,
          noCenterY,
          VALENTINE_PROXIMITY_RADIUS_PX
        )
      ) {
        triggerDodge(e.clientX, e.clientY);
      }
    },
    [inputMode, isReducedMotion, resolvedOnLastCard, triggerDodge]
  );

  const handleNoClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (resolvedOnLastCard) return;

    // Trigger subtle contour visual feedback
    setIsNoClicked(true);
    if (noClickTimeoutRef.current) clearTimeout(noClickTimeoutRef.current);
    noClickTimeoutRef.current = setTimeout(() => {
      setIsNoClicked(false);
    }, 300);

    // On desktop with pointer click (not keyboard), dodge away if somehow clicked
    if (inputMode === 'desktop' && !isReducedMotion && e.detail > 0) {
      triggerDodge(e.clientX, e.clientY);
      return;
    }
    setNoTapCount((prev) => Math.min(prev + 1, VALENTINE_MAX_NO_TAPS));
  };

  const handleYesClick = () => {
    // Trigger subtle contour visual feedback
    setIsYesClicked(true);
    if (yesClickTimeoutRef.current) clearTimeout(yesClickTimeoutRef.current);
    yesClickTimeoutRef.current = setTimeout(() => {
      setIsYesClicked(false);
    }, 300);

    if (isLastCard) {
      setResolvedOnLastCard(true);
    }
    onYes();
  };

  const mobileState = getMobileValentineStepState(noTapCount, noMessages, isReducedMotion);

  return (
    <div
      ref={stageRef}
      onPointerMove={handleStagePointerMove}
      className="absolute inset-0 z-20 flex flex-col items-center justify-center px-4 py-6 overflow-hidden select-none"
    >
      {/* Decorative heart badge */}
      <div
        aria-hidden="true"
        className="w-12 h-12 rounded-full bg-white/90 border border-[#F1E8EC] shadow-[0_6px_20px_rgba(212,83,126,0.16)] flex items-center justify-center mb-4 text-xl shrink-0"
      >
        💘
      </div>

      {/* Question Heading */}
      <h2
        ref={headingRef}
        className="text-2xl sm:text-3xl font-bold text-foreground text-center leading-snug max-w-[300px] sm:max-w-sm px-2 z-20"
      >
        {questionText}
      </h2>

      {/* Mobile / Reduced-motion Microcopy Feedback */}
      <div className="min-h-[2.25rem] mt-2 mb-4 flex items-center justify-center z-20">
        <AnimatePresence mode="wait">
          {resolvedOnLastCard ? (
            <motion.p
              key="resolved-copy"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.15 }}
              className="text-sm font-semibold text-[#D4537E] bg-white/90 border border-[#F1D6DE] px-3.5 py-1 rounded-full shadow-2xs"
            >
              ♥ Forever &amp; always!
            </motion.p>
          ) : mobileState.activeMicrocopy ? (
            <motion.p
              key={`microcopy-${mobileState.step}`}
              initial={{ opacity: 0, y: isReducedMotion ? 0 : 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: isReducedMotion ? 0 : -4 }}
              transition={{ duration: 0.15 }}
              className="text-xs sm:text-sm font-semibold text-[#D4537E] bg-white/90 border border-[#F1D6DE] px-3.5 py-1 rounded-full shadow-2xs text-center"
            >
              {mobileState.activeMicrocopy}
            </motion.p>
          ) : null}
        </AnimatePresence>
      </div>

      {/* Interactive Buttons Area */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-4 w-full min-h-[160px]">
        {/* Yes Button — ALWAYS first in tab order */}
        <motion.button
          ref={yesBtnRef}
          type="button"
          onClick={handleYesClick}
          animate={{
            scale: resolvedOnLastCard ? 1.1 : mobileState.yesScale,
          }}
          transition={
            isReducedMotion
              ? { duration: 0.15 }
              : { type: 'spring', stiffness: 320, damping: 22 }
          }
          className={`relative z-30 rounded-full px-8 py-3.5 text-base font-bold text-white bg-gradient-to-r from-[#F472B6] to-[#FB7185] hover:from-[#EC4899] hover:to-[#F43F5E] shadow-[0_6px_24px_rgba(244,114,182,0.45)] hover:shadow-[0_8px_28px_rgba(244,114,182,0.6)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-cta cursor-pointer transition-all duration-200 border ${getValentineButtonContourClasses(
            'yes',
            isYesClicked
          )}`}
        >
          {resolvedOnLastCard ? `♥ ${yesLabel}!` : yesLabel}
        </motion.button>

        {/* No Button — Dodges on desktop pointer proximity, shrinks/disappears after 5 taps on mobile */}
        {!resolvedOnLastCard && (
          <button
            ref={noBtnRef}
            type="button"
            onClick={handleNoClick}
            onPointerEnter={(e) => {
              if (inputMode === 'desktop' && !isReducedMotion) {
                triggerDodge(e.clientX, e.clientY);
              }
            }}
            disabled={mobileState.isNoHidden}
            aria-hidden={mobileState.isNoHidden ? 'true' : undefined}
            tabIndex={mobileState.isNoHidden ? -1 : 0}
            style={
              dodgePosition && inputMode === 'desktop' && !isReducedMotion
                ? {
                    position: 'absolute',
                    left: 0,
                    top: 0,
                    transform: `translate3d(${dodgePosition.x}px, ${dodgePosition.y}px, 0)`,
                  }
                : {
                    transform: isReducedMotion
                      ? undefined
                      : `translate3d(0, ${mobileState.noOffsetY}px, 0) scale(${mobileState.noScale})`,
                    opacity: mobileState.noOpacity,
                  }
            }
            className={`z-20 rounded-full px-7 py-3 text-sm font-semibold text-[#4B5563] bg-white hover:bg-gray-50 border shadow-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cta transition-all duration-200 ease-out motion-reduce:transition-opacity ${getValentineButtonContourClasses(
              'no',
              isNoClicked
            )} ${
              mobileState.isNoHidden
                ? 'opacity-0 pointer-events-none cursor-default'
                : 'cursor-pointer'
            }`}
          >
            {noLabel}
          </button>
        )}
      </div>
    </div>
  );
}
