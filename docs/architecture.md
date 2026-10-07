## Architecture
**Overview**:
- Single Next.Js App
- `data/` contains the database
- `lib/storage/` contains the schema and DB client
- `media/` refers to the local filesystem
- Docker: standard DOCKERFILE with multi-stage build (deps -> build -> runtime) and two volumes on `data/` and `media/`. A stdout captured by docker logs any errors.

### Repository Map
```
ever-since/
├── .github/
│   └── workflows/
│       └── ci.yml
├── .dockerignore
├── .gitignore
├── AGENTS.MD
├── Dockerfile
├── LICENSE
├── README.md
├── docs/
│   ├── architecture.md
│   ├── design.md
│   ├── init.md
│   ├── requirements.md
│   └── testing.md
└── ever-since/                # Next.js Application
    ├── .gitignore
    ├── eslint.config.mjs
    ├── next.config.ts
    ├── package.json
    ├── postcss.config.mjs
    ├── tsconfig.json
    ├── proxy.ts
    ├── app/
    │   ├── api/
    │   │   ├── auth/
    │   │   │   ├── login/route.ts
    │   │   │   └── logout/route.ts
    │   │   ├── config/route.ts
    │   │   ├── media/
    │   │   │   ├── [id]/route.ts
    │   │   │   └── route.ts
    │   │   └── memories/
    │   │       ├── [id]/route.ts
    │   │       ├── reorder/route.ts
    │   │       └── route.ts
    │   ├── customize/
    │   │   ├── alert.tsx
    │   │   ├── config-form.tsx
    │   │   ├── media-manager.tsx
    │   │   ├── memories-manager.tsx
    │   │   └── page.tsx
    │   ├── login/
    │   │   ├── login-form.tsx
    │   │   └── page.tsx
    │   ├── logout/
    │   │   └── page.tsx
    │   ├── favicon.ico
    │   ├── globals.css
    │   ├── layout.tsx
    │   ├── page.tsx
    │   └── timeline-client.tsx
    ├── lib/
    │   ├── api.ts
    │   ├── auth/
    │   │   └── session.ts
    │   ├── media/
    │   │   ├── processor.ts
    │   │   └── validation.ts
    │   └── storage/
    │       ├── db.ts
    │       └── schema.ts
    ├── scripts/
    │   └── init-secret.mjs
    └── tests/
        ├── helpers.ts
        ├── db.test.ts
        ├── media.test.ts
        ├── memories_and_config.test.ts
        └── proxy.test.ts
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
- **Authentication, Security & Logging**:
  - `iron-session`: Encrypted, stateless cookie-based session handling.
  - `pino`: for logging.
- **Styling & Animation**:
  - `Tailwind CSS` & `@tailwindcss/postcss`: Utility-first CSS styling framework.
  - `Framer Motion`: Animation library for swipe gestures, card slides, and interactive spring physics.
- **Code Quality & Linting**:
  - `ESLint` (`eslint-config-next`): Next.js linting rules.
  - `simple-git-hooks`: Lightweight pre-commit git hook manager.

**UI Components & Architecture**:
- **Shared Alert Component (`app/customize/alert.tsx`)**: Reusable client component providing consistent success and error notifications across `/customize` modules (`ConfigForm`, `MediaManager`, `MemoriesManager`). Consolidates alert styling, accessibility roles (`role="alert"`, `role="status"`), and dismiss handling into a single component.

**Storage Layer**:
- `lib/storage/`
    - `schema.ts` -> contains the Zod schema for the database (`db.json`)
    - `db.ts` -> exports `readDb()` and `updateDb()`. Overridable via `DB_PATH` in tests. Assuming single user single writer.

**Logging**:
- Logs are saved to `eversince.logs`, and logs are always written asynchronous. Logs are in JSON.
- Logging is made ONLY in the backend. Frontend components aren't allowed to log anything with pino, however they can normally log with console.log

The following info are logged:
- Initial token genereted in `scripts/init-secret.mjs` only in backend logs, they are not sent to file.
- Every login attempt is logged
- Every API call is logged, including IP address of the user
- Every write to database through `storage/db.ts` and to media through `processor.ts` and `validation.ts`

Tests are NOT logged, the normal console.log that writes to stdout is enough.

### Containerization & Dockerfile

The containerization strategy for EverSince centers around a clean, multi-stage Dockerfile structured across deps, build, and runtime phases to deliver a minimal, secure, and production-ready image. In the initial dependency stage (deps), an Alpine-based Node.js runtime installs essential operating system libraries, including libc6-compat, which ensures native compatibility with Sharp's image processing binaries, followed by a clean install of all project dependencies via npm ci. The intermediate build stage then compiles the Next.js application in production mode with telemetry disabled, isolating the build toolchain and temporary compilation artifacts away from the eventual distribution layer.

The final runtime stage builds upon a lean node:20-alpine environment and drops elevated root privileges by creating a dedicated unprivileged user and group (nextjs:nodejs). Only the minimal distribution assets—the compiled .next output, production dependencies, public assets, and runtime scripts—are copied into the working directory, keeping the overall attack surface and image footprint small. The container exposes port 3000 and is configured to bind to all network interfaces (0.0.0.0), allowing reverse proxies or local port forwarding to route external traffic smoothly into the Next.js web application.

State persistence is decoupled from the ephemeral container lifecycle through two explicit volume mount points mapped to /app/data and /app/media. The data/ volume preserves the primary JSON database (db.json) across redeployments, while the media/ volume retains all uploaded photo and video binaries so that media storage remains persistent despite container restarts or image upgrades. File ownership and directory permissions across both mount points are assigned to the unprivileged nextjs user during image generation, ensuring seamless write operations by the background serialization queue without requiring root execution.

Container lifecycle management and startup security are orchestrated through the project's startup script (scripts/init-secret.mjs), executed directly on boot via tsx. Upon container launch, this script dynamically issues a fresh, cryptographically strong 20-character secret, prints it immediately to standard output for capture by Docker logs, updates the internal database schema (`data/db.json`), and launches Next.js in production mode (next start). When Docker sends termination signals such as SIGTERM or SIGINT, the process intercepts the event and wipes the active secret from disk, cleanly invalidating all outstanding user sessions upon container shutdown as required by the security model.

### App startup
1. The App backend is start up e.g. with docker
2. The 20-char secret is issued and shown in the startup log line
3. The 20-char secret is saved in `data/db.json`. Yes, it is cleared on restart/shutdown but this is expected behavior.

### Authentication flow
1. `/login` posts password
2. API route compares against stored 20-char secret using constant-time comparison
3. Proxy (`proxy.ts`) checks the session on every request: unauthenticated requests to `/` and `/customize/*` are redirected to `/login`; unauthenticated requests to protected API routes return HTTP 401 with `{ error: 'not authenticated' }` (`/api/auth/login` and `/api/auth/logout` remain public)

Session TTL: 72 hours from login, checked server-side, but only for the lifetime of the running process. If you stop the container or the app, the secret is invalidated and everyone is logged out.

The 20-char secret lives in `data/db.json`. The `iron-session` encryption key is derived via SHA-256 hash from the startup secret.

Since auth is cookie-based, a requirement is `SameSite` (Lax) for the session cookie.

### Media Pipeline
1. Admin user uploads via `/customize` a multipart file to `/api/media`
2. Security checks: file type (whitelisted extension), size. Resize to a max dimension (2048px), strip EXIF
3. write to `media/` on local disk, record metadata (id, filename, dimensions) in `db.json` - rename using id, id choice is simple +1
4. Serve via `/api/media/[id]`

Hard constraints: 
- 20 media files, no new upload allowed without deleting some files first.
- Max upload size 10MB for photos, 50MB for videos

Media upload and write failures silently fail for the base user (partner) and are logged server-side. For the admin user in `/customize`, the API returns an error response with details to power an inline error and retry affordance.

### Buttons - fixed registry of buttons
A fixed component registry under `lib/buttons/`. The key file is `registry.tsx` which map from e.g. ButtonSchema type to a React Component.
Then, `/customize` renders a dropdown of registered types; selecting one renders a form built from that button's Zod shape (`react-hook-form` + `@hookform/resolvers/zod` keeps this mechanical).

### Data lifecycle
Data is managed on local file system, deleting the photos would be the best thing to do whenever hosting on for example cloud, but for the suggested infrastructure for this project it is better to not annoy the user by deleting the volume i.e. the folder with the photos.

Assumptions: 
- you don't point directly your entire album in the media folder and you already have other backup solutions.
- The app is single user, i'm assuming there is only a single writer at each time, so concurrent writing to db is not implemented.

Backup of `db.json` is out of scope given the short lifespan of the app.

### API Specification

| Method | Endpoint | Access | Purpose |
|---|---|---|---|
| `POST` | `/api/auth/login` | Public | Authenticate with 20-char secret & set session cookie |
| `POST` | `/api/auth/logout` | Public | Clear session cookie |
| `GET` | `/api/config` | Authenticated | Fetch anniversary date & story settings |
| `PUT` | `/api/config` | Authenticated | Update anniversary date |
| `GET` | `/api/memories` | Authenticated | Fetch ordered memories for timeline |
| `POST` | `/api/memories` | Authenticated | Add a new memory item |
| `PUT` | `/api/memories/[id]` | Authenticated | Update an existing memory |
| `DELETE` | `/api/memories/[id]` | Authenticated | Delete a memory item |
| `PUT` | `/api/memories/reorder` | Authenticated | Reorder memories after drag & drop |
| `GET` | `/api/media` | Authenticated | List media & inspect 20-file quota |
| `POST` | `/api/media` | Authenticated | Upload photo/video (max 10MB/50MB, Sharp processed) |
| `DELETE` | `/api/media/[id]` | Authenticated | Delete media file and reclaim quota |
| `GET` | `/api/media/[id]` | Authenticated | Serve media binary directly from disk |
