## Architecture
**Overview**:
- Single Next.Js App
- `data/` contains the schema in JSON
- `media/` refers to the local filesystem
- Docker: standard DOCKERFILE with multi-stage build (deps -> build -> runtime) and two volumes on `data/` and `media/`. A stdout captured by docker logs any errors.

**Storage Layer**:
- `lib/storage`
    - db.ts -> readDb(), writeDb(updater)
    - queue.ts -> serializes writes

### App startup
1. The App backend is start up e.g. with docker
2. The 20-char secret is issued and shown in the startup log line
3. The 20-char secret is savend in `.env` in the same root folder of where the app is started. Yes, it is lost on restart but this is expected behavior.


### Authentication flow
1. `/login` posts password
2. API route compares against env-stored 20-char secret (additional requirements: constant time compare)
3. Middleware checks the session on every request to `/`, `/customize/*` and API routes and redirected to `/login` if missing/expired

Session TTL:72 hours from login, checked server-side, but only for the lifetime of the running process. If you stop the container or the app, the session get invalidated and everyone is logged out.
Basic rate limiting on `/login` per IP and session, with N maximum retries.

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

Media upload failures silently fail and are logged server-side.


### Buttons - fixed registry of buttons
A fixed component registry under `lib/buttons/`. The key file is `registry.tsx` which map from e.g. ButtonSchema type to a React Component.
Then, `/customize` renders a dropdown of registered types; selecting one renders a form built from that button's Zod shape (`react-hook-form` + `@hookform/resolvers/zod` keeps this mechanical).

### Data lifecycle
Data is managed on local file system, deleting the photos would be the best thing to do whenever hosting on for example cloud, but for the suggested infrastructure for this project it is better to not annoy the user by deleting the volume i.e. the folder with the photos.

Assumptions: you don't point directly your entire album in the media folder and you already have other backup solutions.

Backup of `db.json` is out of scope given the short lifespan of the app.

