# API

Express and TypeScript service that owns authentication, question writes, and the browser-facing Judge0 execution boundary.

## Setup

```sh
cp .env.example .env
pnpm prisma:migrate
pnpm dev
```

Replace `BETTER_AUTH_SECRET` with the output of `openssl rand -base64 32`.

## Endpoints

- `GET /health` returns `{ "status": "ok" }`.
- `/api/auth/*` provides Better Auth email/password sign-up, sign-in, session, and sign-out endpoints.
- `POST /execute` requires a session, accepts Judge0's `source_code`, `language_id`, and optional `stdin`, then forwards them to Judge0.
- `POST /questions` requires an administrator and creates a question with its test cases and authenticated creator ID.

## Promote an administrator

Sign up normally, then run this server-side command:

```sh
pnpm admin:promote -- admin@example.com
```

Roles cannot be supplied through sign-up or browser requests.
