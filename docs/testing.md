# Testing Strategy

## Overview
Given the project's nature—a temporary, highly interactive, and emotional web experience for couples—reliability, visual correctness, and smooth interactions are critical. The testing strategy prioritizes automated storage and API checks plus manual QA for complete user flows and playful components.

## Testing Layers

### Unit & Integration Testing
**Recommended Tool:** tsx / Vitest
**Scope:**
- **Storage Layer (`lib/storage/`):** Ensure the flat JSON database (`db.json`) reads and writes correctly via `readDb()` and `updateDb()`.
- **Hermetic Test Isolation:** Tests run in isolated temporary operating system directories (via `useTempDb` in `tests/helpers.ts`) using separate DB and media folders (`process.env.DB_PATH` / `process.env.MEDIA_DIR`). They **never touch the development DB (`data/db.json`)**, run completely self-contained, and do not require an active server process.
- **Data Validation:** Validate that Zod schemas correctly catch invalid data payloads on API endpoints and during disk writes.
- **API Logic:** Test Next.js API endpoints, specifically the rate-limiting logic on `/api/auth/login`, media serving security on `/api/media/[id]`, the 50-file quota limit on `/api/media`, and the 50-memory quota limit on `/api/memories`.

### Manual Testing & QA
**Scope:**
Since the app heavily features non-standard playful interactions and aesthetics, automated tests cannot cover everything.
- **Complete User Flow:** Manually verify password login and the 5-attempt IP ban; the separate date gate, its 4th-attempt cooldown and countdown; desktop-only customization, memory creation, media upload and reordering; and timeline swipe, arrow navigation, video playback, and rewind.
- **Playful Interaction:** Manually test the current Valentine Yes/No memory with mouse, touch, keyboard, and reduced motion. Test additional button types when the planned registry is implemented.
- **Visuals and Animations:** Verify that Tailwind animations, transitions, and typography (as defined in `design.md`) feel natural on actual physical mobile devices.
- **Media Processing:** Manually upload edge-case media files (e.g., close to the 10MB limit, HEIC formats if supported) to ensure Sharp correctly resizes, strips EXIF data, and handles failures silently for the base user.

## Best Practices & Conventions

### Test Naming
Name tests using the **USE** convention:
- **U**nit under test
- **S**cenario
- **E**xpectation
*Example:* `it('MemoryQueue (Unit), when concurrent writes occur (Scenario), should serialize writes to prevent data loss (Expectation)')`

### Test Structure
Use the **Arrange-Act-Assert (AAA)** pattern for all test blocks:
- **Arrange:** Set up test data, stubs, and initialize the unit under test.
- **Act:** Execute the specific function or trigger the interaction.
- **Assert:** Verify the outcome or state changes.

### Mocks vs. Stubs
Strictly divide test doubles into mocks and stubs:
- **Stubs:** Provide predefined responses (e.g., overriding a fetch call to return static data). **Multiple stubs are allowed per test.**
- **Mocks:** Assert that a specific interaction occurred (e.g., verifying a spy was called). **Only 1 mock per test is allowed** to ensure tests remain focused.

### Helper Factories
Use **helper factory functions** whenever possible to generate test data or setup states instead of inlining large objects repeatedly.

### Asynchronous Testing
> TODO: Address how to do testing for asynchronous code.

### Balancing Test Levels
Use isolated unit tests for edge cases and API integration tests for route, storage, and media behavior. Manually exercise the complete browser flows listed above to check interactions and layout that the automated suite does not cover.

## Running Tests & Checks

The test suite runs against hermetic temporary database fixtures (`useTempDb` in `tests/helpers.ts`) and does not touch production data or require an active server process.

- **Run all automated tests:** `npm test`
- **Run linting:** `npm run lint`
- **Run typecheck:** `npm run typecheck`
- **Full pre-commit check (lint + typecheck + test):** `npm run check`

### Pre-commit Hook & CI/CD
- **Pre-commit hook:** Managed via `simple-git-hooks` configured in `ever-since/package.json`. It runs `npm run lint && npm test` automatically on `git commit`. (Bypass for emergencies: `git commit --no-verify`).
- **CI/CD:** GitHub Actions workflow in `.github/workflows/ci.yml` runs `npm ci`, `npm run lint`, `npm run typecheck`, `npm test`, and `npm run build` on every push and pull request.
