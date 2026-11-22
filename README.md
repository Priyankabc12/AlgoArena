<div align="center">

# AlgoArena

**Practice coding problems, test Python solutions, and submit them for judging.**

![Next.js](https://img.shields.io/badge/Next.js-16-171717?style=flat-square&logo=nextdotjs)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?style=flat-square&logo=postgresql&logoColor=white)
![Judge0](https://img.shields.io/badge/Judge0-1.13.1-6D28D9?style=flat-square)

[Local setup](#local-setup) · [Try it out](#try-it-out) · [API](#api) · [Development](#development)

</div>

## What you can do

- **Browse problems** by title, difficulty, or topic, and open a Python workspace with a Monaco editor and sample cases.
- **Run code with custom input** from the home page. Sign in with email and password, choose a Judge0 language ID, and inspect the execution result.
- **Judge Python solutions through the API.** Run sample cases for quick feedback, submit against all cases, and retrieve your saved submissions. The API redacts hidden case inputs and outputs.
- **Manage questions through the admin API.** Set difficulty, tags, time and memory limits, and sample and hidden test cases.

> [!NOTE]
> The browser catalog uses bundled examples, and its **Run** and **Submit** buttons display demo results. Use the execution API to judge solutions against questions stored in PostgreSQL.

## Local setup

You’ll need Node.js 22.12 or newer on the 22.x line, pnpm 12.18.0, Docker with Compose, and OpenSSL.

```sh
git clone https://github.com/Priyankabc12/AlgoArena.git
cd AlgoArena
pnpm install
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.local.example apps/web/.env.local
openssl rand -base64 32
```

Set `BETTER_AUTH_SECRET` in `apps/api/.env` to the generated value, then start the services.

```sh
pnpm db:up
pnpm --filter @practice/api prisma:migrate
pnpm judge0:up
pnpm dev
```

| Service | Local address |
| --- | --- |
| Web app | [localhost:3000](http://localhost:3000) |
| Express API | [localhost:4000/health](http://localhost:4000/health) |
| Judge0 | `http://localhost:2358` |
| Application PostgreSQL | `localhost:5434` |

## Try it out

1. Open the [home page](http://localhost:3000), create an account, and click **Run** with the default Python code to execute it through Judge0.
2. Visit the [question catalog](http://localhost:3000/questions) and open **Sum of Two Numbers** to explore the editor and sample cases.
3. To judge a submission through the API, promote your local account, sign in again, and create a database-backed question through `POST /api/admin/questions`. Include at least one sample and one hidden case. Send the question’s slug and your Python source as `questionSlug` and `sourceCode` to the run or submit endpoint.

```sh
pnpm --filter @practice/api admin:promote -- admin@example.com
```

Use the email you signed up with. Protected endpoints use the Better Auth session cookie.

## API

| Endpoint | What it does | Access |
| --- | --- | --- |
| `GET /api/questions` | Search and filter database-backed questions | Public |
| `GET /api/questions/:slug` | Read a question and its sample cases | Public |
| `POST /api/executions/run` | Judge Python against sample cases | Signed in |
| `POST /api/executions/submit` | Judge Python against all cases and save the result | Signed in |
| `GET /api/submissions` · `GET /api/submissions/:id` | Read your submission history and results | Signed in |
| `POST /api/admin/questions` · `PATCH /api/admin/questions/:slug` | Create and update questions | Admin |

See the [API README](apps/api/README.md) for authentication and the standalone code runner. The [question schema](apps/api/src/validation/questions.ts) defines the admin request fields.

## Development

| Directory | Responsibility |
| --- | --- |
| [`apps/web`](apps/web) | Next.js client, Monaco editor, and Better Auth client |
| [`apps/api`](apps/api) | Express API, Better Auth, Prisma, and Judge0 integration |
| [`infra/app-db`](infra/app-db) | PostgreSQL for accounts, questions, and submissions |
| [`infra/judge0-v1.13.1`](infra/judge0-v1.13.1) | Judge0 server and workers with their own PostgreSQL and Redis |

```sh
pnpm typecheck
pnpm --filter @practice/api test
pnpm build
```

Stop the local services with `pnpm judge0:down` and `pnpm db:down`.
