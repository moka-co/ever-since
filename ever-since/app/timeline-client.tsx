"use client";
import { useState, useRef, useEffect } from "react";
import { motion, PanInfo, AnimatePresence, MotionConfig, useReducedMotion } from "framer-motion";
import {
  getPhotoFramingStyle,
  type MemoryRecord,
  type MediaRecord,
} from "@/lib/storage/schema";
import { isVideo } from "@/lib/media/validation";
import { Skeleton } from "@/components/ui/skeleton";
import { useSwipeHint, shouldPlayCardPeek } from "@/lib/hooks/use-swipe-hint";
import SwipeHint from "@/components/swipe-hint";
import ValentineMemory from "@/components/valentine-memory";

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
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [resolvedValentineIds, setResolvedValentineIds] = useState<Set<string>>(new Set());
  const videoRef = useRef<HTMLVideoElement>(null);
  const rewindTimeout = useRef<NodeJS.Timeout | null>(null);
  const rewindHintTimeout = useRef<NodeJS.Timeout | null>(null);
  const pointerDownTime = useRef<number>(0);
  const shouldReduceMotion = useReducedMotion();
  const isFirstCardUnresolvedValentine =
    memories[0]?.type === "valentine" && !resolvedValentineIds.has(memories[0].id);
  const { isHintActive, dismissPermanently } = useSwipeHint({
    enabled: currentIndex === 0 && memories.length > 1 && !isFirstCardUnresolvedValentine,
  });

  // Permanently dismiss hint once user has advanced beyond the first card
  useEffect(() => {
    if (currentIndex > 0) {
      dismissPermanently();
    }
  }, [currentIndex, dismissPermanently]);

  // Pause video and reset time when navigating memories
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
    }
  }, [currentIndex]);

  const togglePlayPause = () => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      // Direct user interaction gesture unblocks unmuted audio in Brave/Chrome/Safari
      videoRef.current.muted = false;
      videoRef.current
        .play()
        .then(() => {
          setIsPlaying(true);
        })
        .catch((err) => {
          console.warn("Playback error:", err);
          if (videoRef.current) {
            videoRef.current.muted = true;
            videoRef.current
              .play()
              .then(() => setIsPlaying(true))
              .catch(() => {});
          }
        });
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  };

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
    setIsPlaying(false);
    dismissPermanently();
    if (currentIndex < memories.length - 1) {
      setDirection(1);
      setCurrentIndex((prev) => prev + 1);
    }
  };

  const handlePrev = () => {
    setIsPlaying(false);
    if (currentIndex > 0) {
      setDirection(-1);
      setCurrentIndex((prev) => prev - 1);
    }
  };

  const handleLike = () => {
    if (!isLiked) {
      setIsLiked(true);
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
      setIsPlaying(false);
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
  const isValentine = activeMemory?.type === "valentine";
  const isUnresolvedValentine =
    isValentine && activeMemory ? !resolvedValentineIds.has(activeMemory.id) : false;
  const activeMedia = activeMemory?.mediaId ? media.find((m) => m.id === activeMemory.mediaId) : null;
  const remainingCards = Math.max(0, memories.length - 1 - currentIndex);
  const showBackCard1 = !isValentine && remainingCards >= 1;
  const showBackCard2 = !isValentine && remainingCards >= 2;
  const isOddCard = currentIndex % 2 === 1;
  const mediaSrc = activeMedia ? `/api/media/${activeMedia.filename}` : '';

  const handleValentineYes = () => {
    if (activeMemory) {
      setResolvedValentineIds((prev) => {
        const next = new Set(prev);
        next.add(activeMemory.id);
        return next;
      });
    }
    if (currentIndex < memories.length - 1) {
      handleNext();
    }
  };

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

        {/* Card container with natural two-card photo pile */}
        <div className="relative w-[min(calc(100vw-3.25rem),calc((100dvh-17rem)*4/5),360px)] sm:w-[clamp(280px,calc((100dvh-16rem)*4/5),400px)] max-w-full">
          {/* Back card 2 (furthest) */}
          <div
            aria-hidden="true"
            style={
              {
                "--stack-rotate": showBackCard2 ? (isOddCard ? "-2.5deg" : "-2deg") : "0deg",
                "--stack-x": showBackCard2 ? (isOddCard ? "clamp(-8px, -2vw, -6px)" : "clamp(-7px, -1.8vw, -5px)") : "0px",
                "--stack-y": showBackCard2 ? (isOddCard ? "11px" : "10px") : "0px",
              } as React.CSSProperties
            }
            className={`pointer-events-none absolute inset-0 origin-bottom rounded-[32px] sm:rounded-[36px] md:rounded-[40px] border border-[#F1E8EC] bg-white shadow-[0_4px_14px_rgba(255,150,170,0.08)] sm:shadow-[0_6px_20px_rgba(255,150,170,0.10)] -z-20 transition-[transform,opacity] duration-300 ease-out motion-reduce:transition-none [transform:translate3d(var(--stack-x),var(--stack-y),0)_rotate(var(--stack-rotate))] ${
              showBackCard2 ? "opacity-75" : "opacity-0"
            }`}
          />

          {/* Back card 1 (closest to main card) */}
          <div
            aria-hidden="true"
            style={
              {
                "--stack-rotate": showBackCard1 ? (isOddCard ? "2deg" : "2.5deg") : "0deg",
                "--stack-x": showBackCard1 ? (isOddCard ? "clamp(5px, 1.5vw, 6px)" : "clamp(6px, 1.8vw, 8px)") : "0px",
                "--stack-y": showBackCard1 ? (isOddCard ? "5px" : "6px") : "0px",
              } as React.CSSProperties
            }
            className={`pointer-events-none absolute inset-0 origin-bottom rounded-[32px] sm:rounded-[36px] md:rounded-[40px] border border-[#F1E8EC] bg-white shadow-[0_6px_20px_rgba(255,150,170,0.12)] sm:shadow-[0_8px_26px_rgba(255,150,170,0.14)] -z-10 transition-[transform,opacity] duration-300 ease-out motion-reduce:transition-none [transform:translate3d(var(--stack-x),var(--stack-y),0)_rotate(var(--stack-rotate))] ${
              showBackCard1 ? "opacity-100" : "opacity-0"
            }`}
          />

          <AnimatePresence mode="wait" custom={direction}>
            <motion.article
              key={currentIndex}
              custom={direction}
              drag={isValentine ? false : "x"}
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.2}
              onDragEnd={isValentine ? undefined : handleDragEnd}
              aria-hidden={isValentine ? "true" : undefined}
              variants={{
                enter: (dir: number) => ({
                  opacity: 0,
                  x: shouldReduceMotion ? 0 : dir * 60,
                }),
                center: {
                  opacity: isValentine ? 0 : 1,
                  x: 0,
                },
                peek: {
                  x: [0, -24, 0, -24, 0],
                  transition: {
                    duration: 1.8,
                    times: [0, 0.25, 0.5, 0.75, 1],
                    ease: ["easeInOut", "easeOut", "easeInOut", "easeOut"],
                  },
                },
                exit: (dir: number) => ({
                  opacity: 0,
                  x: shouldReduceMotion ? 0 : dir * -60,
                }),
              }}
              initial="enter"
              animate={
                shouldPlayCardPeek({
                  isHintActive,
                  isReducedMotion: shouldReduceMotion,
                  isValentine,
                })
                  ? "peek"
                  : "center"
              }
              exit="exit"
              transition={{
                duration: shouldReduceMotion ? 0.15 : undefined,
                type: shouldReduceMotion ? "tween" : "spring",
                stiffness: 300,
                damping: 30,
              }}
              className={`w-full rounded-[32px] sm:rounded-[36px] md:rounded-[40px] bg-white border border-[#F1E8EC] shadow-[0_10px_30px_rgba(255,150,170,0.18)] sm:shadow-[0_12px_40px_rgba(255,150,170,0.22)] overflow-hidden flex flex-col p-4 sm:p-5 select-none ${
                isValentine
                  ? "opacity-0 pointer-events-none"
                  : "cursor-grab active:cursor-grabbing"
              }`}
            >
              {/* Media figure */}
              <figure className="relative w-full aspect-[4/5] rounded-[22px] sm:rounded-[26px] md:rounded-[28px] overflow-hidden bg-[#FAF7F8] flex items-center justify-center shrink-0 select-none [-webkit-touch-callout:none]">
                {activeMedia ? (
                  <>
                    {!isCurrentMediaLoaded && (
                      <Skeleton className="absolute inset-0 w-full h-full rounded-[26px] md:rounded-[28px]" />
                    )}
                    {isVideo(activeMedia.filename) ? (
                      <motion.div
                        onTap={togglePlayPause}
                        className="relative w-full h-full cursor-pointer group select-none"
                        role="button"
                        tabIndex={0}
                        aria-label={isPlaying ? "Pause video" : "Play video with sound"}
                        onKeyDown={(e) => {
                          if (e.key === " " || e.key === "Enter") {
                            e.preventDefault();
                            togglePlayPause();
                          }
                        }}
                      >
                        <video
                          ref={videoRef}
                          src={mediaSrc}
                          preload="metadata"
                          loop
                          playsInline
                          onPlay={() => setIsPlaying(true)}
                          onPause={() => setIsPlaying(false)}
                          onEnded={() => setIsPlaying(false)}
                          onLoadedMetadata={() => markLoaded(currentIndex)}
                          onCanPlay={() => markLoaded(currentIndex)}
                          onLoadedData={() => markLoaded(currentIndex)}
                          className={`w-full h-full object-cover transition-opacity duration-300 pointer-events-none ${
                            isCurrentMediaLoaded ? 'opacity-100' : 'opacity-0'
                          }`}
                        />

                        {/* Floating Play / Pause Overlay */}
                        <div
                          className={`absolute inset-0 flex flex-col items-center justify-center transition-all duration-300 pointer-events-none ${
                            isPlaying
                              ? 'opacity-0 group-hover:opacity-100 bg-black/15'
                              : 'opacity-100 bg-black/20'
                          }`}
                        >
                          <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-white/95 text-foreground flex items-center justify-center shadow-lg backdrop-blur-xs transition-transform duration-200 transform group-hover:scale-105">
                            {isPlaying ? (
                              <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
                                <rect x="6" y="4" width="4" height="16" rx="1.5" />
                                <rect x="14" y="4" width="4" height="16" rx="1.5" />
                              </svg>
                            ) : (
                              <svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" viewBox="0 0 24 24" fill="currentColor" className="ml-1 text-[#DB2777]">
                                <polygon points="5 3 19 12 5 21 5 3" />
                              </svg>
                            )}
                          </div>
                          {!isPlaying && (
                            <span className="mt-3 bg-black/55 text-white text-[11px] font-medium px-3 py-1 rounded-full backdrop-blur-xs shadow-xs">
                              Tap to play
                            </span>
                          )}
                        </div>
                      </motion.div>
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
                        style={getPhotoFramingStyle(activeMemory)}
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

                {/* Rewind Darkening Mask & Luminosity Reduction */}
                <AnimatePresence>
                  {isRewinding && (
                    <motion.div
                      key="rewind-mask"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="absolute inset-0 bg-black/45 backdrop-blur-[1px] flex flex-col items-center justify-center pointer-events-none z-20"
                    >
                      <motion.span
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 4 }}
                        transition={{ duration: 0.2, delay: 0.1 }}
                        className="text-white/90 text-xs font-semibold px-3.5 py-1.5 rounded-full bg-black/40 backdrop-blur-md border border-white/15 tracking-wide shadow-sm"
                      >
                        Rewinding to beginning...
                      </motion.span>
                    </motion.div>
                  )}
                </AnimatePresence>
              </figure>

              {/* Integrated caption inside the card */}
              {(activeMemory?.heading || activeMemory?.text) && (
                <div className="flex flex-col items-center text-center justify-center pt-3 sm:pt-4 pb-1 px-2 w-full max-h-[22svh] overflow-y-auto overscroll-contain">
                  {activeMemory?.heading && (
                    <h2 className="text-xl sm:text-2xl font-bold text-foreground leading-snug mb-1">
                      {activeMemory.heading}
                    </h2>
                  )}
                  {activeMemory?.text && (
                    <p className="text-sm sm:text-base text-foreground/85 leading-relaxed max-w-sm">
                      {activeMemory.text}
                    </p>
                  )}
                </div>
              )}
            </motion.article>
          </AnimatePresence>

          {/* Special Valentine Memory Overlay */}
          {isValentine && activeMemory && (
            <ValentineMemory
              key={`valentine-${activeMemory.id}-${currentIndex}`}
              heading={activeMemory.heading}
              config={activeMemory.config}
              isReducedMotion={Boolean(shouldReduceMotion)}
              isLastCard={currentIndex === memories.length - 1}
              onYes={handleValentineYes}
            />
          )}

          {/* Swipe hint on first card */}
          <AnimatePresence>
            {isHintActive && currentIndex === 0 && !isValentine && (
              <SwipeHint isReducedMotion={shouldReduceMotion} />
            )}
          </AnimatePresence>
        </div>

      {/* Unified control toolbar directly below the card */}
      <footer
        aria-label="Timeline navigation controls"
        aria-hidden={isUnresolvedValentine ? "true" : undefined}
        className={`flex items-center justify-center gap-4 mt-6 z-10 transition-opacity duration-200 ${
          isUnresolvedValentine ? "opacity-0 pointer-events-none" : "opacity-100"
        }`}
      >
        {/* Previous Button */}
        <button
          type="button"
          aria-label="Previous memory"
          onClick={handlePrev}
          disabled={currentIndex === 0 || isUnresolvedValentine}
          className="w-12 h-12 rounded-full bg-white hover:bg-gray-50 text-[#4B5563] hover:text-foreground border border-[#F1E8EC] shadow-sm flex items-center justify-center transition-all focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cta disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-white"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m15 18-6-6 6-6" /></svg>
        </button>

        {/* First card: Like Button | Other cards: Rewind Button */}
        {currentIndex === 0 ? (
          <button
            type="button"
            aria-label={isLiked ? "Liked" : "Like"}
            aria-pressed={isLiked}
            disabled={isLiked || isUnresolvedValentine}
            onClick={handleLike}
            className="w-12 h-12 rounded-full bg-white hover:bg-gray-50 border border-[#F1E8EC] shadow-sm flex items-center justify-center focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cta select-none disabled:opacity-100 disabled:pointer-events-none disabled:hover:bg-white"
          >
            {isLiked ? (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="#FF3040"
                stroke="#FF3040"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
              </svg>
            ) : (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#374151"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
              </svg>
            )}
          </button>
        ) : (
          <div className="relative w-12 h-12 flex items-center justify-center">
            {/* Slot placeholder so toolbar buttons do not shift when rewind lifts */}
            <div className="w-12 h-12 rounded-full border border-dashed border-[#F1E8EC] opacity-40 pointer-events-none" />

            {/* Lifting & Enlarging Rewind Button */}
            <motion.div
              layout
              animate={{
                y: isRewinding ? -120 : 0,
                scale: isRewinding ? 1.4 : 1,
                boxShadow: isRewinding
                  ? '0 20px 35px -5px rgba(212, 83, 126, 0.4), 0 0 0 4px rgba(255, 255, 255, 0.85)'
                  : '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
              }}
              transition={{
                type: 'spring',
                stiffness: 400,
                damping: 25,
                mass: 0.8,
              }}
              className="absolute w-12 h-12 rounded-full bg-white border border-[#F1E8EC] flex items-center justify-center z-30 select-none cursor-pointer"
            >
              {/* Outer circular progress ring indicator */}
              <svg
                className="absolute -inset-1.5 w-[60px] h-[60px] -rotate-90 pointer-events-none"
                viewBox="0 0 60 60"
              >
                <circle
                  cx="30"
                  cy="30"
                  r="26"
                  fill="none"
                  stroke={isRewinding ? 'rgba(255, 255, 255, 0.3)' : 'transparent'}
                  strokeWidth="3.5"
                />
                <motion.circle
                  cx="30"
                  cy="30"
                  r="26"
                  fill="none"
                  stroke="#D4537E"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  strokeDasharray={163.36}
                  initial={{ strokeDashoffset: 163.36 }}
                  animate={{ strokeDashoffset: isRewinding ? 0 : 163.36 }}
                  transition={{
                    duration: isRewinding ? 1.5 : 0.2,
                    ease: 'linear',
                  }}
                />
              </svg>

              {/* Internal subtle radial fill */}
              <motion.div
                className="absolute inset-0 bg-gradient-to-tr from-[#D4537E] to-[#FB7185] rounded-full origin-center"
                initial={{ scale: 0 }}
                animate={{ scale: isRewinding ? 1 : 0 }}
                transition={{ duration: isRewinding ? 1.5 : 0.2, ease: "linear" }}
              />

              <button
                type="button"
                aria-label="Rewind to beginning"
                disabled={isUnresolvedValentine}
                onPointerDown={isUnresolvedValentine ? undefined : handlePointerDown}
                onPointerUp={isUnresolvedValentine ? undefined : handlePointerUp}
                onPointerCancel={isUnresolvedValentine ? undefined : handlePointerUp}
                onPointerLeave={isUnresolvedValentine ? undefined : handlePointerUp}
                onContextMenu={(e) => e.preventDefault()}
                style={{ touchAction: 'none' }}
                className={`relative z-10 w-full h-full flex items-center justify-center transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cta rounded-full select-none ${
                  isRewinding ? 'text-white' : 'text-[#6B7280] hover:text-foreground'
                }`}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                  className={isRewinding ? 'animate-spin-slow' : ''}
                >
                  <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                  <path d="M3 3v5h5" />
                </svg>
                <span className="sr-only">Rewind</span>
              </button>
            </motion.div>
          </div>
        )}

        {/* Next Button - Primary Action */}
        <button
          type="button"
          aria-label="Next memory"
          onClick={handleNext}
          disabled={currentIndex === memories.length - 1 || isUnresolvedValentine}
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
