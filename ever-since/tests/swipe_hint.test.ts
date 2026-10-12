import { TestHarness } from './helpers';

async function main() {
  const harness = new TestHarness();

  console.log('--- Starting Swipe Hint Unit Tests ---');

  // Step 1: RED test - import swipe hint module
  const {
    isSwipeHintDismissed,
    dismissSwipeHintPermanently,
    getSessionShowCount,
    incrementSessionShowCount,
    hasReachedSessionLimit,
    checkIsTouchMobile,
    shouldPlayCardPeek,
    SwipeHintStateMachine,
  } = await import('../lib/hooks/use-swipe-hint');
  const { getSwipeHintMotionConfig } = await import('../components/swipe-hint');

  // Mock in-memory localStorage and sessionStorage for hermetic testing
  const mockStorage = () => {
    const store: Record<string, string> = {};
    return {
      getItem: (key: string) => store[key] ?? null,
      setItem: (key: string, value: string) => {
        store[key] = value;
      },
      removeItem: (key: string) => {
        delete store[key];
      },
      clear: () => {
        for (const k in store) delete store[k];
      },
    };
  };

  const fakeLocalStorage = mockStorage();
  const fakeSessionStorage = mockStorage();

  // Test 1: Permanent dismissal in localStorage
  {
    console.log('\nTest 1: Permanent dismissal in localStorage');
    fakeLocalStorage.clear();

    harness.assert(
      !isSwipeHintDismissed(fakeLocalStorage as unknown as Storage),
      'Hint is not dismissed when localStorage is empty'
    );

    dismissSwipeHintPermanently(fakeLocalStorage as unknown as Storage);

    harness.assert(
      isSwipeHintDismissed(fakeLocalStorage as unknown as Storage),
      'Hint is dismissed after permanent dismissal'
    );

    harness.assert(
      fakeLocalStorage.getItem('swipeHintDismissed') === 'true',
      'Value is stored under swipeHintDismissed key'
    );

    // Resilience test: when storage throws
    const throwingStorage = {
      getItem: () => {
        throw new Error('Blocked');
      },
      setItem: () => {
        throw new Error('Blocked');
      },
    } as unknown as Storage;

    harness.assert(
      !isSwipeHintDismissed(throwingStorage),
      'Handles localStorage error gracefully without throwing'
    );
  }

  // Test 2: Session show counter up to 3 shows
  {
    console.log('\nTest 2: Session show counter up to 3 shows');
    fakeSessionStorage.clear();

    harness.assert(
      getSessionShowCount(fakeSessionStorage as unknown as Storage) === 0,
      'Initial session show count is 0'
    );
    harness.assert(
      !hasReachedSessionLimit(fakeSessionStorage as unknown as Storage, 3),
      'Session limit is not reached initially'
    );

    incrementSessionShowCount(fakeSessionStorage as unknown as Storage);
    harness.assert(
      getSessionShowCount(fakeSessionStorage as unknown as Storage) === 1,
      'Session show count incremented to 1'
    );

    incrementSessionShowCount(fakeSessionStorage as unknown as Storage);
    incrementSessionShowCount(fakeSessionStorage as unknown as Storage);
    harness.assert(
      getSessionShowCount(fakeSessionStorage as unknown as Storage) === 3,
      'Session show count incremented to 3'
    );
    harness.assert(
      hasReachedSessionLimit(fakeSessionStorage as unknown as Storage, 3),
      'Session limit is reached after 3 shows'
    );
  }

  // Test 3: Touch & mobile detection check
  {
    console.log('\nTest 3: Touch & mobile detection check');
    // True only if both touch (hover:none and pointer:coarse) and max-width <= 768px
    harness.assert(
      checkIsTouchMobile({ isCoarsePointer: true, isSmallViewport: true }),
      'Returns true for touch and small viewport'
    );
    harness.assert(
      !checkIsTouchMobile({ isCoarsePointer: false, isSmallViewport: true }),
      'Returns false for non-touch device with small viewport'
    );
    harness.assert(
      !checkIsTouchMobile({ isCoarsePointer: true, isSmallViewport: false }),
      'Returns false for touch device with desktop viewport (>768px)'
    );
    harness.assert(
      !checkIsTouchMobile({ isCoarsePointer: false, isSmallViewport: false }),
      'Returns false for desktop desktop'
    );
  }

  // Test 4: State Machine timing, interaction during a cycle, 6s pauses, and 3-show limit
  {
    console.log('\nTest 4: State Machine timing, interaction during a cycle, 6s pauses, and 3-show limit');
    fakeLocalStorage.clear();
    fakeSessionStorage.clear();

    let currentTime = 1000;
    const timeProvider = () => currentTime;

    const machine = new SwipeHintStateMachine({
      delayMs: 4000,
      repeatDelayMs: 6000,
      cycleDurationMs: 1800,
      maxShows: 3,
      localStorage: fakeLocalStorage as unknown as Storage,
      sessionStorage: fakeSessionStorage as unknown as Storage,
      now: timeProvider,
    });

    harness.assert(!machine.isActive(), 'Initial state is inactive');
    harness.assert(machine.getRemainingTimeMs() === 4000, 'Initial remaining time is 4000ms');

    // Advance 3999ms: still inactive, 1ms remaining
    currentTime += 3999;
    machine.tick();
    harness.assert(!machine.isActive(), 'Still inactive at 3999ms');
    harness.assert(machine.getRemainingTimeMs() === 1, '1ms remaining before initial 4s delay');

    // Advance to 4000ms: activates show 1
    currentTime += 1;
    machine.tick();
    harness.assert(machine.isActive(), 'Activates at 4000ms delay');
    harness.assert(machine.getShowCount() === 1, 'First show registered');
    harness.assert(machine.getRemainingTimeMs() === 1800, 'Remaining cycle duration is 1800ms');

    // Advance 1800ms (2 cycles complete): pauses for 6s repeat delay
    currentTime += 1800;
    machine.tick();
    harness.assert(!machine.isActive(), 'Pauses after 2 cycles (1800ms)');
    harness.assert(machine.getRemainingTimeMs() === 6000, 'Remaining repeat pause is 6000ms');

    // Advance 5999ms of the 6000ms pause: still inactive
    currentTime += 5999;
    machine.tick();
    harness.assert(!machine.isActive(), 'Still paused at 5999ms of 6s repeat delay');
    harness.assert(machine.getRemainingTimeMs() === 1, '1ms remaining in 6s repeat pause');

    // Advance 1ms (total 6000ms repeat delay): activates show 2
    currentTime += 1;
    machine.tick();
    harness.assert(machine.isActive(), 'Activates show 2 after 6s repeat delay');
    harness.assert(machine.getShowCount() === 2, 'Second show registered');
    harness.assert(machine.getRemainingTimeMs() === 1800, 'Show 2 cycle duration is 1800ms');

    // Advance 500ms into the active 1800ms cycle, then trigger user interaction
    currentTime += 500;
    machine.tick();
    harness.assert(machine.isActive(), 'Still active 500ms into show 2 cycle');
    harness.assert(machine.getRemainingTimeMs() === 1300, '1300ms left in show 2 cycle before interaction');

    machine.handleUserInteraction();
    harness.assert(!machine.isActive(), 'User interaction mid-cycle immediately deactivates hint');
    harness.assert(machine.getRemainingTimeMs() === 4000, 'Interaction resets timer to full 4000ms inactivity delay');

    // Advance 1300ms (where old cycle would have ended) -> still waiting
    currentTime += 1300;
    machine.tick();
    harness.assert(!machine.isActive(), 'Does not change state at old cycle boundary');
    harness.assert(machine.getRemainingTimeMs() === 2700, '2700ms remaining in restarted 4s inactivity delay');

    // Advance 2699ms (total 3999ms since interaction) -> still inactive
    currentTime += 2699;
    machine.tick();
    harness.assert(!machine.isActive(), 'Inactive 3999ms after interaction');

    // Advance 1ms (total 4000ms since interaction) -> activates show 3
    currentTime += 1;
    machine.tick();
    harness.assert(machine.isActive(), 'Activates show 3 after 4s inactivity');
    harness.assert(machine.getShowCount() === 3, 'Third show registered');

    // Finish 2 cycles (1800ms) -> reaches max 3 shows and exhausts
    currentTime += 1800;
    machine.tick();
    harness.assert(!machine.isActive(), 'Show 3 paused after 2 cycles');
    harness.assert(machine.getRemainingTimeMs() === null, 'No further timer scheduled once 3-show limit is reached');

    // Wait 6000ms repeat and interact: should NOT activate because maxShows (3) reached!
    currentTime += 6000;
    machine.tick();
    harness.assert(!machine.isActive(), 'Does not activate after reaching max 3 shows');
    machine.handleUserInteraction();
    harness.assert(machine.getRemainingTimeMs() === null, 'Interaction when exhausted does not restart timer');

    // New machine in same session starts exhausted immediately
    const machineSameSession = new SwipeHintStateMachine({
      delayMs: 4000,
      maxShows: 3,
      localStorage: fakeLocalStorage as unknown as Storage,
      sessionStorage: fakeSessionStorage as unknown as Storage,
      now: timeProvider,
    });
    harness.assert(!machineSameSession.isActive(), 'New machine in exhausted session is inactive');
    harness.assert(machineSameSession.getRemainingTimeMs() === null, 'New machine in exhausted session schedules no timer');
  }

  // Test 5: Permanent dismissal disables machine and persists across instances
  {
    console.log('\nTest 5: Permanent dismissal disables machine and persists across instances');
    fakeLocalStorage.clear();
    fakeSessionStorage.clear();

    let currentTime = 1000;
    const machine = new SwipeHintStateMachine({
      delayMs: 4000,
      localStorage: fakeLocalStorage as unknown as Storage,
      sessionStorage: fakeSessionStorage as unknown as Storage,
      now: () => currentTime,
    });

    machine.dismissPermanently();
    harness.assert(machine.isDismissed(), 'Machine reports dismissed');
    harness.assert(!machine.isActive(), 'Machine is inactive');
    harness.assert(machine.getRemainingTimeMs() === null, 'Dismissed machine schedules no timer');
    currentTime += 5000;
    machine.tick();
    harness.assert(!machine.isActive(), 'Ticking dismissed machine does not activate');

    const nextMachine = new SwipeHintStateMachine({
      delayMs: 4000,
      localStorage: fakeLocalStorage as unknown as Storage,
      sessionStorage: fakeSessionStorage as unknown as Storage,
      now: () => currentTime,
    });
    harness.assert(nextMachine.isDismissed(), 'Subsequent machine reads persisted dismissal from localStorage');
    harness.assert(nextMachine.getRemainingTimeMs() === null, 'Subsequent dismissed machine schedules no timer');
  }

  // Test 6: Reduced motion configuration for capsule and card peek
  {
    console.log('\nTest 6: Reduced motion configuration for capsule and card peek');

    const normalConfig = getSwipeHintMotionConfig(false);
    harness.assert(
      'x' in normalConfig.animate && Array.isArray(normalConfig.animate.x),
      'Normal motion includes horizontal x keyframes on SwipeHint capsule'
    );

    const reducedConfig = getSwipeHintMotionConfig(true);
    harness.assert(
      !('x' in reducedConfig.animate),
      'Reduced motion omits horizontal x translation on SwipeHint capsule'
    );
    harness.assert(
      JSON.stringify(reducedConfig.animate.opacity) === JSON.stringify([0, 0.9, 0.9, 0]),
      'Reduced motion uses gentle static opacity fade [0, 0.9, 0.9, 0]'
    );

    harness.assert(
      shouldPlayCardPeek({ isHintActive: true, isReducedMotion: false, isValentine: false }),
      'Card peek plays when hint is active, motion is normal, and card is standard'
    );
    harness.assert(
      !shouldPlayCardPeek({ isHintActive: true, isReducedMotion: true, isValentine: false }),
      'Card peek is disabled when prefers-reduced-motion is active'
    );
    harness.assert(
      !shouldPlayCardPeek({ isHintActive: true, isReducedMotion: false, isValentine: true }),
      'Card peek is disabled on valentine cards'
    );
    harness.assert(
      !shouldPlayCardPeek({ isHintActive: false, isReducedMotion: false, isValentine: false }),
      'Card peek is disabled when hint is inactive'
    );
  }

  harness.finish('Swipe Hint Verification');
}

main().catch((err) => {
  console.error('Unhandled error in test:', err);
  process.exit(1);
});
