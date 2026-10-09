"use client";
import { useState, useRef, useEffect } from "react";
import { motion, PanInfo, AnimatePresence, MotionConfig, useReducedMotion } from "framer-motion";
import type { MemoryRecord, MediaRecord } from "@/lib/storage/schema";
import { isVideo } from "@/lib/media/validation";
import { Skeleton } from "@/components/ui/skeleton";

interface TimelineClientProps {
  memories: MemoryRecord[];
  media: MediaRecord[];
}

export default function TimelineClient({ memories, media }: TimelineClientProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState<1 | -1>(1);
  const [loadedIndices, setLoadedIndices] = useState<Set<number>>(new Set());
  const [isRewinding, setIsRewinding] = useState(false);
  const [showRewindHint, setShowRewindHint] = useState(false);
  const rewindTimeout = useRef<NodeJS.Timeout | null>(null);
  const rewindHintTimeout = useRef<NodeJS.Timeout | null>(null);
  const pointerDownTime = useRef<number>(0);
  const shouldReduceMotion = useReducedMotion();

  const isCurrentMediaLoaded = loadedIndices.has(currentIndex);

  const markLoaded = (idx: number) => {
    setLoadedIndices((prev) => {
      if (prev.has(idx)) return prev;
      const next = new Set(prev);
      next.add(idx);
      return next;
    });
  };

  // Windowed lazy-preloading pipeline for timeline images (current +- 2)
  useEffect(() => {
    if (typeof window === "undefined" || memories.length === 0) return;

    const windowStart = Math.max(0, currentIndex - 2);
    const windowEnd = Math.min(memories.length - 1, currentIndex + 2);

    for (let idx = windowStart; idx <= windowEnd; idx++) {
      const mem = memories[idx];
      if (!mem?.mediaId) continue;
      const m = media.find((item) => item.id === mem.mediaId);
      if (m && !isVideo(m.filename)) {
        const img = new Image();
        img.src = `/api/media/${m.filename}`;
        if (idx === currentIndex) {
          if (img.complete && img.naturalWidth > 0) {
            // Schedule via microtask or timer to avoid synchronous cascading render warning
            queueMicrotask(() => markLoaded(idx));
          } else {
            img.onload = () => markLoaded(idx);
          }
        }
      }
    }
  }, [currentIndex, memories, media]);

  // Safety fallback: if media fails to report loaded within 2.5s, clear skeleton
  useEffect(() => {
    const timer = setTimeout(() => {
      markLoaded(currentIndex);
    }, 2500);
    return () => clearTimeout(timer);
  }, [currentIndex]);

  // Dots Logic (Instagram style sliding window)
  const maxDots = 5;
  const startDotIndex = Math.max(0, Math.min(currentIndex - Math.floor(maxDots / 2), memories.length - maxDots));
  const endDotIndex = Math.min(memories.length, startDotIndex + maxDots);
  const visibleDots = memories.slice(startDotIndex, endDotIndex).map((_, idx) => startDotIndex + idx);

  const handleNext = () => {
    if (currentIndex < memories.length - 1) {
      setDirection(1);
      setCurrentIndex((prev) => prev + 1);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setDirection(-1);
      setCurrentIndex((prev) => prev - 1);
    }
  };

  const handleDragEnd = (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const offset = info.offset.x;
    const velocity = info.velocity.x;
    if (offset < -50 || velocity < -500) {
      handleNext();
    } else if (offset > 50 || velocity > 500) {
      handlePrev();
    }
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    pointerDownTime.current = Date.now();
    setIsRewinding(true);
    rewindTimeout.current = setTimeout(() => {
      setDirection(-1);
      setCurrentIndex(0);
      setIsRewinding(false);
      if (typeof navigator !== "undefined" && "vibrate" in navigator) {
        try {
          navigator.vibrate(30);
        } catch {}
      }
    }, 1500);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLButtonElement>) => {
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {}
    if (rewindTimeout.current) clearTimeout(rewindTimeout.current);
    setIsRewinding(false);

    // If pointer was held for less than 400ms, user tapped instead of holding -> display hint
    const elapsed = Date.now() - pointerDownTime.current;
    if (elapsed > 0 && elapsed < 400 && currentIndex > 0) {
      setShowRewindHint(true);
      if (rewindHintTimeout.current) clearTimeout(rewindHintTimeout.current);
      rewindHintTimeout.current = setTimeout(() => {
        setShowRewindHint(false);
      }, 1800);
    }
  };

  const activeMemory = memories[currentIndex];
  const activeMedia = activeMemory?.mediaId ? media.find((m) => m.id === activeMemory.mediaId) : null;
  const showStackPeek = currentIndex < memories.length - 1;
  const mediaSrc = activeMedia ? `/api/media/${activeMedia.filename}` : '';

  if (memories.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center text-center p-8 bg-white rounded-2xl border border-[#E5E7EB] shadow-sm max-w-sm z-10 relative">
        <h2 className="text-xl font-bold text-foreground mb-2">Our story</h2>
        <p className="text-sm text-muted">Our memories are still being written... Check back soon!</p>
      </div>
    );
  }

  return (
    <MotionConfig reducedMotion="user">
      <section aria-label="Memory timeline" className="flex flex-col items-center justify-center w-full max-w-lg z-0">
        {/* Memory progress dots */}
        <nav aria-label="Memory progress" className="mb-4 md:mb-5">
          <ol className="flex items-center justify-center gap-2 overflow-hidden h-4">
            <AnimatePresence mode="popLayout">
              {visibleDots.map((dotIdx) => {
                const isActive = dotIdx === currentIndex;
                return (
                  <motion.li
                    key={dotIdx}
                    layout
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{
                      width: isActive ? 24 : 8,
                      height: 8,
                      opacity: 1,
                      backgroundColor: isActive ? "#D4537E" : "#F1D6DE",
                    }}
                    exit={{ scale: 0.8, opacity: 0 }}
                    transition={{ type: "spring", stiffness: 350, damping: 25 }}
                    aria-current={isActive ? "step" : undefined}
                    className="rounded-full"
                  />
                );
              })}
            </AnimatePresence>
          </ol>
        </nav>

        {/* Card container with faux stack cue */}
        <div className="relative w-[clamp(260px,calc(100svh-17rem),420px)] max-w-full">
          {showStackPeek && (
            <div
              aria-hidden="true"
              className="absolute inset-0 translate-x-3.5 translate-y-2 rounded-[36px] md:rounded-[40px] border border-[#ECDCE3] bg-[#FCF8FA] shadow-[0_10px_35px_rgba(255,150,170,0.18)] -z-10"
            />
          )}

          <AnimatePresence mode="wait" custom={direction}>
            <motion.article
              key={currentIndex}
              custom={direction}
              drag="x"
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.2}
              onDragEnd={handleDragEnd}
              variants={{
                enter: (dir: number) => ({
                  opacity: 0,
                  x: shouldReduceMotion ? 0 : dir * 60,
                }),
                center: {
                  opacity: 1,
                  x: 0,
                },
                exit: (dir: number) => ({
                  opacity: 0,
                  x: shouldReduceMotion ? 0 : dir * -60,
                }),
              }}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{
                duration: shouldReduceMotion ? 0.15 : undefined,
                type: shouldReduceMotion ? "tween" : "spring",
                stiffness: 300,
                damping: 30,
              }}
              className="w-full rounded-[36px] md:rounded-[40px] bg-white border border-[#F1E8EC] shadow-[0_12px_40px_rgba(255,150,170,0.22)] overflow-hidden flex flex-col p-4 sm:p-5 cursor-grab active:cursor-grabbing select-none"
            >
              {/* Media figure */}
              <figure className="relative w-full aspect-square rounded-[26px] md:rounded-[28px] overflow-hidden bg-[#FAF7F8] flex items-center justify-center shrink-0 select-none [-webkit-touch-callout:none]">
                {activeMedia ? (
                  <>
                    {!isCurrentMediaLoaded && (
                      <Skeleton className="absolute inset-0 w-full h-full rounded-[26px] md:rounded-[28px]" />
                    )}
                    {isVideo(activeMedia.filename) ? (
                      <video
                        src={mediaSrc}
                        preload="metadata"
                        className={`w-full h-full object-cover transition-opacity duration-300 pointer-events-none ${
                          isCurrentMediaLoaded ? 'opacity-100' : 'opacity-0'
                        }`}
                        autoPlay
                        loop
                        muted
                        playsInline
                        onLoadedMetadata={() => markLoaded(currentIndex)}
                        onCanPlay={() => markLoaded(currentIndex)}
                        onLoadedData={() => markLoaded(currentIndex)}
                      />
                    ) : (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={mediaSrc}
                        alt="Memory media"
                        draggable={false}
                        ref={(el) => {
                          if (el && el.complete && el.naturalWidth > 0) {
                            markLoaded(currentIndex);
                          }
                        }}
                        style={{
                          objectPosition: `${activeMemory?.mediaPositionX ?? 50}% ${activeMemory?.mediaPositionY ?? 50}%`,
                          transform: `scale(${activeMemory?.mediaScale ?? 1})`,
                        }}
                        className={`w-full h-full object-cover transition-opacity duration-300 pointer-events-none ${
                          isCurrentMediaLoaded ? 'opacity-100' : 'opacity-0'
                        }`}
                        onLoad={() => markLoaded(currentIndex)}
                      />
                    )}
                  </>
                ) : (
                  <div className="text-muted text-sm px-4 text-center">No media available</div>
                )}
              </figure>

              {/* Integrated caption inside the card */}
              {(activeMemory?.heading || activeMemory?.text) && (
                <div className="flex flex-col items-center text-center justify-center pt-3 sm:pt-4 pb-1 px-2 w-full max-h-[22svh] overflow-y-auto overscroll-contain">
                  {activeMemory?.heading && (
                    <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-foreground leading-snug mb-1">
                      {activeMemory.heading}
                    </h2>
                  )}
                  {activeMemory?.text && (
                    <p className="text-xs sm:text-sm md:text-base text-foreground/80 leading-relaxed max-w-sm">
                      {activeMemory.text}
                    </p>
                  )}
                </div>
              )}
            </motion.article>
          </AnimatePresence>
        </div>

      {/* Unified control toolbar directly below the card */}
      <footer aria-label="Timeline navigation controls" className="flex items-center justify-center gap-4 mt-6 z-10">
        {/* Previous Button */}
        <button
          type="button"
          aria-label="Previous memory"
          onClick={handlePrev}
          disabled={currentIndex === 0}
          className="w-12 h-12 rounded-full bg-white hover:bg-gray-50 text-[#4B5563] hover:text-foreground border border-[#F1E8EC] shadow-sm flex items-center justify-center transition-all focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cta disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-white"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m15 18-6-6 6-6" /></svg>
        </button>

        {/* Rewind Button */}
        <div className="relative w-12 h-12 rounded-full bg-white border border-[#F1E8EC] shadow-sm flex items-center justify-center overflow-hidden group">
          <motion.div
            className="absolute inset-0 bg-[#D4537E] rounded-full origin-center"
            initial={{ scale: 0 }}
            animate={{ scale: isRewinding ? 1 : 0 }}
            transition={{ duration: isRewinding ? 1.5 : 0.2, ease: "linear" }}
          />
          <button
            type="button"
            aria-label="Rewind to beginning"
            onPointerDown={handlePointerDown}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            onPointerLeave={handlePointerUp}
            onContextMenu={(e) => e.preventDefault()}
            style={{ touchAction: 'none' }}
            className={`relative z-10 w-full h-full flex items-center justify-center transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cta rounded-full select-none ${
              isRewinding ? 'text-white' : 'text-[#6B7280] hover:text-foreground'
            }`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" /><path d="M3 3v5h5" /></svg>
            <span className="sr-only">Rewind</span>
          </button>
        </div>

        {/* Next Button - Primary Action */}
        <button
          type="button"
          aria-label="Next memory"
          onClick={handleNext}
          disabled={currentIndex === memories.length - 1}
          className="w-12 h-12 rounded-full bg-gradient-to-r from-[#F472B6] to-[#FB7185] hover:from-[#EC4899] hover:to-[#F43F5E] text-white shadow-[0_4px_16px_rgba(244,114,182,0.4)] hover:shadow-[0_6px_20px_rgba(244,114,182,0.55)] flex items-center justify-center transition-all focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cta disabled:opacity-40 disabled:from-gray-200 disabled:to-gray-200 disabled:text-gray-400 disabled:shadow-none disabled:cursor-not-allowed hover:scale-105 active:scale-95 disabled:hover:scale-100"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m9 18 6-6-6-6" /></svg>
        </button>
      </footer>

      {/* Rewind Hold Hint (shown on tap) */}
      <div className="h-6 mt-2 flex items-center justify-center">
        <AnimatePresence>
          {showRewindHint && (
            <motion.p
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              className="text-xs text-muted font-medium bg-white/80 backdrop-blur-xs px-3 py-1 rounded-full border border-[#F1E8EC] shadow-2xs"
            >
              Hold to rewind ↺
            </motion.p>
          )}
        </AnimatePresence>
      </div>
    </section>
  </MotionConfig>
  );
}
