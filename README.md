# Coding Practice Platform

Minimal monorepo boilerplate for a coding-practice platform.

## Structure

- [`apps/web`](apps/web): Next.js client.
- [`apps/api`](apps/api): Express API that proxies execution requests to Judge0.
- [`infra/judge0`](infra/judge0): local Judge0, Postgres, and Redis stack.

## Run locally

```sh
pnpm install
cp infra/judge0/judge0.conf.example infra/judge0/judge0.conf
pnpm judge0:up
pnpm dev
```

Open `http://localhost:3000`. The API runs on `http://localhost:4000` and Judge0 on `http://localhost:2358`.
