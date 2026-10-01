## Architecture
**Overview**:
- Single Next.Js App
- `data/` contains the database
- `lib/auth/storage` containt the schema
- `media/` refers to the local filesystem
- Docker: standard DOCKERFILE with multi-stage build (deps -> build -> runtime) and two volumes on `data/` and `media/`. A stdout captured by docker logs any errors.

### Repository Map
```
ever-since/
├── .env
├── .gitignore
├── AGENTS.MD
├── LICENSE
├── README.md
├── docs/
│   ├── architecture.md
│   ├── design.md
│   ├── init.md
│   └── requirements.md
├── tests/
└── ever-since/                # Next.js Application
    ├── .gitignore
    ├── eslint.config.mjs
    ├── next.config.ts
    ├── next-env.d.ts
    ├── package.json
    ├── postcss.config.mjs
    ├── README.md
    ├── tsconfig.json
    ├── proxy.ts
    ├── app/
    │   ├── api/
    │   │   ├── auth/
    │   │   │   ├── login/route.ts
    │   │   │   ├── logout/route.ts
    │   │   │   └── session/route.ts
    │   │   ├── config/route.ts
    │   │   ├── media/
    │   │   │   ├── [id]/route.ts
    │   │   │   └── route.ts
    │   │   └── memories/
    │   │       ├── [id]/route.ts
    │   │       ├── reorder/route.ts
    │   │       └── route.ts
    │   ├── favicon.ico
    │   ├── globals.css
    │   ├── layout.tsx
    │   └── page.tsx
    ├── lib/
    │   └── storage/
    │       └── schema.ts
```

**Tools and Libraries**
- **Runtime & Execution**:
  - `tsx`: TypeScript execution engine used to run TypeScript and ESM scripts (e.g., `scripts/init-secret.mjs`) directly without pre-compilation across Node environments.
  - `Next.js`: Fullstack framework powering App Router, Server/Client Components, and API routes.
  - `React` & `React DOM`: Declarative UI component library.
  - `TypeScript`: Static type checking across the entire application.
- **Validation & Storage**:
  - `Zod`: Schema declaration, validation, and type inference for the JSON database, configurations, and API inputs.
  - `server-only`: Build-time guard preventing server-side code from leaking into client-side bundles.
- **Authentication & Security**:
  - `iron-session`: Encrypted, stateless cookie-based session handling.
- **Styling & Animation**:
  - `Tailwind CSS` & `@tailwindcss/postcss`: Utility-first CSS styling framework.
  - `Framer Motion`: Animation library for swipe gestures, card slides, and interactive spring physics.
- **Code Quality & Linting**:
  - `ESLint` (`eslint-config-next`): Next.js linting rules.
  - `Oxlint`: Fast linter for scanning code.

**Storage Layer**:
- `lib/`
    - `schema.ts` -> contains the schema for the database
    - `storage/queue.ts` -> serializes writes

### App startup
1. The App backend is start up e.g. with docker
2. The 20-char secret is issued and shown in the startup log line
3. The 20-char secret is savend in `.env` in the same root folder of where the app is started. Yes, it is lost on restart but this is expected behavior.


### Authentication flow
1. `/login` posts password
2. API route compares against env-stored 20-char secret (additional requirements: constant time compare)
3. Proxy (`proxy.ts`, formerly `middleware.ts` per Next.js 16+ convention) checks the session on every request: unauthenticated requests to `/` and `/customize/*` are redirected to `/login`; unauthenticated requests to protected API routes return HTTP 401 with `{ error: 'not authenticated' }` (`/api/auth/login`, `/api/auth/session`, and `/api/auth/logout` remain public)

Session TTL:72 hours from login, checked server-side, but only for the lifetime of the running process. If you stop the container or the app, the session get invalidated and everyone is logged out.

Rate limiting & lockout on `/login`:
- Rate limiting tracks failed attempts per IP and session (max 5 retries).
- On 401 (failed attempt < 5), API returns remaining attempts count (`attemptsLeft`) to drive escalating playful UI feedback.
- On 5th failed attempt, API enters lockout state and returns HTTP 429 with `retryAfter` (cooldown duration in seconds), triggering the frontend lockout screen with active real-time countdown. Subsequent requests during cooldown are rejected with HTTP 429 until the timer expires.

The 20-char secret live in a .env file that is generated (or updated) on backend startup. Each time a new one is generated so the old one become useless, no need to delete it. The `iron-session` encryption key is the same secret that regenerates on startup.

Since auth is cookie-based, a requirement is `SameSite` (Lax) for the session cookie.

### Media Pipeline
1. Admin user uploads via `/customize/photos` a multipart file to `/api/photos`
2. Security checks: file type, size. Resize to a max dimension, strip EXIF
3. write to `media/` on local disk, record metadata (id, filename, dimensions) in `db.json` - rename using id, id choice is simple +1
4. Serve via `/api/media/filename.format`

Hard constraints: 
- 20 media files, no new upload allowed without deleting some files first.
- Max upload size 10MB

Media upload and write failures silently fail for the base user (partner) and are logged server-side. For the admin user in `/customize`, the API returns an error response with details to power an inline error and retry affordance.


### Buttons - fixed registry of buttons
A fixed component registry under `lib/buttons/`. The key file is `registry.tsx` which map from e.g. ButtonSchema type to a React Component.
Then, `/customize` renders a dropdown of registered types; selecting one renders a form built from that button's Zod shape (`react-hook-form` + `@hookform/resolvers/zod` keeps this mechanical).

### Data lifecycle
Data is managed on local file system, deleting the photos would be the best thing to do whenever hosting on for example cloud, but for the suggested infrastructure for this project it is better to not annoy the user by deleting the volume i.e. the folder with the photos.

Assumptions: you don't point directly your entire album in the media folder and you already have other backup solutions.

Backup of `db.json` is out of scope given the short lifespan of the app.

### API Specification

| Method | Endpoint | Access | Purpose |
|---|---|---|---|
| `POST` | `/api/auth/login` | Public (Rate-limited) | Authenticate with 20-char secret & set session cookie |
| `POST` | `/api/auth/logout` | Public | Clear session cookie |
| `GET` | `/api/auth/session` | Public | Inspect session state & lockout countdown |
| `GET` | `/api/config` | Authenticated | Fetch anniversary date & story settings |
| `PUT` | `/api/config` | Authenticated | Update anniversary date |
| `GET` | `/api/memories` | Authenticated | Fetch ordered memories for timeline |
| `POST` | `/api/memories` | Authenticated | Add a new memory item |
| `PUT` | `/api/memories/[id]` | Authenticated | Update an existing memory |
| `DELETE` | `/api/memories/[id]` | Authenticated | Delete a memory item |
| `PUT` | `/api/memories/reorder` | Authenticated | Reorder memories after drag & drop |
| `GET` | `/api/media` | Authenticated | List media & inspect 20-file quota |
| `POST` | `/api/media` | Authenticated | Upload photo/video (max 10MB, Sharp processed) |
| `DELETE` | `/api/media/[id]` | Authenticated | Delete media file and reclaim quota |
| `GET` | `/api/media/[filename]` | Authenticated | Serve media binary directly from disk |


