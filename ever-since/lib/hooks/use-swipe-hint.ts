"use client";

import { useState, useEffect, useRef, useCallback } from "react";

const LOCAL_STORAGE_KEY = "swipeHintDismissed";
const SESSION_STORAGE_KEY = "swipeHintSessionShows";
const DEFAULT_INACTIVITY_DELAY = 4000;
const DEFAULT_CYCLE_DURATION = 1800; // 2 cycles x 900ms
const DEFAULT_REPEAT_DELAY = 6000;
const DEFAULT_MAX_SHOWS = 3;

/**
 * Safely check if swipe hint has been permanently dismissed
 */
export function isSwipeHintDismissed(storage?: Storage): boolean {
  try {
    const s = storage ?? (typeof window !== "undefined" ? window.localStorage : undefined);
    return s?.getItem(LOCAL_STORAGE_KEY) === "true";
  } catch {
    return false;
  }
}

/**
 * Safely persist permanent swipe hint dismissal
 */
export function dismissSwipeHintPermanently(storage?: Storage): void {
  try {
    const s = storage ?? (typeof window !== "undefined" ? window.localStorage : undefined);
    s?.setItem(LOCAL_STORAGE_KEY, "true");
  } catch {}
}

/**
 * Get current session show count
 */
export function getSessionShowCount(storage?: Storage): number {
  try {
    const s = storage ?? (typeof window !== "undefined" ? window.sessionStorage : undefined);
    const raw = s?.getItem(SESSION_STORAGE_KEY);
    const parsed = raw ? parseInt(raw, 10) : 0;
    return Number.isFinite(parsed) ? parsed : 0;
  } catch {
    return 0;
  }
}

/**
 * Increment current session show count
 */
export function incrementSessionShowCount(storage?: Storage): number {
  try {
    const s = storage ?? (typeof window !== "undefined" ? window.sessionStorage : undefined);
    const current = getSessionShowCount(storage);
    const next = current + 1;
    s?.setItem(SESSION_STORAGE_KEY, next.toString());
    return next;
  } catch {
    return 0;
  }
}

/**
 * Check if the session limit of shows has been reached
 */
export function hasReachedSessionLimit(storage?: Storage, maxShows = DEFAULT_MAX_SHOWS): boolean {
  return getSessionShowCount(storage) >= maxShows;
}

/**
 * Evaluate if device is a mobile touch device based on coarse pointer and viewport
 */
export function checkIsTouchMobile({
  isCoarsePointer,
  isSmallViewport,
}: {
  isCoarsePointer: boolean;
  isSmallViewport: boolean;
}): boolean {
  return isCoarsePointer && isSmallViewport;
}

/**
 * Evaluate whether the card peek animation should play
 */
export function shouldPlayCardPeek({
  isHintActive,
  isReducedMotion,
  isValentine,
}: {
  isHintActive: boolean;
  isReducedMotion?: boolean | null;
  isValentine: boolean;
}): boolean {
  return isHintActive && !isReducedMotion && !isValentine;
}

export interface StateMachineConfig {
  delayMs?: number;
  repeatDelayMs?: number;
  cycleDurationMs?: number;
  maxShows?: number;
  localStorage?: Storage;
  sessionStorage?: Storage;
  now?: () => number;
}

type Phase = "idle" | "waiting" | "active" | "repeating" | "exhausted" | "dismissed";

/**
 * Pure state machine managing swipe hint timing, cycles, and persistence
 */
export class SwipeHintStateMachine {
  private delayMs: number;
  private repeatDelayMs: number;
  private cycleDurationMs: number;
  private maxShows: number;
  private localStorage?: Storage;
  private sessionStorage?: Storage;
  private now: () => number;

  private phase: Phase = "idle";
  private active = false;
  private lastTimestamp = 0;
  private targetTimestamp = 0;

  constructor(config: StateMachineConfig = {}) {
    this.delayMs = config.delayMs ?? DEFAULT_INACTIVITY_DELAY;
    this.repeatDelayMs = config.repeatDelayMs ?? DEFAULT_REPEAT_DELAY;
    this.cycleDurationMs = config.cycleDurationMs ?? DEFAULT_CYCLE_DURATION;
    this.maxShows = config.maxShows ?? DEFAULT_MAX_SHOWS;
    this.localStorage = config.localStorage;
    this.sessionStorage = config.sessionStorage;
    this.now = config.now ?? (() => Date.now());

    this.init();
  }

  private init() {
    if (isSwipeHintDismissed(this.localStorage)) {
      this.phase = "dismissed";
      this.active = false;
      return;
    }

    if (hasReachedSessionLimit(this.sessionStorage, this.maxShows)) {
      this.phase = "exhausted";
      this.active = false;
      return;
    }

    this.startWaiting();
  }

  private startWaiting() {
    this.phase = "waiting";
    this.active = false;
    this.lastTimestamp = this.now();
    this.targetTimestamp = this.lastTimestamp + this.delayMs;
  }

  public isActive(): boolean {
    return this.active;
  }

  public isDismissed(): boolean {
    return this.phase === "dismissed";
  }

  public getShowCount(): number {
    return getSessionShowCount(this.sessionStorage);
  }

  public getRemainingTimeMs(): number | null {
    if (this.phase === "dismissed" || this.phase === "exhausted" || this.phase === "idle") {
      return null;
    }
    return Math.max(0, this.targetTimestamp - this.now());
  }

  public handleUserInteraction(): void {
    if (this.phase === "dismissed" || this.phase === "exhausted") return;

    this.active = false;
    this.startWaiting();
  }

  public dismissPermanently(): void {
    dismissSwipeHintPermanently(this.localStorage);
    this.phase = "dismissed";
    this.active = false;
  }

  public tick(): boolean {
    if (this.phase === "dismissed" || this.phase === "exhausted") {
      return false;
    }

    const currentTime = this.now();
    const wasActive = this.active;

    if (this.phase === "waiting") {
      if (currentTime >= this.targetTimestamp) {
        // Trigger show
        incrementSessionShowCount(this.sessionStorage);
        this.phase = "active";
        this.active = true;
        this.targetTimestamp = currentTime + this.cycleDurationMs;
      }
    } else if (this.phase === "active") {
      if (currentTime >= this.targetTimestamp) {
        // Finished 2 cycles -> pause
        this.active = false;
        if (hasReachedSessionLimit(this.sessionStorage, this.maxShows)) {
          this.phase = "exhausted";
        } else {
          this.phase = "repeating";
          this.targetTimestamp = currentTime + this.repeatDelayMs;
        }
      }
    } else if (this.phase === "repeating") {
      if (currentTime >= this.targetTimestamp) {
        // Trigger next show
        incrementSessionShowCount(this.sessionStorage);
        this.phase = "active";
        this.active = true;
        this.targetTimestamp = currentTime + this.cycleDurationMs;
      }
    }

    return wasActive !== this.active;
  }
}

export interface UseSwipeHintOptions {
  enabled: boolean;
  delayMs?: number;
  repeatDelayMs?: number;
  cycleDurationMs?: number;
  maxShowsPerSession?: number;
}

export interface UseSwipeHintReturn {
  isHintActive: boolean;
  dismissPermanently: () => void;
}

const INTERACTION_EVENTS: Array<keyof WindowEventMap> = [
  "touchstart",
  "touchmove",
  "pointerdown",
  "scroll",
  "click",
  "keydown",
];

export function useSwipeHint({
  enabled,
  delayMs = DEFAULT_INACTIVITY_DELAY,
  repeatDelayMs = DEFAULT_REPEAT_DELAY,
  cycleDurationMs = DEFAULT_CYCLE_DURATION,
  maxShowsPerSession = DEFAULT_MAX_SHOWS,
}: UseSwipeHintOptions): UseSwipeHintReturn {
  const [isTouchMobile, setIsTouchMobile] = useState(false);
  const [isHintActive, setIsHintActive] = useState(false);
  const machineRef = useRef<SwipeHintStateMachine | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const dismissPermanently = useCallback(() => {
    if (machineRef.current) {
      machineRef.current.dismissPermanently();
    } else {
      dismissSwipeHintPermanently();
    }
    setIsHintActive(false);
    clearTimer();
  }, [clearTimer]);

  // Check touch and mobile viewport strictly client-side to prevent hydration mismatches
  useEffect(() => {
    if (typeof window === "undefined") return;

    if (isSwipeHintDismissed()) {
      return;
    }

    const touchMedia = window.matchMedia("(hover: none) and (pointer: coarse)");
    const viewportMedia = window.matchMedia("(max-width: 768px)");

    const updateMediaState = () => {
      const match = checkIsTouchMobile({
        isCoarsePointer: touchMedia.matches,
        isSmallViewport: viewportMedia.matches,
      });
      setIsTouchMobile(match);
    };

    queueMicrotask(updateMediaState);

    touchMedia.addEventListener?.("change", updateMediaState);
    viewportMedia.addEventListener?.("change", updateMediaState);

    return () => {
      touchMedia.removeEventListener?.("change", updateMediaState);
      viewportMedia.removeEventListener?.("change", updateMediaState);
    };
  }, []);

  // Adapter lifecycle around SwipeHintStateMachine
  useEffect(() => {
    if (!enabled || !isTouchMobile) {
      clearTimer();
      machineRef.current = null;
      return;
    }

    const machine = new SwipeHintStateMachine({
      delayMs,
      repeatDelayMs,
      cycleDurationMs,
      maxShows: maxShowsPerSession,
    });
    machineRef.current = machine;

    if (machine.getRemainingTimeMs() === null) {
      return () => {
        clearTimer();
        machineRef.current = null;
      };
    }

    const scheduleNext = () => {
      clearTimer();
      const remaining = machine.getRemainingTimeMs();
      if (remaining === null) return;

      timerRef.current = setTimeout(() => {
        machine.tick();
        setIsHintActive(machine.isActive());
        scheduleNext();
      }, remaining);
    };

    const onUserInteraction = () => {
      machine.handleUserInteraction();
      setIsHintActive(machine.isActive());
      scheduleNext();
    };

    INTERACTION_EVENTS.forEach((event) => {
      window.addEventListener(event, onUserInteraction, { passive: true });
    });

    scheduleNext();

    return () => {
      clearTimer();
      machineRef.current = null;
      setIsHintActive(false);
      INTERACTION_EVENTS.forEach((event) => {
        window.removeEventListener(event, onUserInteraction);
      });
    };
  }, [
    enabled,
    isTouchMobile,
    delayMs,
    repeatDelayMs,
    cycleDurationMs,
    maxShowsPerSession,
    clearTimer,
  ]);

  return {
    isHintActive,
    dismissPermanently,
  };
}
