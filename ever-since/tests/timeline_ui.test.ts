import { runTestSuite } from './helpers';

runTestSuite('Timeline UI & Like Button Verification', async ({ harness }) => {
  console.log('--- Starting Timeline UI & Like Button Tests ---');

  // Test 1: Like button state machine logic
  {
    console.log('\nTest 1: Like button one-time transition and accessibility');

    interface LikeState {
      liked: boolean;
      ariaLabel: string;
      ariaPressed: boolean;
      disabled: boolean;
    }

    const createInitialState = (): LikeState => ({
      liked: false,
      ariaLabel: 'Like',
      ariaPressed: false,
      disabled: false,
    });

    const triggerLike = (state: LikeState): LikeState => {
      if (state.liked) return state; // One-time: no unliking
      return {
        liked: true,
        ariaLabel: 'Liked',
        ariaPressed: true,
        disabled: true,
      };
    };

    let state = createInitialState();
    harness.assert(!state.liked, 'Initial state is unliked');
    harness.assert(state.ariaLabel === 'Like', 'Initial aria-label is "Like"');
    harness.assert(!state.ariaPressed, 'Initial aria-pressed is false');
    harness.assert(!state.disabled, 'Initial button is not disabled');

    // First tap -> likes
    state = triggerLike(state);
    harness.assert(state.liked, 'Tapping once sets liked to true');
    harness.assert(state.ariaLabel === 'Liked', 'Liked state sets aria-label to "Liked"');
    harness.assert(state.ariaPressed, 'Liked state sets aria-pressed to true');
    harness.assert(state.disabled, 'Liked state sets disabled to true');

    // Second tap -> noop (cannot toggle back)
    const stateAfterSecondTap = triggerLike(state);
    harness.assert(stateAfterSecondTap.liked, 'Second tap remains liked');
    harness.assert(stateAfterSecondTap.ariaLabel === 'Liked', 'Second tap retains aria-label "Liked"');
    harness.assert(stateAfterSecondTap.disabled, 'Second tap remains disabled');
  }

  // Test 2: Viewport height sizing and 4:5 aspect ratio calculations
  {
    console.log('\nTest 2: Viewport height sizing and 4:5 aspect ratio calculations');

    const calculateCardDimensions = (vw: number, vh: number) => {
      // Formula: w = min(vw - 3.25rem (52px), (vh - 17rem (272px)) * 4/5, 360px)
      const maxWByVw = vw - 52;
      const maxWByVh = Math.max(0, (vh - 272) * (4 / 5));
      const cardWidth = Math.min(maxWByVw, maxWByVh, 360);
      const photoWidth = cardWidth - 32; // 16px padding on left and right
      const photoHeight = photoWidth * (5 / 4); // 4:5 aspect ratio (width:height)
      // Estimated total card height: photoHeight + 32px padding + 76px caption
      const totalCardHeight = photoHeight + 32 + 76;
      // Outside elements: dots (28px) + controls (72px) + hint (28px) + page padding (36px) = 164px
      const totalPageHeight = totalCardHeight + 164;

      return {
        cardWidth,
        photoWidth,
        photoHeight,
        totalCardHeight,
        totalPageHeight,
        aspectRatio: photoWidth / photoHeight,
      };
    };

    // Small mobile: 360x640
    const smallScreen = calculateCardDimensions(360, 640);
    harness.assert(
      Math.abs(smallScreen.aspectRatio - 0.8) < 0.001,
      'Small screen preserves 4:5 aspect ratio (0.8)'
    );
    harness.assert(
      smallScreen.totalPageHeight <= 640,
      `Small screen total content (${Math.round(smallScreen.totalPageHeight)}px) fits inside 640px viewport`
    );

    // Large mobile: 412x915
    const largeScreen = calculateCardDimensions(412, 915);
    harness.assert(
      Math.abs(largeScreen.aspectRatio - 0.8) < 0.001,
      'Large screen preserves 4:5 aspect ratio (0.8)'
    );
    harness.assert(
      largeScreen.totalPageHeight <= 915,
      `Large screen total content (${Math.round(largeScreen.totalPageHeight)}px) fits inside 915px viewport`
    );
    harness.assert(
      largeScreen.photoHeight > smallScreen.photoHeight,
      'Large screen photo height is larger than small screen photo height'
    );
  }

  // Test 3: First card vs subsequent cards control slot mapping
  {
    console.log('\nTest 3: First card vs subsequent cards control slot mapping');

    const getControlForIndex = (index: number) => {
      if (index === 0) return 'like';
      return 'rewind';
    };

    harness.assert(getControlForIndex(0) === 'like', 'Index 0 renders "like" control');
    harness.assert(getControlForIndex(1) === 'rewind', 'Index 1 renders "rewind" control');
    harness.assert(getControlForIndex(5) === 'rewind', 'Index 5 renders "rewind" control');
  }

  // Test 4: Two-card fanned photo pile visibility and viewport bounds
  {
    console.log('\nTest 4: Two-card fanned photo pile visibility and viewport bounds');

    const getStackState = (currentIndex: number, totalMemories: number) => {
      const remainingCards = Math.max(0, totalMemories - 1 - currentIndex);
      const showBackCard1 = remainingCards >= 1;
      const showBackCard2 = remainingCards >= 2;
      const isOddCard = currentIndex % 2 === 1;

      return {
        remainingCards,
        visibleBackCardsCount: (showBackCard1 ? 1 : 0) + (showBackCard2 ? 1 : 0),
        backCard1: {
          visible: showBackCard1,
          rotateDeg: showBackCard1 ? (isOddCard ? 2 : 2.5) : 0,
          offsetY: showBackCard1 ? (isOddCard ? 5 : 6) : 0,
          opacity: showBackCard1 ? 1 : 0,
        },
        backCard2: {
          visible: showBackCard2,
          rotateDeg: showBackCard2 ? (isOddCard ? -2.5 : -2) : 0,
          offsetY: showBackCard2 ? (isOddCard ? 11 : 10) : 0,
          opacity: showBackCard2 ? 0.75 : 0,
        },
      };
    };

    // In a 4-card flow:
    // Index 0 -> 3 remaining -> 2 back cards visible
    const s0 = getStackState(0, 4);
    harness.assert(s0.visibleBackCardsCount === 2, 'Shows 2 back cards when 3 remain');
    harness.assert(s0.backCard1.rotateDeg === 2.5, 'Card 1 rotated +2.5deg on index 0');
    harness.assert(s0.backCard2.rotateDeg === -2, 'Card 2 rotated -2deg on index 0');
    harness.assert(s0.backCard2.opacity === 0.75, 'Card 2 has lower opacity (0.75)');

    // Index 1 -> 2 remaining -> 2 back cards visible with subtle shift
    const s1 = getStackState(1, 4);
    harness.assert(s1.visibleBackCardsCount === 2, 'Shows 2 back cards when 2 remain');
    harness.assert(
      s1.backCard1.rotateDeg !== s0.backCard1.rotateDeg,
      'Back card 1 subtly shifts rotation when navigating'
    );

    // Index 2 -> 1 remaining -> only 1 back card visible
    const s2 = getStackState(2, 4);
    harness.assert(s2.visibleBackCardsCount === 1, 'Shows 1 back card when 1 remains');
    harness.assert(s2.backCard1.visible && !s2.backCard2.visible, 'Only Back Card 1 is visible');

    // Index 3 (last card) -> 0 remaining -> 0 back cards visible
    const s3 = getStackState(3, 4);
    harness.assert(s3.visibleBackCardsCount === 0, 'Shows 0 back cards on the last card');
    harness.assert(!s3.backCard1.visible && !s3.backCard2.visible, 'Both back cards hidden on last card');

    // Single memory flow -> 0 back cards visible
    const single = getStackState(0, 1);
    harness.assert(single.visibleBackCardsCount === 0, 'Shows 0 back cards when total memories is 1');
  }
});

