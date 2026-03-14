# ArchiveDesk Local Run Modes

## Development mode

Use this mode for day-to-day development only.

Backend:

```bash
npm run dev
```

Frontend:

```bash
npm --prefix frontend run dev
```

Development entry points:

- frontend: `http://localhost:5173`
- backend API: `http://localhost:3000`

Notes:

- Vite `/api` proxy exists only for development.
- Do not use this mode as the final pre-package acceptance path.

## Local release-like mode

Use this mode for pre-package acceptance.

```bash
npm run start:release-like
```

Windows launcher:

```bat
start-dev.bat
```

This command will:

1. delete `dist`
2. delete `frontend/dist`
3. build the backend
4. build the frontend
5. start `dist/src/server.js` with `NODE_ENV=production`
6. let the backend serve `frontend/dist`

Acceptance entry:

- app: `http://localhost:3000`

`start-dev.bat` now runs this release-like flow in the current console window and auto-opens `http://localhost:3000` after a short delay.

Expected behavior:

- browser only opens `http://localhost:3000`
- frontend routes refresh without `404`
- frontend API calls use same-origin `/api/*`
- behavior should stay close to the final ZIP package
