# Initialization and Setup

## Prerequisites
- Node.js (v18 or higher recommended)
- npm or yarn
- Docker (optional, for production deployment)

## Local Development Setup

The project was initially scaffolded using the following command:
```bash
npx create-next-app@latest ever-since --typescript --tailwind --eslint --app --src-dir=false --import-alias="@/*" --use-npm --yes
```

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Run the development server**
   ```bash
   npm run dev
   ```

3. **Open the application**
   Navigate to [http://localhost:3000](http://localhost:3000) in your browser.

## Environment Variables
On backend startup, a 20-character secret is generated and saved in a `.env` file in the root directory. This secret is used for authentication and cookie encryption (via `iron-session`). Note that on each restart, a new secret is generated and the old one is invalidated, logging out all active sessions. This is expected behavior.

## Docker Setup (Production)
The application is designed to be run using Docker with a multi-stage build (`deps` -> `build` -> `runtime`). 
It requires two volumes to be mounted:
- `data/` for the JSON database (`db.json`)
- `media/` for user-uploaded photos and videos

### Build Image
```bash
# From repository root
docker build -t ever-since .

# Or from ever-since directory
cd ever-since
docker build -t ever-since .
```

### Run Container
```bash
docker run -d \
  -p 3000:3000 \
  -v $(pwd)/data:/app/data \
  -v $(pwd)/media:/app/media \
  --name ever-since-app \
  ever-since
```

### Inspect Startup Secret & Logs
The 20-character startup secret is emitted to stdout on launch and captured by Docker logs:
```bash
docker logs ever-since-app
```

