# Better Auth Email/Password Design

## Purpose

Add email/password authentication to the coding-practice application, require a signed-in user to execute code, and identify which administrator created each question.

## Scope

The first authentication release includes:

- Email/password sign-up and sign-in.
- Cookie-based sessions, session lookup, and sign-out.
- A `user` or `admin` role stored on each user.
- Authentication for `POST /execute`.
- Administrator-only question creation that records the creator.
- A local application PostgreSQL database separate from Judge0's database.

Email verification, password reset, OAuth, roles beyond `user` and `admin`, user administration, quotas, and rate limiting are excluded.

## Architecture

The Express API owns authentication because it already owns code execution and will own question writes. Better Auth mounts at `/api/auth/*` before `express.json()` and uses the existing Prisma 7 client through Better Auth's Prisma adapter.

The Next.js client uses Better Auth's React client with the Express API as its base URL. Browser requests include credentials so the API receives the session cookie. CORS allows credentials only from the configured web origin, initially `http://localhost:3000`.

The application database runs as its own local PostgreSQL service. It does not reuse Judge0's internal PostgreSQL database, credentials, or lifecycle.

## Authentication Flow

1. A visitor signs up with name, email, and password.
2. Better Auth hashes the password, creates the user and account records, and starts a session.
3. The browser stores the Better Auth session cookie.
4. Sign-in restores a session; sign-out revokes it.
5. The page shows the current user when signed in and the sign-up/sign-in form when signed out.

The `role` user field defaults to `user`. Better Auth declares it as a server-owned additional field with `input: false`, so sign-up and profile requests cannot assign administrator access.

## Authorization

`GET /health` and `/api/auth/*` remain public.

`POST /execute` requires any valid session. Missing or invalid sessions return HTTP 401 before Judge0 is called.

`POST /questions` requires a valid session whose user role is `admin`. Missing sessions return HTTP 401; signed-in non-admin users receive HTTP 403.

The API never accepts `role` or `createdById` from browser input.

## Data Model

Better Auth's generated Prisma models provide `User`, `Session`, `Account`, and `Verification`. The generated `User` model is extended with:

- `role String @default("user")`
- A relation to questions created by that user.

`Question` gains:

- `createdById String`, referencing `User.id`.
- `createdAt DateTime @default(now())`.
- `updatedAt DateTime @updatedAt`.

Deleting an administrator is restricted while their questions exist, preserving question ownership history.

When an administrator creates a question, the API writes `createdById` from the authenticated session. Test cases are created in the same Prisma transaction through the existing `Question.testCases` relation.

## Initial Administrator

All public sign-ups create ordinary users. After the intended administrator signs up, a local server command promotes that existing account by email:

```sh
pnpm --filter @practice/api admin:promote -- admin@example.com
```

The command validates the email, fails if no matching user exists, updates only the role, and prints a short success message. There is no public endpoint for creating or promoting administrators.

## Configuration

The API requires:

- `DATABASE_URL`
- `BETTER_AUTH_SECRET`, at least 32 high-entropy characters
- `BETTER_AUTH_URL`, initially `http://localhost:4000`
- `WEB_ORIGIN`, initially `http://localhost:3000`

The web app uses `NEXT_PUBLIC_API_URL`, initially `http://localhost:4000`.

Secrets are documented in example environment files but never committed with real values.

## Error Handling

- Invalid sign-up/sign-in input uses Better Auth's response format.
- Unauthenticated protected requests return HTTP 401.
- Non-admin question creation returns HTTP 403.
- Invalid question input returns HTTP 400.
- Database or auth service failures return HTTP 500 without exposing credentials, hashes, or internal database errors.
- Judge0 failures continue to return HTTP 502.

## Verification

Automated checks cover:

- Prisma schema validation and client generation.
- Email/password sign-up, sign-in, session lookup, and sign-out against the local test database.
- `POST /execute` returns 401 without a session and reaches its existing validation only with a session.
- Ordinary users cannot create questions.
- Administrators can create a question and its stored `createdById` matches the session user.
- Existing API and web TypeScript checks still pass.

Manual verification confirms the browser can sign up, stay signed in across a refresh, execute code, and sign out.

