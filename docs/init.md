# Initialization and Setup

## Prerequisites
- Node.js 22 and npm
- Docker (optional, for production deployment)

## Local Development Setup

Run the following commands from the repository root. The Next.js package is in the nested `ever-since/` directory.

The project was initially scaffolded using the following command:
```bash
npx create-next-app@latest ever-since --typescript --tailwind --eslint --app --src-dir=false --import-alias="@/*" --use-npm --yes
```

1. **Install dependencies**
   ```bash
   cd ever-since
   npm ci
   ```

2. **Run the development server**
   ```bash
   npm run dev
   ```

3. **Open the application**
   Navigate to [http://localhost:3000](http://localhost:3000) in your browser.

## Startup Secret
On backend startup, a 20-character secret is generated and saved directly in `data/db.json`. This secret is used for authentication and cookie encryption (via `iron-session`). Note that on each restart or termination, the secret is invalidated, logging out all active sessions. This is expected behavior.

## Docker Setup (Production)
The application is designed to be run using Docker with a multi-stage build (`deps` -> `build` -> `runtime`). 
It requires three persistent volumes to be mounted:
- `data/` for the JSON database (`db.json`) and IP ban list (`banned_ip.log`)
- `media/` for user-uploaded photos and videos
- `logs/` for application logs (`eversince.logs`)

### Build Image
```bash
# From the repository root, where Dockerfile is located
docker build -t ever-since .
```

### Run Container
```bash
# From the repository root
docker run -d \
  -p 3000:3000 \
  -v "$(pwd)/ever-since/data:/app/data" \
  -v "$(pwd)/ever-since/media:/app/media" \
  -v ever-since-logs:/app/logs \
  --name ever-since-app \
  ever-since
```

### Inspect Startup Secret & Logs
The 20-character startup secret is emitted to stdout on launch and captured by Docker logs:
```bash
docker logs ever-since-app
```

