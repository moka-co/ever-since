# EverSince: Design Document

## Objectives & Goals
- Create an intuitive and accessible user experience, specifically tailored for non-tech-savvy users.
- Design a visually appealing, cute, and aesthetic website that feels personal and romantic.
- Ensure the overarching design seamlessly supports technical constraints and features (local media limits, single shared secret authentication).

## Target Audience
- **Primary Demographic**: Young couples tracking anniversaries and shared memories.
- **Key Consideration**: The design assumes that the partner (or both users) may be non-tech-savvy, requiring straightforward navigation, forgiving interactions, and clear emotional framing.

## Scope & Deliverables
- **High-fidelity UI mockups** (e.g., Figma)
- **Design System / Component Tokens** (typography scale, spacing, color contrast tokens)
- **Exported Assets** (SVGs, icons, sounds, and interactive micro-assets)

## Specific Design Challenges
- **Aesthetic vs. Functionality**: Balancing a deeply romantic, soft aesthetic with clean, accessible usability that never overwhelms the user.
- **Duality of Interfaces**: Delivering a deeply romantic, gesture-driven main flow alongside a strictly utilitarian, desktop-only admin interface for authoring.
- **Accessibility & Contrast**: Supporting WCAG AA contrast standards (minimum 4.5:1 for body text, 3:1 for interactive elements) while working with warm pastel themes.
- **Input Modality Parity**: Adapting desktop pointer behaviors (like hover-based dodging buttons) into intuitive mobile touch equivalents without breaking the illusion.

## Style, Mood, & Design System

### Color Palette
- **Color Tokens**:
  - **Sfondo di base (Base / Surface Background - `--background-base`)**: `#FAFAFA` o `#FFFFFF` (superficie pulita o neutra per card e pannelli).
  - **Testo principale (Primary Text - `--foreground`)**: `#1E1B24` (un nero profondo con un accenno minimo di caldo/prugna, molto più armonico del grigio asfalto; garantisce contrasto elevato WCAG AA).
  - **Testo secondario / Muted (`--muted`)**: `#6B7280` (grigio neutro per didascalie, placeholder e testo secondario).
  - **Contorno cards (`--card-border`)**: `#E5E7EB` (grigio chiaro pulito) o `#F1E8EC` (un grigio chiarissimo con una puntina impercettibile di rosa/malva per legare il gradiente).
  - **Frecce di navigazione (`--nav-arrow` / `--nav-arrow-hover`)**: `#9CA3AF` allo stato base, con transizione a `#1E1B24` o `#DB2777` in hover.
  - **Accento bottoni (CTA - `--cta` / `--cta-hover`)**: `#DB2777` o `#BE185D` (magenta/lampone carico per garantire ottima leggibilità con testo bianco) oppure `#0F172A` (nero satinato per uno stile minimale ad alto contrasto).
- **Background (Mesh Gradient tenue - Aura soft)**:
  - Base color: `#fffafa` (soft warm ivory blush)
  - Mesh accents: `#ffd9e2` (warm blush at 15% 10%), `#ffe8d6` (warm peach at 90% 25%), `#e9ddff` (soft lavender at 50% 100%)
  - **Standard CSS**:
    ```css
    background-color: #fffafa;
    background-image:
      radial-gradient(60% 50% at 15% 10%, #ffd9e2 0%, transparent 70%),
      radial-gradient(50% 45% at 90% 25%, #ffe8d6 0%, transparent 70%),
      radial-gradient(55% 50% at 50% 100%, #e9ddff 0%, transparent 70%);
    background-attachment: fixed;
    ```
- **Contrast Rule (WCAG AA)**: 
  - Pastels and soft tints are strictly reserved for backgrounds, surface fills, and gentle decorative accents.
  - Text, icons, and interactive elements must use high-contrast saturated "anchor" tones (minimum 4.5:1 contrast for body copy; 3:1 for large headers and actionable buttons).

### Typography
- **Font Family**: Nunito (a warm, rounded, humanist sans-serif combining high legibility with friendly personality).
- **Typographic Scale**:
  - **Memory Header**: 28px (Bold / Semi-bold, line-height 1.25)
  - **Body Text**: 16px (Regular, line-height 1.5)
  - **Caption / Subtext**: 13px (Medium, line-height 1.4)

### Components & Motion
- **Component Geometry & Shadows**:
  - **Mandatory Rounded Corners**: All cards across the application (including login, date-entry, admin dashboard, and memory flow cards) must have round corners (e.g., `rounded-2xl` for admin/login cards and `rounded-3xl` / `rounded-[32px]` for memory cards). Sharp right-angled edges are strictly prohibited.
  - **Card Shadows (Required)**: All cards across the application require a subtle drop shadow (e.g., `shadow-sm` or `shadow-md`) alongside their border to ensure clean visual separation, depth, and contrast against the pastel gradient background.
  - Generous touch targets (minimum 44x44px).
- **Motion & Reduced Motion (`prefers-reduced-motion`)**:
  - Default: Subtle bouncy transitions, card slide gestures, and interactive spring physics.
  - When reduced motion is preferred: Bouncy and slide animations are replaced with gentle 150ms crossfades; dynamic runaway button movement is disabled in favor of static, accessible progression.
  - **Skeleton loading**: use skeleton loading in customize and main flow, implemented using the shadcn/ui Skeleton component.

## Page-Specific Design Guidelines

### Login Screen (Emotional Framing & Failure States)
- **Concept**: Sentimental framing that turns authentication into part of the narrative (e.g., "Ever since [date]...").
- **Card Visuals & Input**: Enclosed in a centered elevated white card with generous rounding (`rounded-[36px]` / `rounded-[40px]`), warm outline (`border-[#F1E8EC]`), and soft rose drop shadow (`shadow-[0_12px_40px_rgba(255,150,170,0.22)]`), cleanly elevated above the mesh canvas. Features a minimalist rounded input (`rounded-2xl border-[#F1E8EC] bg-[#FAF7F8]`) and a signature rose-gradient primary action button (`from-[#F472B6] to-[#FB7185]`) matching the rest of the application.
- **Input Guidance**: Includes a subtle, romantic placeholder hint (e.g., `"Our date..."`) to gently guide the user without breaking immersion.
- **Failure States & Escalating Feedback (3 Attempts)**:
  - NOTE important: this is on the second login flow when the user has to insert the date. THIS IS NOT ON THE SECRET.
  - Attempt 1: Gentle input shake with playful pleading copy: *"I'm crying, 3 tries left"*.
  - Attempt 2: Gentle input shake with playful urgency copy: *"Why do you hate me, 2 tries left"*.
  - Attempt 3: Gentle input shake with final warning copy: *"You're almost single, 1 try left"*.
- **Lockout Screen (Cooldown Period)**:
  - The first 3 failed date attempts show escalating feedback. The 4th failed attempt activates a 30-second lockout cooldown.
  - Displays a playful cooldown screen: *"Don't talk to me for [MM:SS]..."* alongside an active real-time countdown timer before retrying is automatically unlocked.
  - Logging: A warning log event (`date_cooldown_activated`) is emitted in backend logs strictly when the cooldown is activated. Intermediate failed attempts are not logged.

### Date-Entry Screen (Story Initiation)
- **Concept**: Occurs immediately after successful authentication to kick off the memory timeline.
- **Visuals & Layout**: Identical design language to the rest of the application, featuring single elevated cards (`rounded-[36px]` / `rounded-[40px]`, `shadow-[0_12px_40px_rgba(255,150,170,0.22)]`) for both date input and the introductory seal photo/meme.
- **Input & Submission**: Minimalist segmented date input (`DD / MM / YYYY`) with auto-advancing focus and gradient "Start Story" pill button. Submitting a valid date initiates the transition into the linear memory flow.

### Logout Screen
- **Visuals & Feedback**: Centered elevated white card (`rounded-[36px]` / `rounded-[40px]`) echoing the memory flow with signature progress dots (`#F1D6DE` and active `#D4537E` pill), displaying "Redirecting to login" before smooth transition.
- **Autofocus & Mobile Keyboards**: 
  - Autofocus the first input field on load to reduce interaction friction.
  - For segmented date fields (`DD / MM / YYYY`), automatically advance focus to the next field as digits are entered (auto-advancing from `DD` to `MM` to `YYYY`).
  - Set `inputmode="numeric"` and `pattern="[0-9]*"` across date inputs to invoke dedicated mobile numeric keyboards automatically.

### Main Memory Flow & Navigation
- **Structure**: A linear, swipeable flow where only **1 modern card is viewed at a time**.
- **Media Presentation & Stack Cue**:
  - **Lifted Card & Mandatory Round Corners**: Cards feature generous rounded corners (`rounded-[36px]` / `rounded-[40px]`) and a soft rose drop shadow (`0 12px 40px rgba(255,150,170,0.22)`) so the white card feels elevated and cleanly separated from the warm ivory mesh canvas.
  - **Stacked Card as Visual Clue**: The peeked card positioned beneath (`translate-x-3.5 translate-y-2`) inherits the same generous curvature (`rounded-[36px]` / `rounded-[40px]`), delicate outline, and subtle shadow (`0 10px 35px rgba(255,150,170,0.18)`), perfectly preserving the tactile illusion of an overlapping card stack. **Exclusivity**: The double fake card effect is strictly exclusive to the main flow (`/`) and must not be used on other views (such as `/login`, `/logout`, or `/customize`), which use clean, single elevated cards.
  - **Integrated Narrative Caption**: Media (photo or video in a rounded inner frame) and text (headline + description) are integrated together inside the card, centered directly beneath the photo, creating a cohesive, symmetrical memory card.
  - **Video Playback & Audio (Click-to-Play)**: Videos in the main flow start paused with a delicate frosted glass play button (`▶`) overlay. Tapping or clicking the video toggles playback with unmuted audio, fulfilling the browser user-gesture requirement so sound plays reliably without autoplay blocks. Navigating away automatically pauses and resets the video.
- **Progress Indicator**:
  - Positioned closely above the card (`mb-4` / `mb-5`), utilizing dynamic sliding dots with soft blush tones (`#F1D6DE`) for inactive dots.
  - The active indicator expands into an elongated pill in cool berry rose (**`#D4537E`**), providing crisp visual contrast against the pastel backdrop.
- **Navigation Controls & Toolbar**:
  - Compact toolbar centered directly below the card uniting `< Prev`, center action (Like or `↺ Rewind`), and `Next >`:
    - **Previous (`<`)**: Secondary circular button in milk-white with delicate border and subtle shadow (`disabled` at memory 0).
    - **Center Action (`Like` or `↺ Rewind`)**:
      - On the first card of a standard memory (`currentIndex === 0 && !isValentine`), renders an Instagram-style one-time heart Like button.
      - On subsequent cards or on Special Valentine memories, renders a stationary 1.5-second press-and-hold Rewind button (`↺`). Holding it activates the dedicated `RewindOverlay` modal layer over the card with a 96px circular SVG progress ring and status label, while the button stays in place in the toolbar.
    - **Next (`>`)**: Primary action button styled with an eye-catching peach-pink gradient (`from-[#F472B6] to-[#FB7185]`), white chevron, and glowing rose shadow (`disabled` on the last memory).
  - Mobile swipe gestures on the card remain supported for natural one-handed browsing.
  - Controls remain fully visible and interactive on Special Valentine memories as well.
- **Mobile Swipe Hint & Card Peek Discovery**:
  - **Purpose**: Affordance discovery for touch-device users without cluttering the screen or obstructing romantic memories.
  - **Trigger & Mobile Exclusivity**: Evaluated purely client-side on touch devices (`(hover: none) and (pointer: coarse)` with viewport width `<= 768px`). Displays exclusively on the first memory card after 4 seconds of inactivity, provided there is more than one memory. Desktop browsers render nothing and attach no timers.
  - **Motion & Visual Choreography**:
    - **Card Peek**: The front card translates ~24px to the left with an elastic/spring easing, briefly unveiling the faux stacked card beneath before returning to center (cycle duration ~900ms).
    - **Hand Swipe Floating Capsule**: Placed in the lower-middle area of the card (`pointer-events-none`, `aria-hidden="true"`), a frosted capsule (`bg-white/90 backdrop-blur-md border border-[#F1D6DE] shadow-[0_4px_20px_rgba(212,83,126,0.22)]`) featuring berry rose double chevrons, hand swipe SVG, and subtle uppercase "SWIPE" copy slides right-to-left in lockstep with the card peek and softly fades out.
    - **Cycle Cadence**: Plays 2 cycles (~1800ms) then pauses. Repeats every ~6 seconds if user remains inactive, capped at 3 shows per session (`sessionStorage`).
    - **Instant Dismissal**: Any interaction (`touchstart`, `touchmove`, `pointerdown`, `scroll`, `click`, `keydown`) instantly dismisses the hint with a 150ms fade and resets the inactivity timer.
    - **Permanent Dismissal**: Navigating beyond the first card permanently disables the hint via `localStorage.swipeHintDismissed`.
    - **Accessibility (`prefers-reduced-motion`)**: When reduced motion is preferred, all horizontal translations are disabled (`x = 0`); the indicator displays in-place with a soft opacity fade.
- **Empty State (Main Flow)**:
  - When no memories have been published yet, renders a minimal, romantic placeholder card: *"Our memories are still being written... Check back soon!"*
  - Status: [TO REFINE: Placeholder illustration and custom copy]

### Interactive "Fun" Buttons
- **Current interaction**: A Valentine memory provides the dodging Yes/No prompt described below. Additional playful buttons, such as a pixel seal or sound bites, are ideas for a future version.
- **Visuals**: Distinct playful aesthetic (bouncy keyframe animations, vibrant borders) contrasting with the surrounding calm aesthetic to invite interaction.
- **Touch / Mobile Interaction (Dodging Yes/No)**:
  - On touch devices (where pointer hover does not exist), tapping "No" does not jump across the screen. Instead, each tap shrinks the "No" button while progressively scaling up the "Yes" button. After a fixed number of attempts, "No" disappears entirely, leaving only "Yes" spanning the full interaction area.
- **Desktop Pointer Interaction**:
  - Standard runaway movement where "No" shifts position on pointer proximity or hover, eventually disappearing after repeated evasions.
- **Keyboard Interaction**:
  - Tab navigates between interactive options. Pressing `Enter` on a focused "No" triggers the shrinking "No" and growing "Yes" progression. The user can also Tab directly to "Yes" and press `Enter` to confirm.

### Admin Dashboard (`/customize`)
- **Platform Constraint**: **Explicitly Desktop-Only** (viewport width >= 1024px). Accessing `/customize` on mobile displays a clear, polite notice requesting the user open the dashboard on a computer.
- **Visuals & Layout**:
  - **Structure**: Single elevated card container with generous rounding (`rounded-[36px]` / `rounded-[40px]`) and soft rose elevation shadow.
  - **Logical Grouping**: To minimize vertical scrolling and cognitive load, related settings should be visually grouped into logical sections (e.g., General Settings, Media Library, Memories Timeline), using tabbed interfaces or accordions when possible.
  - **Evident Separation Lines**: Distinct, evident dividing lines in soft dusty mauve (`#C4A2B2`) cleanly delineate each section and sub-column, replacing faint, low-contrast borders.
  - **Story Initiation Sub-Section (Two Columns)**: A dedicated two-column grid at the top uniting the kickoff settings:
    - **Column 1 (Anniversary Date)**: Date picker input and primary save button for the recurrence date.
    - **Column 2 (First Photo)**: Media dropdown selector and live thumbnail preview for the photo or seal meme shown on the login date-entry screen.
  - **Save Action Feedback**: Form submissions across the dashboard must provide clear, immediate inline visual feedback (e.g., a "Save" button temporarily shifting to a green "✓ Saved!" state) to reassure non-technical users without requiring intrusive modals.
- **Media Library Optimization**:
  - **Partitioned Sections (Photos vs. Videos)**: Media assets are cleanly segregated into dedicated **Photos** and **Videos** sections, each displaying its own badge count (e.g. `Photos (4)`, `Videos (1)`), empty states, and responsive thumbnail grids.
  - **Autoplaying Looping Video Previews (1.5x Speed)**: Videos in the media library and pickers render live with `autoPlay`, `loop`, `muted`, `playsInline`, and accelerated `1.5x` playback rate (`playbackRate = 1.5`) for fast previewing. The `<video>` element utilizes `pointer-events-none` so hovering triggers the delete action overlay effortlessly.
  - **Unused Media Visual Badge**: Items not currently assigned to any memory or seal feature a prominent amber badge (`Unused`), giving admins immediate visibility into unreferenced assets.
  - **Grid View over List View**: Uploaded media are displayed in a dense grid of square thumbnails (`aspect-square`) to significantly reduce vertical scrolling, elegantly accommodating up to 50 items.
  - **Minimalist Clean UI**: Technical metadata like full filenames and pixel dimensions are intentionally hidden. 
  - **Refined Destructive Actions**: Harsh, text-heavy red "Delete" buttons are replaced by subtle trash can icons presented via a dark overlay on hover, preserving visual focus on the media.
  - **Custom Upload Zone**: The native browser file input is replaced by cohesive, custom-styled upload buttons with clear format and size allowances.
- **Memories Timeline & Workflow**:
  - **Enlarged Memory Preview & Interactive Photo Framing**:
    - When media is selected in the Add/Edit Memory form, an enlarged 4:5 card media preview (`aspect-[4/5]`) matches the main flow media frame.
    - **2D Click & Drag Panning**: For photos, clicking or dragging horizontally and vertically across the preview adjusts focal positioning (`mediaPositionX` and `mediaPositionY`, 0%–100%, default 50%).
    - **Photo Zoom Controls (Wheel & Toolbar)**: Admins can zoom photos from `1.0x` to `3.0x` using mouse wheel scrolling directly on the preview or using the inline zoom toolbar (`−`, `${scale}x`, `+`, `Reset`).
    - **Clean Minimalist Framing Cue**: Redundant sliders, preset buttons ("Left", "Center", "Right"), and percentage pills are removed, leaving a single clean overlay badge (`↔ Click or drag to move`).
    - **Video Volume Controls in Preview**: For videos, the enlarged preview provides dedicated audio controls (Mute/Unmute toggle, -10%/+10% step buttons, volume slider, and live percentage readout) with live audio playback.
    - **Live Crop & Zoom Synchronization**: Normalized positioning and scale are mirrored identically across the authoring preview, memories list thumbnails, and main flow timeline cards.
  - **Visual Media Picker (no filename dropdowns)**: Media is never chosen from a native `<select>` of filenames. Uploaded files usually have opaque UUID names, so a text list is unusable for non-tech-savvy users. Instead, the form shows the current choice as a large thumbnail tile ("+" when empty); clicking it opens a modal grid of square thumbnails with a pink ring + ✓ badge on the selected item, a "No photo" tile and an "Upload" tile. Picking a thumbnail selects it and closes the modal. Escape or clicking the backdrop dismisses it. Rationale: people recognise photos, not filenames.
  - **Inline Media Uploads**: When authoring a new memory, users can upload new media directly from within the "Add Memory" form (both from the form and from the picker's Upload tile). A freshly uploaded file is auto-selected, removing the friction of navigating back to the Media Library first.
  - **Distinct Edit Mode**: Adding and editing share one form, but editing must be unmistakable: the form container switches to a soft rose tint with a border, the title becomes "Editing Memory" with a pulsing dot, and a "Cancel Edit" action is always visible. Rationale: identical-looking states caused users to overwrite or duplicate memories by mistake.
  - **Grid Timeline**: Memories are shown as cards in a 2-column grid (1 column on mobile), each with a square media thumbnail, header and a 2-line text excerpt, to keep vertical scrolling low as the timeline grows to 50 items.
  - **Reordering**:
    - Drag-and-drop memory reordering designed for mouse interactions.
    - **Keyboard Reordering Fallback**: Backward/Forward (← →) arrow buttons placed next to the drag handle on each card, allowing keyboard-only users to reorder items using Tab and Enter/Space.
  - **Quota Badges & Feedback**:
    - Distinct quota badges (e.g., "12 / 50 media files used", "8 / 50 memories used") provide real-time limits awareness.
    - **Inline Error & Retry Feedback**: If a media upload or database write fails, an inline error notification is displayed directly on the affected item or upload dropzone.
  - **Planned Button Authoring**:
    - A future general button registry would provide a dropdown of fun buttons and a form to configure their options. The current dashboard offers Standard and Valentine memory types instead.
- **Empty State (Admin Dashboard)**:
  - Displays a clean, dashed dropzone with a clear prompt: *"No memories yet. Upload your first photo or video above to begin building the timeline."*
  - Status: [TO REFINE: Onboarding guidance and empty state layout]

## Resources

- https://github.com/VoltAgent/awesome-design-md/tree/main/design-md

### Website & App Inspirations (UI/UX References)
*Note: Refer to repository READMEs, screenshots, and live demos for component styling and interaction cues.*
- https://github.com/matheusvps/ThreeYears
- https://github.com/panthosarkar/wife-anniversary-site
- https://github.com/Navaneeth223/timeless-love-anniversary-app
- https://giftsqr.com/en/seo/couple-timeline-website
- Yes/No button reference projects:
  - https://github.com/ivysone/Will-you-be-my-Valentine-
  - https://aayushgoel.dev/will-you-be-my-valentine/
  - https://github.com/ravikantmahi/Be-My-Valentine



## Figma prototype

- Grayscale prototype UI/UX only, ignore aesthetics: https://www.figma.com/design/RTCRnh6OiuRNrSxkpjFWZg/Untitled?node-id=0-1&m=dev&t=lWgPGJBU2ph7qnsE-1

## Main Flow UI Refinements

### 1. Larger Photo with 4:5 Aspect Ratio
- **What Changed & Why**: Updated the memory card media container in the main timeline flow (`/`) from a 1:1 square (`aspect-square`) to a taller 4:5 portrait ratio (`aspect-[4/5]`, CSS `aspect-ratio: 4 / 5; object-fit: cover`). Portrait photos are the natural format on mobile phones, and a 4:5 frame utilizes vertical screen real estate much more effectively while preserving room for the narrative caption and navigation controls.
- **Final Design Decisions**:
  - **Aspect Ratio & Framing**: Every card's `<figure>` uses `aspect-[4/5]` with `object-cover` on `<img>` and `<video>`, keeping the existing inner border radius (`rounded-[22px] sm:rounded-[26px] md:rounded-[28px]`), card padding (`p-4 sm:p-5`), and integrated caption below the media.
  - **Viewport-Aware Sizing (No Page Scroll)**: To guarantee that the pagination dots above, the card, and the control toolbar below fit completely within the mobile viewport without triggering vertical page scroll (tested across `360x640` and `412x915` screens), the card container width scales dynamically with available `dvh`: `w-[min(calc(100vw-3.25rem),calc((100dvh-17rem)*4/5),360px)] sm:w-[clamp(280px,calc((100dvh-16rem)*4/5),400px)]`.
- **Modified Files & Components**:
  - `ever-since/app/timeline-client.tsx` (`TimelineClient` card container and media `<figure>`)
  - `ever-since/app/loading.tsx` (`Loading` skeleton card container and media placeholder)

### 2. Instagram-Style Like Button on the First Card Only
- **What Changed & Why**: On the very first memory card (`currentIndex === 0`), the rewind button (which is redundant on the first card since the user is already at the beginning) is replaced in the bottom control toolbar by an Instagram-style heart Like button. All subsequent cards (`currentIndex > 0`) keep the press-and-hold rewind button unchanged.
- **Final Design Decisions**:
  - **Position & Geometry**: Occupies the exact center control slot with identical dimensions and styling (`w-12 h-12 rounded-full bg-white border border-[#F1E8EC] shadow-sm`) so the 3-button toolbar never shifts horizontally when navigating between the first card and subsequent cards.
  - **Icon States & Colors**: Uses an inline SVG heart matching Instagram's heart iconography:
    - **Default (Unliked)**: Outline heart (`fill="none"`, `stroke="#374151"`, `strokeWidth="2"`), neutral dark gray stroke.
    - **Liked**: Solid filled heart in Instagram red (`fill="#FF3040"`, `stroke="#FF3040"`).
  - **One-Time Behavior & No Animation**: Tapping the button transitions `isLiked` from `false` to `true` once for the session. It cannot be un-liked or toggled off. After liking, the button is disabled (`disabled={isLiked}`) with `disabled:opacity-100 disabled:pointer-events-none` so it remains visually vibrant without dimming. By explicit design choice, there are no particle effects, confetti, floating hearts, or scale/bounce animations—just an immediate, clean state switch from outline to filled.
  - **Accessibility**: Announces `aria-label="Like"` with `aria-pressed="false"` before liking, and `aria-label="Liked"` with `aria-pressed="true"` after liking.
- **Modified Files & Components**:
  - `ever-since/app/timeline-client.tsx` (`TimelineClient` state and footer controls)
  - `ever-since/tests/timeline_ui.test.ts` (unit verification suite)

### 3. Two-Card Natural Photo Pile Stack Effect
- **What Changed & Why**: Replaced the single arbitrary right/bottom-offset peek card behind the main memory card with two decorative, fanned back cards anchored at the bottom center (`origin-bottom`). This creates the organic visual metaphor of a physical pile of printed photos resting beneath the current memory.
- **Final Design Decisions**:
  - **Back Card 1 (Closest, `-z-10`)**: Rotated `+2.5deg` (shifting subtly to `+2deg` on odd indices), offset right `clamp(6px, 1.8vw, 8px)` (`clamp(5px, 1.5vw, 6px)` on odd indices) and down `6px` (`5px` on odd indices), full opacity (`1`), with a softer shadow (`shadow-[0_6px_20px_rgba(255,150,170,0.12)] sm:shadow-[0_8px_26px_rgba(255,150,170,0.14)]`).
  - **Back Card 2 (Furthest, `-z-20`)**: Rotated `-2deg` (shifting subtly to `-2.5deg` on odd indices), offset left `clamp(-7px, -1.8vw, -5px)` (`clamp(-8px, -2vw, -6px)` on odd indices) and down `10px` (`11px` on odd indices), lower opacity (`0.75`), with the softest shadow (`shadow-[0_4px_14px_rgba(255,150,170,0.08)] sm:shadow-[0_6px_20px_rgba(255,150,170,0.10)]`).
  - **Surface & Geometry**: Both back cards match the main card's border radius (`rounded-[32px] sm:rounded-[36px] md:rounded-[40px]`), white background (`bg-white`), and delicate border (`border-[#F1E8EC]`), rendered without inner content, `aria-hidden="true"`, and `pointer-events-none`.
  - **Remaining Cards Rule**: Driven by `remainingCards = Math.max(0, memories.length - 1 - currentIndex)`:
    - `2` back cards shown when at least `2` cards remain after the current one.
    - `1` back card (`Back Card 1`) shown when only `1` card remains.
    - `0` back cards shown on the last card.
  - **Alive Navigation Transition & Accessibility**: Transform and opacity values are driven by CSS custom properties (`--stack-rotate`, `--stack-x`, `--stack-y`) with `transition-[transform,opacity] duration-300 ease-out` so the pile subtly shifts and tucks away as the user progresses. `motion-reduce:transition-none` disables transitions when `prefers-reduced-motion` is enabled.
- **Modified Files & Components**:
  - `ever-since/app/timeline-client.tsx` (`TimelineClient` stack pile rendering and remaining-card logic)
  - `ever-since/tests/timeline_ui.test.ts` (unit verification suite)

### 4. Special Button Memory Type: "Valentine" (`type: "valentine"`)
- **Concept & Data Model**:
  - A "special button" memory replaces the standard photo + caption card with a full-stage interactive experience at any position in the memory flow.
  - Extended `memorySchema` in `ever-since/lib/storage/schema.ts` with:
    - `type: z.enum(['standard', 'valentine']).default('standard').optional()` — existing memories without `type` automatically default to `"standard"` with zero migration issues, and future special types can be added to the enum.
    - `config: valentineConfigSchema.nullable().default(null).optional()` containing:
      - `yesLabel` (string, 1–40 chars, default `"Yes"`)
      - `noLabel` (string, 1–40 chars, default `"No"`)
      - `noMessages` (array of up to 10 strings, 1–80 chars each, defaulting to `[":(", ":((", ":(((", ":,(( "]` / `[":(", ":((", ":(((", ":,(( "]`.map(s => s.trim()) i.e. `[":(", ":((", ":(((", ":,(("]`)
    - Default question (`heading`) when `type === "valentine"`: `"Will you be my valentine?"`.
- **Main Flow Rendering & Lock Behavior**:
  - When the active memory has `type === "valentine"`, the standard `<motion.article>` card stays mounted in the DOM for layout and height compatibility with `opacity-0 pointer-events-none` and `aria-hidden="true"`, and the decorative back-card stack is hidden (`opacity-0`).
  - While the Valentine interaction is unresolved for that memory ID in the current session, card drag/swipe gestures, the mobile swipe hint, the first-card like button, rewind, and `< Prev` / `Next >` controls are disabled and hidden (`opacity-0 pointer-events-none`) so the user cannot skip the prompt. Pagination dots remain visible above.
  - Document scroll (`document.body.style.overflow` and `document.documentElement.style.overflow`) is locked to `"hidden"` while the interaction is mounted and restored on cleanup.
  - Input mode is detected inside `useEffect` (preventing Next.js SSR/hydration mismatches) via `window.matchMedia("(hover: hover) and (pointer: fine)")` (desktop) and `window.matchMedia("(hover: none) and (pointer: coarse)")` (mobile).
- **Desktop vs. Mobile Interaction Rules & Final Values**:
  - **Desktop (`(hover: hover) and (pointer: fine)` — Dodging "No" Button)**:
    - **Proximity Radius**: `90px` (`VALENTINE_PROXIMITY_RADIUS_PX = 90`).
    - When the pointer approaches within `90px` of the `No` button's center (or enters it), `computeSafeDodgePosition` samples candidate coordinates inside the stage bounds (`16px` edge padding) that do not overlap the `Yes` button (`24px` safety margin) or the question heading (`18px` safety margin) and lie at least `110px` away from the pointer.
    - **Dodge Transition**: Smooth `180ms` ease-out transform (`transition-[transform,opacity] duration-[180ms] ease-out`).
  - **Mobile (`(hover: none) and (pointer: coarse)` — Growing "Yes" Button & Microcopy)**:
    - **Max "No" Taps**: `5` taps (`VALENTINE_MAX_NO_TAPS = 5`).
    - **Yes Scale Steps**: `[1.0, 1.35, 1.75, 2.25, 2.9, 3.8]` (`VALENTINE_YES_SCALE_STEPS`).
    - **No Scale Steps**: `[1.0, 0.9, 0.8, 0.7, 0.6, 0]` (`VALENTINE_NO_SCALE_STEPS`) paired with a `20px` per-step downward offset (`noOffsetY = step * 20`) so the growing `Yes` button never obscures `No` prior to tap 5.
    - **Microcopy Progression**: Taps `1..5` display the configured `noMessages` strings sequentially in a pill badge above the buttons.
    - **5th Tap Disappearance**: On the 5th tap (`step >= 5`), `No` becomes invisible and non-interactive (`opacity-0 pointer-events-none`, `disabled`, `aria-hidden="true"`, `tabIndex={-1}`), leaving `Yes` (`3.8x` scale) as the sole actionable choice.
- **Yes Outcome & Edge Cases**:
  - Tapping/clicking `Yes` marks the memory ID as resolved (`resolvedValentineIds`) and immediately advances to the next card using the standard slide transition (no intermediate success screen).
  - **Revisiting a Resolved Valentine Memory**: Navigating back (`< Prev` or `↺ Rewind`) remounts the Valentine interaction fresh so the partner can replay the buttons, while keeping the bottom `< Prev` / `Next >` controls unlocked since it was already answered once in the session.
  - **Valentine as the Last Card**: When `currentIndex === memories.length - 1`, clicking `Yes` resolves in-place—hiding `No`, transitioning `Yes` to `"♥ {yesLabel}!"`, displaying `"♥ Forever & always!"`, and unlocking the bottom `< Prev` and `↺ Rewind` controls.
- **Accessibility & `prefers-reduced-motion`**:
  - `Yes` is always first in DOM/tab order (`Heading -> Yes -> No`), focus is never trapped, and keyboard users activating `No` step through the 5-step sequence.
  - When `prefers-reduced-motion` is enabled, desktop dodging and large scale animations are disabled (`yesScale = 1.0`, `noScale = 1.0`); activating `No` cross-fades the microcopy and steps `No` opacity smoothly down (`[1.0, 0.8, 0.6, 0.4, 0.2, 0]`).
- **Customize Dashboard (`/customize`)**:
  - Admins can toggle between **Standard** and **Special: Valentine** when adding or editing any memory.
  - Editable Valentine fields: Question/Heading, Yes Button Label, No Button Label, and Mobile "No" Tap Microcopy (one per line, with a "Reset defaults" action).
  - Includes an **Interactive Valentine Preview** inside the form where clicking `No` live-tests the 5-tap growth and microcopy sequence.
- **Button Click Visual Feedback (Subtle Contour Changes)**:
  - Both "Yes" and "No" buttons provide tactile visual feedback on click/press via a subtle change in their contour:
    - **"Yes" Button**: Outlined with `border-transparent ring-2 ring-transparent ring-offset-2 ring-offset-transparent` at rest. Upon clicking or active press, transitions to an inner delicate translucent border (`border-white/50`) and a subtle rose outer contour ring (`ring-2 ring-[#FB7185]/70 ring-offset-2 ring-offset-white`).
    - **"No" Button**: Outlined with `border-[#F1E8EC] ring-2 ring-transparent ring-offset-1 ring-offset-transparent` at rest. Upon clicking or active press, shifts its border to a gentle rose tint (`border-[#F472B6]/70`) and highlights its contour with a soft blush ring (`ring-2 ring-[#F1D6DE] ring-offset-1 ring-offset-white`).
    - Feedback persists for `300ms` on quick tap/click with smooth CSS `transition-all duration-200`, providing responsive visual confirmation without intrusive scale or jarring movement. Also mirrored in the `/customize` interactive Valentine preview.
- **Modified & Created Files**:
  - `ever-since/lib/storage/schema.ts` (`memoryTypeSchema`, `valentineConfigSchema`, `memorySchema`)
  - `ever-since/app/api/memories/route.ts` & `ever-since/app/api/memories/[id]/route.ts`
  - `ever-since/components/valentine-memory.tsx` (`ValentineMemory` component and pure dodge/step helpers)
  - `ever-since/app/timeline-client.tsx` (overlay mounting, background card compatibility, and control locking)
  - `ever-since/app/customize/memories-manager.tsx` (type selector, Valentine editor fields, live preview, and timeline list badge)
  - `ever-since/tests/valentine_memory.test.ts` & `ever-since/package.json`

### 5. Hold-to-Rewind Modal Overlay Redesign
- **Concept & Problem Solved**:
  - Previously, holding the rewind button animated the toolbar button upward (`y: -120px`), overlapping the bottom photo edge and the card caption, while the `"Rewinding to beginning..."` label lived in a separate isolated photo mask.
  - Redesigned into a single, cohesive feedback layer (`RewindOverlay`) positioned above the card like a modal overlay.
  - The bottom toolbar rewind button remains stationary and uncluttered in the navigation footer.
- **Visual Design Tokens & Final Values**:
  - **Overlay Container**: Absolute layer covering the entire card area (photo AND caption) with matching corner radii (`rounded-[32px] sm:rounded-[36px] md:rounded-[40px]`) and soft elevation shadow (`shadow-2xl`).
  - **Dark Scrim & Blur**: `backgroundColor: rgba(0, 0, 0, 0.55)` with `backdrop-filter: blur(6px)` and `-webkit-backdrop-filter: blur(6px)`, dimming and softening the memory content beneath.
  - **Delayed Appearance**: The overlay appears only after `150ms` (`REWIND_SHOW_DELAY_MS = 150`) of continuous holding, preventing accidental flashes during quick taps or card swipes.
  - **Progress Ring & Icon**:
    - Central `96px` x `96px` SVG circular ring with `7px` thick white stroke (`#FFFFFF`, `strokeLinecap="round"`) over a faint white track (`rgba(255, 255, 255, 0.22)`).
    - Circumference: `~279.6px` (`2 * Math.PI * 44.5`), dynamically filling from 0% to 100% via `requestAnimationFrame` synced to the `1500ms` hold duration (`REWIND_DURATION_MS = 1500`).
    - White counter-clockwise rewind icon (`30px`) centered inside the ring.
  - **Label & Contrast**:
    - Text: `"Rewinding to beginning..."` positioned directly below the ring in bold white (`text-white font-bold text-sm sm:text-base`) with high contrast against the dark scrim (exceeding WCAG AA).
    - Positioned within the centered overlay group so it never overlaps or touches the card caption beneath.
  - **Completion Feedback**:
    - Upon reaching 100%, triggers a short confirmation scale pulse (`scale: [1, 1.12, 1]` over `150ms`) on the ring group.
    - Triggers haptic feedback via `navigator.vibrate(15)` where supported.
    - Transitions timeline index to `0` and fades out gracefully.
- **Gesture Safety & Accessibility**:
  - **Gesture Isolation**: Overlay uses `pointer-events-none` so active pointer capture on the rewind button is never interrupted.
  - **Swipe Protection**: Initial pointer coordinates are tracked; if pointer movement exceeds `10px` (`Math.hypot(dx, dy) > 10`), the hold is immediately cancelled and the overlay hidden, preventing gesture conflicts with card swipes.
  - **Long-press Protection**: Buttons enforce `user-select: none`, `-webkit-user-select: none`, `[-webkit-touch-callout:none]`, `touch-action: none`, and `onContextMenu={(e) => e.preventDefault()}` to avoid unwanted text selection or context menus.
  - **Reduced Motion**: Fully respects `prefers-reduced-motion` via `useReducedMotion()`; disables pop/scale transitions in favor of gentle opacity fades.
  - **Screen Readers**: Label includes `role="status"` and `aria-live="polite"` for non-visual assistive tech announcement.
- **Modified & Created Files**:
  - `ever-since/components/rewind-overlay.tsx` (new `RewindOverlay` component)
  - `ever-since/app/timeline-client.tsx` (RAF progress loop, 150ms delay, >10px gesture cancellation, stationary button, and overlay mounting)
  - `ever-since/tests/timeline_ui.test.ts` (unit tests for ring geometry, timing delays, and gesture safety)

### 6. Special Valentine Interaction Bottom Navigation Controls
- **Concept & Problem Solved**:
  - Unresolved Valentine cards previously hid the bottom navigation footer (`opacity-0 pointer-events-none`) and locked navigation until "Yes" was tapped.
  - Added full bottom controls to the Valentine card stage so users can navigate backward, hold to rewind, or skip forward naturally:
    - **Previous Button (`<`)**: Always visible; enabled whenever `currentIndex > 0` (disabled at index 0).
    - **Center Button**: On Valentine cards, always renders the **Rewind** button (instead of the photo-specific "Like" button), enabled whenever `currentIndex > 0`.
    - **Next Button (`>`)**: Always visible; enabled whenever `currentIndex < memories.length - 1` (disabled on last card).
- **Modified Files**:
  - `ever-since/app/timeline-client.tsx` (toolbar visibility and navigation button state mapping for Valentine cards)
  - `ever-since/tests/valentine_memory.test.ts` (unit test suite verifying Valentine bottom control states at index 0, intermediate cards, and last card)


