# MovieStream

MovieStream is a small movie-watching room app built with React + Vite for the frontend and Express + Socket.IO for the backend.

Quick start

1. Install deps: `npm install`
2. Run dev frontend: `npm run dev`
3. Run backend server: `npm run server`

Production

1. Build frontend: `npm run build`
2. Set env vars (example):

```powershell
$env:NODE_ENV='production'
$env:PORT=3001
$env:JWT_SECRET='a-strong-secret'
npm start
```

Notes

- The server uses `server/data/*.json` for simple persistence in development. Move to a real database for production.
- Add a `.env` file (and ignore it) to store secrets for local development.
- See `server/index.js` for CORS and static-serving behavior.

NPM production note

- The `--production` flag is deprecated in recent npm versions and prints a warning: `npm WARN config production Use "--omit=dev" instead.`
- To avoid that warning and to omit dev dependencies in production installs, prefer `npm ci --omit=dev` or add a project `.npmrc` with `omit=dev` (this repo includes one).

If you'd like, I can add Dockerfiles and a CI workflow to build and deploy this app.
