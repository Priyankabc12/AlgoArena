# API

Express and TypeScript service that owns authentication, question writes, and the browser-facing Judge0 execution boundary.

## Setup

```sh
cp .env.example .env
pnpm prisma:migrate
pnpm dev
```

Replace `BETTER_AUTH_SECRET` with the output of `openssl rand -base64 32`.

## Seed profile test data

From the repository root, run this against your migrated local database:

```sh
pnpm db:seed
```

All 12 fixture accounts use the local password `ProfileSeed123!`.

| Email | Seeded activity |
| --- | --- |
| `profile-active@example.test` | 61 submissions across 12 problems |
| `profile-empty@example.test` | Zero submissions |
| `learner-01@example.test` through `learner-10@example.test` | 24–40 submissions each |

The seed includes 381 submissions across 12 problems, with easy, medium, and hard questions, sample and hidden cases, and several verdicts.

Rerunning the seed preserves existing fixture rows and profile edits. The seed uses PostgreSQL and runs without Judge0.

## Browse the local database

With PostgreSQL running, run `pnpm db:studio` from the repository root. Prisma Studio opens in your browser and uses the API's `DATABASE_URL`.

## Endpoints

- `GET /health` returns `{ "status": "ok" }`.
- `/api/auth/*` provides Better Auth email/password sign-up, sign-in, session, and sign-out endpoints.
- `POST /execute` requires a session, accepts Judge0's `source_code`, `language_id`, and optional `stdin`, then forwards them to Judge0.
- `POST /questions` requires an administrator and creates a question with its test cases and authenticated creator ID.
- `POST /api/executions/run` requires a session and runs Python against sample cases without saving a submission.
- `POST /api/executions/submit` requires a session, runs Python against all cases, saves the result, and redacts hidden-case data.
- `GET /api/submissions` and `GET /api/submissions/:id` return only the signed-in user's submission history.

## Promote an administrator

Sign up normally, then run this server-side command:

```sh
pnpm admin:promote -- admin@example.com
```

Roles cannot be supplied through sign-up or browser requests.
