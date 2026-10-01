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
- **Status**: [TODO: Final color palette selection pending]
- **Contrast Rule (WCAG AA)**: 
  - Pastels and soft tints are strictly reserved for backgrounds, surface fills, and gentle decorative accents.
  - Text, icons, and interactive elements must use high-contrast saturated "anchor" tones (minimum 4.5:1 contrast for body copy; 3:1 for large headers and actionable buttons).
- **Constraint**: **STRICTLY AVOID RED.** Accent tones must lean into warm terracottas, dusty roses, soft mauves, or warm peaches instead of standard alert/crimson red.

### Typography
- **Font Family**: Nunito (a warm, rounded, humanist sans-serif combining high legibility with friendly personality).
- **Typographic Scale**:
  - **Memory Header**: 28px (Bold / Semi-bold, line-height 1.25)
  - **Body Text**: 16px (Regular, line-height 1.5)
  - **Caption / Subtext**: 13px (Medium, line-height 1.4)

### Components & Motion
- **Component Geometry**: Soft rounded corners (e.g., rounded-2xl to rounded-3xl), generous touch targets (minimum 44x44px), and subtle layered drop shadows.
- **Motion & Reduced Motion (`prefers-reduced-motion`)**:
  - Default: Subtle bouncy transitions, card slide gestures, and interactive spring physics.
  - When reduced motion is preferred: Bouncy and slide animations are replaced with gentle 150ms crossfades; dynamic runaway button movement is disabled in favor of static, accessible progression.

## Page-Specific Design Guidelines

### Login Screen (Emotional Framing & Failure States)
- **Concept**: Sentimental framing that turns authentication into part of the narrative (e.g., "Ever since [date]...").
- **Input Visuals**: A minimalist text input styled subtly to blend into the romantic copy rather than looking like an enterprise tech login box.
- **Input Guidance**: Includes a subtle, romantic placeholder hint (e.g., `"Our date..."`) to gently guide the user without breaking immersion.
- **Failure States & Escalating Feedback (5 Attempts)**:
  - Attempts 1–2: Gentle input shake with a warm retry prompt.
  - Attempt 3: Playful pleading copy: *"I'm crying, 3 tries left"*.
  - Attempt 4: Playful urgency copy: *"Why do you hate me, 2 tries left"*.
  - Attempt 5: Final warning copy: *"You're almost single, 1 try left"*.
- **Lockout Screen (Cooldown Period)**:
  - On 5 consecutive failed attempts, locks out further tries per IP/session.
  - Instead of a sterile error code, displays a playful cooldown screen: *"Don't talk to me for [MM:SS]..."* alongside an active real-time countdown timer before retrying is allowed.

### Date-Entry Screen (Story Initiation)
- **Concept**: Occurs immediately after successful authentication to kick off the memory timeline.
- **Visuals & Layout**: Near-identical aesthetic to the login screen, preserving the emotional, full-screen romantic framing (e.g., "The day our story began...").
- **Input & Submission**: A minimalist date input matching the login field styling. Submitting a valid date initiates the transition into the linear memory flow.
- **Autofocus & Mobile Keyboards**: 
  - Autofocus the first input field on load to reduce interaction friction.
  - For segmented date fields (`DD / MM / YYYY`), automatically advance focus to the next field as digits are entered (auto-advancing from `DD` to `MM` to `YYYY`).
  - Set `inputmode="numeric"` and `pattern="[0-9]*"` across date inputs to invoke dedicated mobile numeric keyboards automatically.

### Main Memory Flow & Navigation
- **Structure**: A linear, swipeable flow where only **1 modern card is viewed at a time**.
- **Media Presentation**:
  - Cards feature soft rounded corners (avoiding outdated Polaroid borders).
  - If the card container is a fixed square/rectangle, apply `object-fit: contain` with a soft ambient blurred background or pastel fill behind the photo to avoid awkward cropping of heads or borders.
  - A subtle card stack peek or soft edge shadow on the right indicates upcoming memories, explicitly showing nothing recognizable (strictly neutral shadow/edge with no thumbnail bleed) to preserve the sequential surprise.
- **Progress Indicator**:
  - A subtle, minimal series of faint dot indicators positioned unobtrusively at the top or bottom of the screen, providing orientation without distracting from the narrative.
  - Utilizes dynamic sliding dots (similar to Instagram/iOS carousels), where the active dot is larger and only ~5–7 dots are shown at a time with subtle shrinking on the edges.
- **Navigation Controls**:
  - Touch-based horizontal swipe gestures for mobile: On mobile, make sure the entire card responds naturally to horizontal swipe gestures so users don't have to precisely tap small circular arrows.
  - Subtle left and right navigation arrows positioned along the viewport edges for desktop pointer fallback.
- **Rewind Control**:
  - An unobtrusive "Rewind" button anchored at the bottom of the screen.
  - **Pointer & Touch Interaction**: A 1.5-second press-and-hold interaction with a circular/radial fill animation.
  - **Keyboard Interaction**: Pressing and holding `Enter` or `Space` on the focused Rewind button for 1.5 seconds triggers the identical radial fill and executes the rewind upon completion.
- **Empty State (Main Flow)**:
  - When no memories have been published yet, renders a minimal, romantic placeholder card: *"Our memories are still being written... Check back soon!"*
  - Status: [TO REFINE: Placeholder illustration and custom copy]

### Interactive "Fun" Buttons
- **Concept**: Playful buttons inserted into specific memories to surprise the partner (e.g., a pixel seal making squeaking noises, sound bites, or a dodging Yes/No prompt).
- **Visuals**: Distinct playful aesthetic (bouncy keyframe animations, vibrant borders) contrasting with the surrounding calm aesthetic to invite interaction.
- **Touch / Mobile Interaction (Dodging Yes/No)**:
  - On touch devices (where pointer hover does not exist), tapping "No" does not jump across the screen. Instead, each tap shrinks the "No" button while progressively scaling up the "Yes" button. After a fixed number of attempts, "No" disappears entirely, leaving only "Yes" spanning the full interaction area.
- **Desktop Pointer Interaction**:
  - Standard runaway movement where "No" shifts position on pointer proximity or hover, eventually disappearing after repeated evasions.
- **Keyboard Interaction**:
  - Tab navigates between interactive options. Pressing `Enter` on a focused "No" triggers the shrinking "No" and growing "Yes" progression. The user can also Tab directly to "Yes" and press `Enter` to confirm.

### Admin Dashboard (`/customize`)
- **Platform Constraint**: **Explicitly Desktop-Only** (viewport width >= 1024px). Accessing `/customize` on mobile displays a clear, polite notice requesting the user open the dashboard on a computer.
- **Visuals**: **Purely functional and utilitarian**. High contrast, clean tables/lists, and crisp controls optimized for upload speed, sorting, and clarity.
- **Media Management & Error Feedback**:
  - Direct multipart file upload zone with clear quota badges (e.g., "12 / 20 media files used") and file size feedback, clarifying that the 20-item cap applies to uploaded media assets rather than total memories.
  - **Inline Error & Retry Feedback**: If a media upload or database write fails, an inline error notification is displayed directly on the affected item or upload dropzone (e.g., *"Upload failed: File exceeds limit or network dropped • [Retry]"*). This ensures the admin can catch and fix issues before sharing the site, while end-user flows remain quiet.
- **Reordering**:
  - Drag-and-drop memory reordering designed for mouse interactions.
  - **Keyboard Reordering Fallback**: Up and Down arrow buttons placed adjacent to the drag handles on each row, allowing keyboard-only users to reorder items using Tab and Enter/Space.
- **Button Authoring**:
  - Admins select fun buttons from a dropdown populated by the fixed component registry, rendering a straightforward form to configure button options.
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
- 