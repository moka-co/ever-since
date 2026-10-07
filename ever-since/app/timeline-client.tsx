"use client";

import { useState, useRef } from "react";
import { motion, PanInfo, AnimatePresence } from "framer-motion";
import type { MemoryRecord, MediaRecord } from "@/lib/storage/schema";
import { isVideo } from "@/lib/media/validation";
import { Skeleton } from "@/components/ui/skeleton";

interface TimelineClientProps {
  memories: MemoryRecord[];
  media: MediaRecord[];
}

export default function TimelineClient({ memories, media }: TimelineClientProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loadedMediaIndex, setLoadedMediaIndex] = useState<number | null>(null);
  const [isRewinding, setIsRewinding] = useState(false);
  const rewindTimeout = useRef<NodeJS.Timeout | null>(null);

  const isCurrentMediaLoaded = loadedMediaIndex === currentIndex;

  // Dots Logic (Instagram style sliding window)
  const maxDots = 5;
  const startDotIndex = Math.max(0, Math.min(currentIndex - Math.floor(maxDots / 2), memories.length - maxDots));
  const endDotIndex = Math.min(memories.length, startDotIndex + maxDots);
  const visibleDots = memories.slice(startDotIndex, endDotIndex).map((_, idx) => startDotIndex + idx);

  const handleNext = () => {
    if (currentIndex < memories.length - 1) setCurrentIndex((prev) => prev + 1);
  };

  const handlePrev = () => {
    if (currentIndex > 0) setCurrentIndex((prev) => prev - 1);
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
    setIsRewinding(true);
    rewindTimeout.current = setTimeout(() => {
      setCurrentIndex(0);
      setIsRewinding(false);
    }, 1500);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLButtonElement>) => {
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {}
    if (rewindTimeout.current) clearTimeout(rewindTimeout.current);
    setIsRewinding(false);
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
    <>
      <button
        type="button"
        aria-label="Previous memory"
        onClick={handlePrev}
        disabled={currentIndex === 0}
        className="fixed left-4 md:left-8 top-1/2 -translate-y-1/2 w-11 h-11 md:w-12 md:h-12 rounded-full bg-[#E5E7EB]/80 hover:bg-[#D1D5DB] text-[#4B5563] hover:text-foreground transition-all flex items-center justify-center shadow-xs focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cta disabled:opacity-50 disabled:cursor-not-allowed z-10"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m15 18-6-6 6-6" /></svg>
      </button>

      <button
        type="button"
        aria-label="Next memory"
        onClick={handleNext}
        disabled={currentIndex === memories.length - 1}
        className="fixed right-4 md:right-8 top-1/2 -translate-y-1/2 w-11 h-11 md:w-12 md:h-12 rounded-full bg-[#E5E7EB]/80 hover:bg-[#D1D5DB] text-[#4B5563] hover:text-foreground transition-all flex items-center justify-center shadow-xs focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cta disabled:opacity-50 disabled:cursor-not-allowed z-10"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m9 18 6-6-6-6" /></svg>
      </button>

      <section aria-label="Memory timeline" className="flex flex-col items-center justify-center w-full max-w-4xl z-0">
        <nav aria-label="Memory progress" className="mb-8 md:mb-12">
          <ol className="flex items-center justify-center gap-2 overflow-hidden h-4">
            <AnimatePresence mode="popLayout">
              {visibleDots.map((dotIdx) => (
                <motion.li
                  key={dotIdx}
                  layout
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{
                    scale: dotIdx === currentIndex ? 1.2 : 1,
                    opacity: 1,
                    backgroundColor: dotIdx === currentIndex ? "#1E1B24" : "#D1D5DB"
                  }}
                  exit={{ scale: 0.8, opacity: 0 }}
                  transition={{ type: "spring", stiffness: 300, damping: 20 }}
                  aria-current={dotIdx === currentIndex ? "step" : undefined}
                  className="w-1.5 h-1.5 rounded-full"
                />
              ))}
            </AnimatePresence>
          </ol>
        </nav>

        <div className="flex flex-col md:flex-row items-center md:items-start justify-center gap-8 md:gap-14 w-full">
          <div className="flex flex-col items-start">
            <div className="relative w-72 h-72 sm:w-84 sm:h-84 md:w-96 md:h-96">
              {showStackPeek && (
                <div aria-hidden="true" className="absolute inset-0 translate-x-3 translate-y-1 rounded-[32px] border border-[#E5E7EB] bg-[#EBECEF]/60 -z-10" />
              )}

              <AnimatePresence mode="wait">
                <motion.article
                  key={currentIndex}
                  drag="x"
                  dragConstraints={{ left: 0, right: 0 }}
                  dragElastic={0.2}
                  onDragEnd={handleDragEnd}
                  initial={{ opacity: 0, x: 50 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -50 }}
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  className="absolute inset-0 w-full h-full rounded-[32px] bg-[#F3F4F6]/80 border border-[#E5E7EB] shadow-xs overflow-hidden flex items-center justify-center cursor-grab active:cursor-grabbing"
                >
                  <figure className="w-full h-full flex items-center justify-center relative bg-white">
                    {activeMedia ? (
                      <>
                        {!isCurrentMediaLoaded && (
                          <Skeleton className="absolute inset-0 w-full h-full rounded-[32px]" />
                        )}
                        {isVideo(activeMedia.filename) ? (
                          <video
                            src={mediaSrc}
                            className={`w-full h-full object-cover transition-opacity duration-300 ${
                              isCurrentMediaLoaded ? 'opacity-100' : 'opacity-0'
                            }`}
                            autoPlay
                            loop
                            muted
                            playsInline
                            onLoadedData={() => setLoadedMediaIndex(currentIndex)}
                          />
                        ) : (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={mediaSrc}
                            alt="Memory media"
                            className={`w-full h-full object-cover transition-opacity duration-300 ${
                              isCurrentMediaLoaded ? 'opacity-100' : 'opacity-0'
                            }`}
                            onLoad={() => setLoadedMediaIndex(currentIndex)}
                          />
                        )}
                      </>
                    ) : (
                      <div className="text-muted text-sm px-4 text-center">No media available</div>
                    )}
                  </figure>
                </motion.article>
              </AnimatePresence>
            </div>

            <footer className="mt-3 relative w-10 h-10 rounded-full bg-white border border-[#E5E7EB] shadow-xs flex items-center justify-center overflow-hidden z-10 group">
              {/* Radial Fill Animation */}
              <motion.div
                className="absolute inset-0 bg-[#DB2777] rounded-full origin-center"
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
            </footer>
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={currentIndex}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="flex flex-col items-start text-left justify-start pt-2 md:pt-6 max-w-xs md:max-w-sm h-32 md:h-auto"
            >
              {activeMemory?.heading && (
                <h2 className="text-xl sm:text-2xl md:text-memory-header font-semibold text-foreground leading-tight mb-2">
                  {activeMemory.heading}
                </h2>
              )}
              {activeMemory?.text && (
                <p className="text-base sm:text-lg text-foreground/80 leading-relaxed">
                  {activeMemory.text}
                </p>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </section>
    </>
  );
}
