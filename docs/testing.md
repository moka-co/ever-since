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
**Recommended Tool:** Vitest
**Scope:**
- **Storage Layer (`lib/storage/`):** Ensure the flat JSON database (`db.json`) reads and writes correctly. Verify that the write queue (`queue.ts`) successfully serializes concurrent writes to avoid data corruption.
- **Data Validation:** Validate that Zod schemas correctly catch invalid data payloads on API endpoints and during disk writes.
- **API Logic:** Test Next.js API endpoints, specifically the rate-limiting logic on `/api/auth/login` and the 20-file quota limit on `/api/media`.

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

## Running Tests
*(Once configured)*
- **Unit Tests:** `npm run test` (runs Vitest)
- **E2E Tests:** `npm run test:e2e` (runs Playwright against a local build)
