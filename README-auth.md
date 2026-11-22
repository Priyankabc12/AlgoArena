# Algo Arena authentication setup

The app uses its existing Better Auth and Prisma session/account tables. Google sign-in is optional; email and password continue to work when Google credentials are absent. No Passport or second session store is introduced.

## Local setup

1. Copy `apps/api/.env.example` to `apps/api/.env` and `apps/web/.env.local.example` to `apps/web/.env.local`.
2. Start PostgreSQL with `pnpm db:up` from the repository root. The database is exposed at `localhost:5434` for the API's example `DATABASE_URL`.
3. Run `pnpm --filter @practice/api prisma:migrate` once, then `pnpm dev` from the root. Judge0 is needed only for code execution; start it with `pnpm judge0:up` when required.
4. For Google sign-in, create a Google OAuth client in Google Cloud Console. Add `http://localhost:3000` under **Authorized JavaScript origins**.
5. Add the exact value of `GOOGLE_CALLBACK_URL` from the API environment under **Authorized redirect URIs**. The example value is `http://localhost:4000/api/auth/callback/google`; it must match character for character, including scheme, host, port, and path.
6. Set `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` in `apps/api/.env`, set `GOOGLE_CALLBACK_URL` to the registered URI, and set `NEXT_PUBLIC_GOOGLE_OAUTH_ENABLED=true` in `apps/web/.env.local`. Restart both services after changing environment values.

Google OAuth uses Better Auth's popup plugin. It keeps the main page in place, verifies the popup message origin, and refreshes the session in the existing client. If the popup is blocked, allow popups for the app and retry. The ordinary email flow uses client requests and also stays on the current page.

## Sign-in checks

- Visit `/signin` or `/signup`, submit valid email/password details, and confirm the navbar updates without a reload or dashboard navigation.
- Try invalid credentials and confirm the inline error appears while the page remains in place.
- With Google configured, use **Continue with Google**, choose an account, and confirm the popup closes and the navbar updates in place.
- Sign out and confirm the session clears. Authenticated users can run code from the workspace on `/`.

The API emits a startup warning and leaves Google unavailable when either Google credential is missing. Keep secrets only in local environment files; do not commit them.
