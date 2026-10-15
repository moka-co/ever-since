import { runTestSuite } from './helpers';
import {
  memorySchema,
  buildMemoryRecord,
  DEFAULT_MEDIA_POSITION_X,
  DEFAULT_MEDIA_POSITION_Y,
  DEFAULT_MEDIA_SCALE,
  DEFAULT_VALENTINE_YES_LABEL,
  DEFAULT_VALENTINE_NO_LABEL,
  DEFAULT_VALENTINE_QUESTION,
  DEFAULT_VALENTINE_NO_MESSAGES,
} from '../lib/storage/schema';
import {
  VALENTINE_PROXIMITY_RADIUS_PX,
  VALENTINE_MAX_NO_TAPS,
  getMobileValentineStepState,
  isPointerWithinProximity,
  rectsOverlap,
  computeSafeDodgePosition,
  type BoxRect,
} from '../components/valentine-memory';

runTestSuite('Valentine Special Memory', async ({ harness }) => {
    const { readDb } = await import('../lib/storage/db');
    const { POST: postMemory } = await import('../app/api/memories/route');
    const { PUT: putMemory } = await import('../app/api/memories/[id]/route');
    const { PUT: reorderMemories } = await import('../app/api/memories/reorder/route');

    console.log('--- Starting Valentine Special Memory Tests ---\n');

    // Test 1: Schema backward compatibility & buildMemoryRecord normalization
    {
      console.log('Test 1: Schema backward compatibility & buildMemoryRecord normalization');
      const testUuid = '11111111-1111-4111-8111-111111111111';
      const legacyParsed = memorySchema.parse({
        id: testUuid,
        heading: 'Our First Trip',
        text: 'By the sea',
        mediaId: 'photo-1',
      });
      harness.assert(
        legacyParsed.type === 'standard',
        'Missing type defaults to "standard"'
      );
      harness.assert(
        legacyParsed.config === null,
        'Missing config defaults to null'
      );
      harness.assert(
        legacyParsed.mediaPositionX === DEFAULT_MEDIA_POSITION_X &&
          legacyParsed.mediaPositionY === DEFAULT_MEDIA_POSITION_Y &&
          legacyParsed.mediaScale === DEFAULT_MEDIA_SCALE,
        'Legacy framing defaults preserved'
      );

      // Legacy record lacking optional fields updated via buildMemoryRecord
      const fromLegacy = buildMemoryRecord(
        testUuid,
        { text: 'Updated text' },
        {
          id: testUuid,
          heading: 'Legacy Heading',
          text: 'Old text',
          mediaId: 'photo-legacy',
        }
      );
      harness.assert(fromLegacy.type === 'standard', 'Legacy update defaults type to standard');
      harness.assert(fromLegacy.heading === 'Legacy Heading', 'Omitted heading preserves existing heading');
      harness.assert(fromLegacy.text === 'Updated text', 'Explicit text updates existing text');
      harness.assert(fromLegacy.mediaId === 'photo-legacy', 'Omitted mediaId preserves existing mediaId');
      harness.assert(
        fromLegacy.mediaPositionX === 50 &&
          fromLegacy.mediaPositionY === 50 &&
          fromLegacy.mediaScale === 1,
        'Legacy update fills default X/Y/scale (50/50/1)'
      );
      harness.assert(fromLegacy.config === null, 'Standard memory config is null');

      // Distinction between omitted (undefined), null, and explicit value
      const clearedFields = buildMemoryRecord(
        testUuid,
        { heading: null, text: null, mediaId: null },
        fromLegacy
      );
      harness.assert(
        clearedFields.heading === null &&
          clearedFields.text === null &&
          clearedFields.mediaId === null,
        'Explicit null clears heading, text, and mediaId on standard memory'
      );

      // Out-of-range clamping in buildMemoryRecord
      const clampedLow = buildMemoryRecord(testUuid, {
        heading: 'Clamped Low',
        mediaPositionX: -25.4,
        mediaPositionY: -1,
        mediaScale: 0.2,
      });
      harness.assert(
        clampedLow.mediaPositionX === 0 &&
          clampedLow.mediaPositionY === 0 &&
          clampedLow.mediaScale === 1,
        'Out-of-range low X/Y/scale clamped to 0, 0, 1'
      );

      const clampedHigh = buildMemoryRecord(
        testUuid,
        {
          mediaPositionX: 150.6,
          mediaPositionY: 100.4,
          mediaScale: 4.56,
        },
        clampedLow
      );
      harness.assert(
        clampedHigh.mediaPositionX === 100 &&
          clampedHigh.mediaPositionY === 100 &&
          clampedHigh.mediaScale === 3,
        'Out-of-range high X/Y/scale clamped to 100, 100, 3'
      );
      harness.assert(
        DEFAULT_VALENTINE_YES_LABEL === 'Yes' && DEFAULT_VALENTINE_NO_LABEL === 'No',
        'Exported default Valentine button labels match Yes/No'
      );
    }

    // Test 2: API creation, validation, type transitions, and reordering of Valentine memories
    {
      console.log('\nTest 2: POST, PUT, type transitions, and reorder Valentine memories via API');
      // Create Valentine memory with defaults
      const postDefaultReq = new Request('http://localhost:3000/api/memories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'valentine',
          heading: '',
          config: {},
        }),
      });
      const resDefault = await postMemory(postDefaultReq);
      harness.assert(resDefault.status === 201, 'POST valentine memory returned 201');
      const dataDefault = await resDefault.json();
      harness.assert(
        dataDefault.memory.type === 'valentine',
        'Created memory has type "valentine"'
      );
      harness.assert(
        dataDefault.memory.heading === DEFAULT_VALENTINE_QUESTION,
        `Empty heading defaults to "${DEFAULT_VALENTINE_QUESTION}"`
      );
      harness.assert(
        dataDefault.memory.config.yesLabel === 'Yes' &&
          dataDefault.memory.config.noLabel === 'No',
        'Default Yes/No labels applied'
      );
      harness.assert(
        Array.isArray(dataDefault.memory.config.noMessages) &&
          dataDefault.memory.config.noMessages.length === DEFAULT_VALENTINE_NO_MESSAGES.length,
        'Default mobile noMessages applied'
      );

      // Update Valentine memory with custom labels & microcopy
      const valId = dataDefault.memory.id as string;
      const putCustomReq = new Request(`http://localhost:3000/api/memories/${valId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'valentine',
          heading: 'Will you go on another adventure with me?',
          config: {
            yesLabel: 'Always!',
            noLabel: 'Nope',
            noMessages: ['Wait what?', 'Try again!', 'Not an option!'],
          },
        }),
      });
      const resCustom = await putMemory(putCustomReq, {
        params: Promise.resolve({ id: valId }),
      });
      harness.assert(resCustom.status === 200, 'PUT valentine memory returned 200');
      const dataCustom = await resCustom.json();
      harness.assert(
        dataCustom.memory.heading === 'Will you go on another adventure with me?',
        'Custom Valentine question updated'
      );
      harness.assert(
        dataCustom.memory.config.yesLabel === 'Always!' &&
          dataCustom.memory.config.noLabel === 'Nope',
        'Custom Yes/No labels persisted'
      );
      harness.assert(
        dataCustom.memory.config.noMessages.length === 3 &&
          dataCustom.memory.config.noMessages[0] === 'Wait what?',
        'Custom mobile microcopy persisted'
      );

      // PUT Valentine memory omitting config preserves existing custom config
      const putOmitConfigReq = new Request(`http://localhost:3000/api/memories/${valId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          heading: '   ',
        }),
      });
      const resOmitConfig = await putMemory(putOmitConfigReq, {
        params: Promise.resolve({ id: valId }),
      });
      const dataOmitConfig = await resOmitConfig.json();
      harness.assert(
        dataOmitConfig.memory.heading === DEFAULT_VALENTINE_QUESTION,
        'Blank heading on Valentine PUT falls back to default Valentine question'
      );
      harness.assert(
        dataOmitConfig.memory.config.yesLabel === 'Always!',
        'Omitted config on Valentine PUT preserves existing custom config'
      );

      // Add a standard memory, test type transition standard -> valentine -> standard, and reorder
      const postStdReq = new Request('http://localhost:3000/api/memories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'standard',
          heading: 'Standard Card',
          text: 'Caption',
          mediaId: 'img-1',
        }),
      });
      const resStd = await postMemory(postStdReq);
      const stdId = (await resStd.json()).memory.id as string;

      // Transition standard -> valentine via PUT
      const putToValReq = new Request(`http://localhost:3000/api/memories/${stdId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'valentine',
          heading: null,
          text: null,
          mediaId: null,
        }),
      });
      const resToVal = await putMemory(putToValReq, {
        params: Promise.resolve({ id: stdId }),
      });
      const dataToVal = await resToVal.json();
      harness.assert(
        dataToVal.memory.type === 'valentine' &&
          dataToVal.memory.heading === DEFAULT_VALENTINE_QUESTION &&
          dataToVal.memory.text === null &&
          dataToVal.memory.mediaId === null &&
          dataToVal.memory.config?.yesLabel === 'Yes',
        'PUT transition from standard to valentine initializes default question & config and clears nulled fields'
      );

      // Transition valentine -> standard via PUT
      const putToStdReq = new Request(`http://localhost:3000/api/memories/${stdId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'standard',
          heading: null,
          text: 'Restored Standard',
        }),
      });
      const resToStd = await putMemory(putToStdReq, {
        params: Promise.resolve({ id: stdId }),
      });
      const dataToStd = await resToStd.json();
      harness.assert(
        dataToStd.memory.type === 'standard' &&
          dataToStd.memory.heading === null &&
          dataToStd.memory.text === 'Restored Standard' &&
          dataToStd.memory.config === null,
        'PUT transition from valentine to standard clears config to null and allows null heading'
      );

      const reorderReq = new Request('http://localhost:3000/api/memories/reorder', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderedIds: [stdId, valId] }),
      });
      const reorderRes = await reorderMemories(reorderReq);
      harness.assert(reorderRes.status === 200, 'Reordering Valentine memory succeeded');
      const db = await readDb();
      harness.assert(
        db.memories[1].id === valId && db.memories[1].type === 'valentine',
        'Valentine memory can be positioned anywhere in the flow'
      );
    }

    // Test 3: Desktop proximity detection and safe dodging collision avoidance
    {
      console.log('\nTest 3: Desktop proximity radius & safe dodge bounding math');
      harness.assert(
        isPointerWithinProximity(150, 200, 180, 220, VALENTINE_PROXIMITY_RADIUS_PX) === true,
        'Pointer 36px away triggers proximity dodge (< 90px)'
      );
      harness.assert(
        isPointerWithinProximity(50, 50, 200, 200, VALENTINE_PROXIMITY_RADIUS_PX) === false,
        'Pointer 212px away does not trigger proximity dodge (> 90px)'
      );

      const yesRect: BoxRect = { x: 100, y: 220, width: 110, height: 48 };
      const headingRect: BoxRect = { x: 30, y: 80, width: 260, height: 64 };
      const noWidth = 96;
      const noHeight = 44;

      // Test across multiple deterministic RNG seeds on both 320x420 (small mobile/card) and 380x480 stages
      for (const stage of [
        { width: 320, height: 420 },
        { width: 380, height: 480 },
      ]) {
        let seed = 1;
        const rng = () => {
          seed = (seed * 16807) % 2147483647;
          return (seed - 1) / 2147483646;
        };

        const dodged = computeSafeDodgePosition({
          stageWidth: stage.width,
          stageHeight: stage.height,
          noWidth,
          noHeight,
          pointerX: 160,
          pointerY: 240,
          yesRect,
          headingRect,
          rng,
        });

        const dodgedRect: BoxRect = {
          x: dodged.x,
          y: dodged.y,
          width: noWidth,
          height: noHeight,
        };

        harness.assert(
          dodged.x >= 16 &&
            dodged.x + noWidth <= stage.width - 16 &&
            dodged.y >= 16 &&
            dodged.y + noHeight <= stage.height - 16,
          `Dodged No button stays strictly inside stage (${stage.width}x${stage.height})`
        );
        harness.assert(
          !rectsOverlap(dodgedRect, yesRect, 16),
          `Dodged No button does not overlap Yes button on ${stage.width}x${stage.height}`
        );
        harness.assert(
          !rectsOverlap(dodgedRect, headingRect, 12),
          `Dodged No button does not overlap Heading on ${stage.width}x${stage.height}`
        );
      }
    }

    // Test 4: Mobile 5-tap Yes growth, microcopy sequence, and No disappearance
    {
      console.log('\nTest 4: Mobile 5-tap progression & microcopy');
      const customMsgs = ['Sure?', 'Really?', 'Think twice!', 'Please!', 'Final answer?'];
      const s0 = getMobileValentineStepState(0, customMsgs, false);
      harness.assert(s0.yesScale === 1.0, 'Initial Yes scale is 1.0');
      harness.assert(s0.noScale === 1.0, 'Initial No scale is 1.0');
      harness.assert(s0.isNoHidden === false, 'Initial No is visible');
      harness.assert(s0.activeMicrocopy === null, 'Initial microcopy is null');

      let prevYesScale = s0.yesScale;
      for (let tap = 1; tap < VALENTINE_MAX_NO_TAPS; tap++) {
        const st = getMobileValentineStepState(tap, customMsgs, false);
        harness.assert(
          st.yesScale > prevYesScale,
          `Tap ${tap} increases Yes scale (${prevYesScale} -> ${st.yesScale})`
        );
        harness.assert(st.isNoHidden === false, `Tap ${tap} keeps No visible (< 5 taps)`);
        harness.assert(
          st.activeMicrocopy === customMsgs[tap - 1],
          `Tap ${tap} shows microcopy "${customMsgs[tap - 1]}"`
        );
        prevYesScale = st.yesScale;
      }

      const s5 = getMobileValentineStepState(VALENTINE_MAX_NO_TAPS, customMsgs, false);
      harness.assert(s5.isNoHidden === true, 'After 5th tap, No becomes hidden & non-interactive');
      harness.assert(s5.noOpacity === 0, 'After 5th tap, No opacity is 0');
      harness.assert(
        s5.yesScale > prevYesScale,
        `5th tap grows Yes to maximum prominence (${s5.yesScale}x)`
      );
    }

    // Test 5: Accessibility - prefers-reduced-motion disables scaling & uses gentle fade
    {
      console.log('\nTest 5: prefers-reduced-motion disables scaling and fades No smoothly');
      const rm0 = getMobileValentineStepState(0, DEFAULT_VALENTINE_NO_MESSAGES, true);
      const rm3 = getMobileValentineStepState(3, DEFAULT_VALENTINE_NO_MESSAGES, true);
      const rm5 = getMobileValentineStepState(5, DEFAULT_VALENTINE_NO_MESSAGES, true);

      harness.assert(
        rm0.yesScale === 1.0 && rm3.yesScale === 1.0 && rm5.yesScale === 1.0,
        'Reduced motion keeps Yes scale at 1.0 without large scaling animation'
      );
      harness.assert(
        rm0.noOpacity === 1.0 && rm3.noOpacity === 0.4 && rm5.noOpacity === 0,
        'Reduced motion fades No opacity down in steps until 0 on tap 5'
      );
      harness.assert(
        rm5.isNoHidden === true,
        'Reduced motion still hides No after 5 taps'
      );
    }

    // Test 6: Bottom Navigation Controls on Valentine Memory Cards
    {
      console.log('\nTest 6: Bottom navigation controls on Valentine memories');

      const getTimelineControlState = (
        currentIndex: number,
        totalMemories: number,
        isValentine: boolean
      ) => {
        return {
          footerVisible: true,
          prevDisabled: currentIndex === 0,
          nextDisabled: currentIndex === totalMemories - 1,
          centerControl: currentIndex === 0 && !isValentine ? 'like' : 'rewind',
          rewindDisabled: currentIndex === 0,
        };
      };

      // Valentine at index 0 (first card of 3)
      const v0 = getTimelineControlState(0, 3, true);
      harness.assert(v0.footerVisible === true, 'Footer is visible when Valentine is at index 0');
      harness.assert(v0.prevDisabled === true, 'Previous button disabled at index 0');
      harness.assert(v0.nextDisabled === false, 'Next button enabled at index 0 of 3');
      harness.assert(v0.centerControl === 'rewind', 'Valentine at index 0 renders rewind control (not like)');
      harness.assert(v0.rewindDisabled === true, 'Rewind button disabled at index 0');

      // Valentine at index 1 (middle card of 3)
      const v1 = getTimelineControlState(1, 3, true);
      harness.assert(v1.footerVisible === true, 'Footer is visible when Valentine is at index 1');
      harness.assert(v1.prevDisabled === false, 'Previous button enabled at index 1');
      harness.assert(v1.nextDisabled === false, 'Next button enabled at index 1 of 3');
      harness.assert(v1.centerControl === 'rewind', 'Valentine at index 1 renders rewind control');
      harness.assert(v1.rewindDisabled === false, 'Rewind button enabled at index 1');

      // Valentine at index 2 (last card of 3)
      const v2 = getTimelineControlState(2, 3, true);
      harness.assert(v2.footerVisible === true, 'Footer is visible when Valentine is at index 2');
      harness.assert(v2.prevDisabled === false, 'Previous button enabled at index 2');
      harness.assert(v2.nextDisabled === true, 'Next button disabled on last card');
      harness.assert(v2.centerControl === 'rewind', 'Valentine at index 2 renders rewind control');
      harness.assert(v2.rewindDisabled === false, 'Rewind button enabled on last card');

      // Contrast with standard memory at index 0
      const std0 = getTimelineControlState(0, 3, false);
      harness.assert(std0.centerControl === 'like', 'Standard memory at index 0 renders like control');
    }
});

