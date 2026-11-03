# Better Auth Email/Password Implementation Plan

## Goal

Add working email/password authentication, protect code execution, allow only administrators to create questions, and record each question's creator.

## 1. Add the application database

Files:

- Create `infra/app-db/docker-compose.yml`.
- Update root `package.json`.
- Update `apps/api/.env.example`.
- Update `README.md`.

Changes:

- Run a dedicated PostgreSQL 16 service for application data on an unused host port.
- Add root scripts to start and stop the application database.
- Point `DATABASE_URL` at that service.
- Document that Judge0's database remains separate.

Verification:

- Start the database and confirm PostgreSQL is healthy.

## 2. Install and configure Better Auth

Files:

- Update `apps/api/package.json` and `pnpm-lock.yaml`.
- Update `apps/web/package.json` and `pnpm-lock.yaml`.
- Create `apps/api/src/prisma.ts`.
- Create `apps/api/src/auth.ts`.
- Update `apps/api/.env.example`.

Changes:

- Install `better-auth` in the API and web apps.
- Install Better Auth's Prisma adapter in the API.
- Reuse one Prisma client configured with the existing PostgreSQL driver adapter.
- Configure email/password authentication.
- Add the server-owned `role` field with default `user` and `input: false`.
- Configure the API base URL, strong secret, and the web origin allowlist.

Verification:

- Type-check both workspaces.
- Confirm the Better Auth configuration loads with development environment values.

## 3. Extend the Prisma schema and migrate

Files:

- Update `apps/api/prisma/schema.prisma`.
- Create the generated migration under `apps/api/prisma/migrations/`.
- Regenerate `apps/api/src/generated/prisma/` locally.

Changes:

- Generate Better Auth's `User`, `Session`, `Account`, and `Verification` models with its CLI.
- Preserve the existing `Question` and `TestCase` models.
- Add `role` and the created-question relation to `User`.
- Add `createdById`, `createdAt`, and `updatedAt` to `Question`.
- Restrict deletion of users who own questions.
- Create and apply one Prisma migration to the application database.

Verification:

- Run Prisma formatting and validation.
- Generate Prisma Client.
- Inspect the migration to ensure it only creates the expected application/authentication tables and constraints.

## 4. Mount authentication and protect execution

Files:

- Update `apps/api/src/index.ts`.
- Update `apps/api/src/index.test.ts`.

Changes:

- Enable credentialed CORS only for `WEB_ORIGIN`.
- Mount Better Auth at `/api/auth/*splat` before `express.json()` for Express 5.
- Resolve the Better Auth session from request headers in `POST /execute`.
- Return HTTP 401 before validation or Judge0 access when no session exists.

Tests:

- Keep `GET /health` public.
- Assert unauthenticated execution returns 401.
- Assert an authenticated request reaches the existing execution input validation.
- Assert Judge0 is not called for unauthenticated requests.

## 5. Add administrator promotion and question creation

Files:

- Create `apps/api/src/promote-admin.ts`.
- Update `apps/api/package.json`.
- Update `apps/api/src/index.ts`.
- Update `apps/api/src/index.test.ts`.
- Update `apps/api/README.md`.

Changes:

- Add `pnpm admin:promote -- <email>` to promote an existing account.
- Reject missing, malformed, and unknown email addresses.
- Add administrator-only `POST /questions`.
- Validate the question fields and test cases at the API boundary.
- Ignore any client-provided role or creator ID.
- Create the question and test cases together, using the session user ID as `createdById`.

Tests:

- Assert ordinary users receive 403.
- Assert administrators can create a question.
- Assert the stored creator ID matches the administrator's session user ID.
- Assert invalid question input returns 400 without a partial database write.

## 6. Add the browser authentication UI

Files:

- Create `apps/web/app/auth-client.ts`.
- Update `apps/web/app/page.tsx`.
- Update `apps/web/app/globals.css` only as needed for the new controls.
- Update `apps/web/.env.local.example`.

Changes:

- Create the Better Auth React client using `NEXT_PUBLIC_API_URL`.
- Add minimal sign-up and sign-in forms.
- Show the signed-in user's name and email.
- Add sign-out.
- Include credentials on `/execute` requests.
- Disable code execution while signed out and explain why.
- Surface authentication errors without exposing server internals.

Verification:

- Type-check and build the web app.
- Manually sign up, refresh, execute code, and sign out.

## 7. Final verification

Commands and checks:

- Run Prisma validation and generation.
- Run API tests and type-checking.
- Run web type-checking and build.
- Start the app database, Judge0, API, and web app.
- Verify sign-up, sign-in, persistent session, protected execution, admin promotion, administrator question creation, creator tracking, and sign-out.
- Confirm no real secret, password, or session token is committed.

## Explicitly skipped

- Email verification and password reset.
- OAuth and magic links.
- Admin user-management UI.
- Roles other than `user` and `admin`.
- Rate limiting and submission quotas.
- Editing or deleting questions.

