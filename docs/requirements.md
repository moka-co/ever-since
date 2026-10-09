# Project Requirements

## Users requirements

### Who are the users
One user but conceptually two roles:
- The base user (partner), it just scroll the main flow and interact with elements in the main flow.
- The admin user (the one who set the site) it customize under an appropriate page the elements and photo that need to appear, and also checks the main flow for consistency

In practice for technical simplicity, the base user is also the admin user. Two assumptions in mind:
1. This is a shared place between two partners, so there is no hard constraint on what one can modify or view that the other can't. 
2. The app is build with the assumption that it's up for few days or week before and after the anniversary, then shut down. It is not adviced to keep the app for too much up since photos may still be sensible data 

### Base User
The base user can:
- Insert a password given by the admin user -> this completes the log in
- In case of incorrect password attempts, receive standard error feedback
- Reload the page or close the page and still be logged in for 72 hours (from the login).
- Insert the date to start the main flow (in case of incorrect date entries, receive escalating playful feedback across 3 attempts, followed by a 30-second cooldown lockout screen with live countdown timer)
- Experience the main flow, including interacting with items and viewing every memory with automatic image preloading (preventing blank flashes) and video audio controls (volume up/down and unmute).
- The user can either swipe (mobile) left/right or click on "<" or ">" arrow to go to prev/next memory
- At any point in the main flow, the base user can "rewind" (start from the beginning) and also go back

### Admin User
- Everything the base user can do
- Access `/customize` (desktop-only)
- Add, remove, and view memories (up to 50 memories cap)
- Add, remove and view photos or videos (up to 50 media files cap)
- Media Library organized into dedicated Photos and Videos sections, each displaying total counts, empty states, and delete actions.
- Autoplaying, looping video previews (accelerated 1.5x playback) in the Media Library and pickers.
- Visual indicator in Media Library marking uploaded photos/media currently unused in any memory or seal.
- Customize memories, including interactive 2D photo framing (`mediaPositionX` and `mediaPositionY`), photo zoom-in/out (`mediaScale`, 1.0x–3.0x), and video volume adjustment in card previews.
- Reordering memories with drag-to-reorder

### What is a memory
Imagine a flow in the main app that is very linear. Each element of this flow is a memory.
A memory may contain:
- An Header with larger font
- normal text with normal font
- an image or a video (mutually exclusive)
- 2D framing coordinates (`mediaPositionX` 0–100%, `mediaPositionY` 0–100%, default 50%) and zoom scale (`mediaScale` 1.0–3.0, default 1) for fitting photos cleanly inside cards
- buttons that don't really do anything complex or simple, fun interactions. 

Note: buttons have a fixed vocabulary of behaviours, code then yourself and add them in an appropriate file. 

Buttons idea to implement:
- Click on a pixelized seal (button) and then it makes small cutie seal noises
- Play a sound effect like Michael Jackson "ye-he"
- Yes/No button, move the no button away and playfully  force the partner to press "yes". After a fixed number of no tries, the button just disappear and only yes remains.

## Tech Stack
- Front-end: TypeScript (strict mode), Tailwind CSS
- Back-end: Next.js
- Data storage: flat JSON file with Zod validation on all reads/writes for type safety. Since there is a single authoring user (admin), the probability of write race conditions is minimal and practically negligible for this app. Timeline memories are capped at a maximum of 50 items. Media binaries are stored in the local filesystem (capped at a maximum quota of 50 media files). It is required that you can also upload files directly through the file system to the `media/` folder and also to the database, and use these if they are already available; a reconciliation process synchronizes the filesystem and database on login and on customize without unnecessary file renaming. The `GET /api/media/[id]` endpoint strictly serves only registered media files, preventing unauthorized file access or path traversal. Sharp handles image processing.
- Infra: Docker
- Authentication: App-generated pseudorandom string, 20 characters long, as the single shared secret. On correct entry, a cookie is set that keeps the session persistently logged in (no repeated re-entry). Cookie managed with `iron-session` session library.
- App structure: `/customize` for admin/editing route (desktop-only) and `/` for the main flow for the end user (partner)

## Non-functional requirements
**Responsiveness**: equally optimized for mobile and desktop for the main flow (`/`) and login, where layout and interactions must work well with both touch and pointer input. The `/customize` admin dashboard is explicitly desktop-only (>=1024px). Accessing `/customize` on mobile displays a polite notice requesting the user to open the dashboard on a desktop device.

**Accessibility**:
- For learning purposes, i'm treating this project as a real product, so i'll add semantic HTML, keyboard navigation and sufficinet contrast. I'll skip screen-reader support.
- Custom interactions like dodging yes/no button need non-mouse-dependent fallbacks.
- Alt-text isn't required

**Security**: basic rate limiting on `/login`, lock out after 5 failed attemps (the same IP cannot retry again, returns HTTP 403)

**Reliability**: if a write to `db.json` failes, fail silently to the end user but log the error server-side for later review. Ideally since the admin user also checks the entire flow, it should catch up any errors before showing it to the other user. 

**Performance**: no hard performance budget, and no strict Lighthouse or load-time targets

**Browser support**: evergreen browsers only like Chrome, Safari, Firefox, Opera.

## Appendix - Rationale for the name
I named the project **Ever-Since** because it's a phrase people already say naturally — "ever since we met...", "ever since that day..." — so it reads as warm and sentimental without trying too hard. It's also intentionally open-ended: unlike a name tied to "one year" or "two years," it doesn't lock the project to a single milestone, meaning the same site and name can be reused for every future anniversary without ever feeling dated. The phrase also implies continuity, the sense of a story still unfolding, which fits the photo-reveal format especially well: each photo becomes its own "since then" moment in an ongoing narrative rather than a static gallery. This theme extends naturally into the UI itself, to start the year rewind, the lock screen headline can read something like "Ever since [date]..." with a pseudo-password field placed right below it, turning what would otherwise be a mundane authentication step into part of the emotional framing. The same flexibility carries through to the tagline, which can be customized per year ("Ever since that day...", "Ever since you said yes", "Ever since us") while the site name stays constant, letting the project grow and adapt alongside the relationship it's built for.

## Discarded features / out of scope
- **Rate limiting detailed feedback & HTTP 429**: Originally, the app was supposed to return an HTTP 429 Too Many Requests status code with a `retryAfter` payload after 5 failed attempts.
- **Cooldown Timer UI**: A dedicated playful lockout screen with an active real-time countdown timer before retrying is allowed.
- **Escalating Feedback**: In case of incorrect password attempts, the UI would show escalating playful feedback (up to 5 attempts).