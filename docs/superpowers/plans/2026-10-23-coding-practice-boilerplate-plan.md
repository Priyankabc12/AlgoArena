# Coding Practice Boilerplate Implementation Plan

## 1. Create the workspace foundation

- Add root `package.json`, `pnpm-workspace.yaml`, `.gitignore`, and `README.md`.
- Define `dev`, `build`, `typecheck`, and Judge0 Compose commands.
- Keep dependencies in the app that needs them; use no shared package.

## 2. Add the Express API

- Create `apps/api` with TypeScript, Express, and a development script.
- Implement `GET /health`.
- Implement `POST /execute`, accepting `source_code`, `language_id`, and optional `stdin`.
- Reject missing or invalid execution input with HTTP 400; forward valid input to `JUDGE0_URL/submissions?wait=true`.
- Add `apps/api/.env.example` and `apps/api/README.md`.

## 3. Add the Next.js client

- Create `apps/web` using the smallest App Router layout.
- Add one client page with source, stdin, and language ID inputs; it posts to the API and renders the result.
- Add `apps/web/.env.local.example` and `apps/web/README.md`.

## 4. Add self-hosted Judge0

- Add `infra/judge0/docker-compose.yml` with the official Judge0 CE server and worker images, Postgres, Redis, and a persistent Postgres volume.
- Add an ignored `judge0.conf` generated from `judge0.conf.example`, with non-production development credentials.
- Add `infra/judge0/README.md` with startup order and the Judge0 API URL.

## 5. Verify

- Install workspace dependencies with pnpm.
- Run API and web type checks.
- If Docker is available, start Judge0, request the API health endpoint, and execute a tiny program through the API.

## Files Created

- Root: `package.json`, `pnpm-workspace.yaml`, `.gitignore`, `README.md`
- API: `apps/api/package.json`, `apps/api/tsconfig.json`, `apps/api/src/index.ts`, `apps/api/.env.example`, `apps/api/README.md`
- Web: `apps/web/package.json`, `apps/web/tsconfig.json`, `apps/web/next.config.ts`, `apps/web/app/layout.tsx`, `apps/web/app/page.tsx`, `apps/web/app/globals.css`, `apps/web/.env.local.example`, `apps/web/README.md`
- Judge0: `infra/judge0/docker-compose.yml`, `infra/judge0/judge0.conf.example`, `infra/judge0/README.md`
