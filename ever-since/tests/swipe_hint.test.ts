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
    SwipeHintStateMachine,
  } = await import('../lib/hooks/use-swipe-hint');

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

  // Test 4: State Machine timing & reset behavior
  {
    console.log('\nTest 4: State Machine timing & reset behavior');
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

    // Advance 3000ms: still inactive
    currentTime += 3000;
    machine.tick();
    harness.assert(!machine.isActive(), 'Still inactive after 3s');

    // Advance to 4000ms: activates show 1
    currentTime += 1000;
    machine.tick();
    harness.assert(machine.isActive(), 'Activates at 4000ms delay');
    harness.assert(machine.getShowCount() === 1, 'First show registered');

    // Advance 1800ms (2 cycles complete): pauses
    currentTime += 1800;
    machine.tick();
    harness.assert(!machine.isActive(), 'Pauses after 2 cycles (1800ms)');

    // Advance 6000ms (repeat delay): activates show 2
    currentTime += 6000;
    machine.tick();
    harness.assert(machine.isActive(), 'Activates show 2 after 6s repeat delay');
    harness.assert(machine.getShowCount() === 2, 'Second show registered');

    // User interaction: immediately resets and hides hint
    machine.handleUserInteraction();
    harness.assert(!machine.isActive(), 'User interaction immediately deactivates hint');

    // After interaction, inactivity timer restarts: advance 3999ms -> inactive
    currentTime += 3999;
    machine.tick();
    harness.assert(!machine.isActive(), 'Inactive before new 4s elapses');

    currentTime += 1;
    machine.tick();
    harness.assert(machine.isActive(), 'Activates show 3 after 4s inactivity');
    harness.assert(machine.getShowCount() === 3, 'Third show registered');

    // Finish 2 cycles
    currentTime += 1800;
    machine.tick();
    harness.assert(!machine.isActive(), 'Show 3 paused after 2 cycles');

    // Wait 6000ms repeat: should NOT activate because maxShows (3) reached!
    currentTime += 6000;
    machine.tick();
    harness.assert(!machine.isActive(), 'Does not activate after reaching max 3 shows');
  }

  // Test 5: Permanent dismissal disables machine
  {
    console.log('\nTest 5: Permanent dismissal disables machine');
    fakeLocalStorage.clear();
    fakeSessionStorage.clear();

    const machine = new SwipeHintStateMachine({
      delayMs: 4000,
      localStorage: fakeLocalStorage as unknown as Storage,
      sessionStorage: fakeSessionStorage as unknown as Storage,
    });

    machine.dismissPermanently();
    harness.assert(machine.isDismissed(), 'Machine reports dismissed');
    harness.assert(!machine.isActive(), 'Machine is inactive');
    machine.tick();
    harness.assert(!machine.isActive(), 'Ticking dismissed machine does not activate');
  }

  harness.finish('Swipe Hint Verification');
}

main().catch((err) => {
  console.error('Unhandled error in test:', err);
  process.exit(1);
});
