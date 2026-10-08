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
- **Constraint**: **STRICTLY AVOID RED.** Accent tones must lean into warm terracottas, dusty roses, soft mauves, or warm peaches instead of standard alert/crimson red.

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
- **Input Guidance**: Includes a subtle, romantic placeholder hint (e.g., `"Our date..."` or `"ask your nerd"`) to gently guide the user without breaking immersion.
- **Failure States & Escalating Feedback (5 Attempts)**
  - NOTE important: this is on the second login flow when the user has to insert the date. THIS IS NOT ON THE SECRET.
  - Attempts 1–2: Gentle input shake with a warm retry prompt.
  - Attempt 3: Playful pleading copy: *"I'm crying, 3 tries left"*.
  - Attempt 4: Playful urgency copy: *"Why do you hate me, 2 tries left"*.
  - Attempt 5: Final warning copy: *"You're almost single, 1 try left"*.

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
- **Progress Indicator**:
  - Positioned closely above the card (`mb-4` / `mb-5`), utilizing dynamic sliding dots with soft blush tones (`#F1D6DE`) for inactive dots.
  - The active indicator expands into an elongated pill in cool berry rose (**`#D4537E`**), providing crisp visual contrast against the pastel backdrop.
- **Navigation Controls & Toolbar**:
  - Compact toolbar centered directly below the card uniting `< Prev`, `↺ Rewind`, and `Next >`:
    - **Previous (`<`)**: Secondary circular button in milk-white with delicate border and subtle shadow.
    - **Rewind (`↺`)**: Centered 1.5-second press-and-hold button with circular radial fill animation in berry rose.
    - **Next (`>`)**: Primary action button styled with an eye-catching peach-pink gradient (`from-[#F472B6] to-[#FB7185]`), white chevron, and glowing rose shadow to establish clear narrative hierarchy.
  - Mobile swipe gestures on the card remain supported for natural one-handed browsing.
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
- **Visuals & Layout**:
  - **Structure**: Single elevated card container with generous rounding (`rounded-[36px]` / `rounded-[40px]`) and soft rose elevation shadow.
  - **Evident Separation Lines**: Distinct, evident dividing lines in soft dusty mauve (`#C4A2B2`) cleanly delineate each section and sub-column, replacing faint, low-contrast borders.
  - **Story Initiation Sub-Section (Two Columns)**: A dedicated two-column grid at the top uniting the kickoff settings:
    - **Column 1 (Anniversary Date)**: Date picker input and primary save button for the recurrence date.
    - **Column 2 (First Photo)**: Media dropdown selector and live thumbnail preview for the photo or seal meme shown on the login date-entry screen.
- **Media & Memories Management & Quota Feedback**:
  - Direct multipart file upload zone with clear quota badges (e.g., "12 / 50 media files used") and file size feedback.
  - Memories timeline authoring with a distinct 50-memory quota badge (e.g., "8 / 50 memories used"), disabling new additions and alerting the admin when the limit is reached.
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