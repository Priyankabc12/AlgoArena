# Web

Next.js client for entering code and displaying the result returned by the API.

Copy `.env.local.example` to `.env.local` only when the API is not at `http://localhost:4000`.

The home page provides email/password sign-up, sign-in, session display, sign-out, and authenticated code execution. The browser sends the Better Auth session cookie to the API at `NEXT_PUBLIC_API_URL`.

The default language ID is `71` (Python 3 in Judge0 CE). Consult the local Judge0 `/languages` endpoint for other IDs.
