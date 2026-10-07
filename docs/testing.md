# Testing Strategy

## Overview
Given the project's nature—a temporary, highly interactive, and emotional web experience for couples—reliability, visual correctness, and smooth interactions are critical. The testing strategy prioritizes end-to-end user flows, robust data integrity for the local storage, and manual QA for playful components.

## Testing Layers

### End-to-End Testing
**Recommended Tool:** Playwright
**Scope:**
- **Authentication Flow:** Verify the login process, the 5-attempt rate limit, and the lockout countdown UI.
- **Admin Dashboard (`/customize`):** Test the desktop-only access restriction, memory creation, media upload handling, and drag-and-drop reordering.
- **Main Flow (`/`):** Simulate the base user experience, swiping/clicking through the chronological memories, and rewinding to the start.

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
- **Playful Buttons:** Manually test custom interactive components from the registry (e.g., dodging Yes/No buttons, the pixelized seal noises).
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

### Avoiding Test Level Antipatterns
To maintain a robust and maintainable test suite, balance your testing layers to avoid these two extremes:
- **Avoiding the End-to-End-Only Antipattern:** Do not rely heavily on Playwright to test every single edge case, validation error, or business logic permutation. E2E tests are slow, prone to flakiness, and expensive to maintain. Instead, reserve E2E tests for critical user journeys (e.g., successful login, adding a memory, scrolling the timeline) and push the testing of edge cases and logic combinations down to fast, isolated unit tests in Vitest.
- **Avoiding the Low-Level-Only Antipattern:** Do not rely exclusively on unit tests. While they provide fast feedback, they lack the confidence that integrated system layers work together out-of-process. Ensure you always have Playwright E2E tests covering the core flows to guarantee that the UI, API, and local JSON storage interact correctly in a real-world scenario.

## Running Tests & Checks

The test suite runs against hermetic temporary database fixtures (`useTempDb` in `tests/helpers.ts`) and does not touch production data or require an active server process.

- **Run all automated tests:** `npm test`
- **Run linting:** `npm run lint`
- **Run typecheck:** `npm run typecheck`
- **Full pre-commit check (lint + typecheck + test):** `npm run check`
- **E2E Tests:** `npm run test:e2e` (runs Playwright against a local build)

### Pre-commit Hook & CI/CD
- **Pre-commit hook:** Managed via `simple-git-hooks` configured in `ever-since/package.json`. It runs `npm run lint && npm test` automatically on `git commit`. (Bypass for emergencies: `git commit --no-verify`).
- **CI/CD:** GitHub Actions workflow in `.github/workflows/ci.yml` runs `npm ci`, `npm run lint`, `npm run typecheck`, `npm test`, and `npm run build` on every push and pull request.
