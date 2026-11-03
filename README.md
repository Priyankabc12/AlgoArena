# Coding Practice Platform

Minimal monorepo boilerplate for a coding-practice platform.

## Structure

- [`apps/web`](apps/web): Next.js client.
- [`apps/api`](apps/api): Express API that proxies execution requests to Judge0.
- [`infra/app-db`](infra/app-db): application PostgreSQL database.
- [`infra/judge0-v1.13.1`](infra/judge0-v1.13.1): local Judge0, Postgres, and Redis stack.

## Run locally

```sh
pnpm install
cp apps/api/.env.example apps/api/.env
pnpm db:up
pnpm --filter @practice/api prisma:migrate
pnpm judge0:up
pnpm dev
```

Replace `BETTER_AUTH_SECRET` in `apps/api/.env` with the output of `openssl rand -base64 32` before starting the API.

Open `http://localhost:3000`. The API runs on `http://localhost:4000`, the application database on port `5434`, and Judge0 on `http://localhost:2358`.
