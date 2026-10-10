# Setup

## Python dependencies

```bash
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

## Node dependencies

```bash
npm install
```

# Running

## Quick start (all services, one command)

```bash
npm run dev:all
```

This starts all three services in a single terminal:
- **nats-server** — message broker
- **pv_bridge.py** — chess engine bridge
- **vite dev** — web server

Press `Ctrl+C` to stop all services.

## Individual services

```bash
# Terminal 1 — NATS message broker
npm run dev:nats

# Terminal 2 — Python engine bridge
npm run dev:bridge

# Terminal 3 — Web server
npm run dev
```

> **Note:** `npm run dev` alone is sufficient for pages that don't use the chess engine (e.g. `/login`, `/register`, `/dashboard`). The `/testboard` page requires all three services.

## Production notes

- `npm run build && npm run prod` starts the Vike/Fastify server from `dist/server/index.mjs`.
- The `/ws/engine` WebSocket route is currently attached only in **development** by `vite-engine-plugin.ts`, because it hooks into Vite's dev HTTP server upgrade path.
- In **production**, the Fastify server does not expose `/ws/engine`, and `pv_bridge.py` / `nats-server` are not started automatically.
- If you need `/testboard` in production, move the `/ws/engine` upgrade handler and engine process management into the Fastify server layer.
