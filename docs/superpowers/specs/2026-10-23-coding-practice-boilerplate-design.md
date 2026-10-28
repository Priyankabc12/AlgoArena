# Coding Practice Boilerplate Design

## Purpose

Provide a minimal starting point for a coding-practice platform. Users can use a Next.js web client to send code to an Express API, which forwards execution requests to Judge0.

## Scope

The repository is a pnpm workspace with three components:

- `apps/web`: a Next.js TypeScript application with a single page for entering source code and running it.
- `apps/api`: an Express TypeScript service with `GET /health` and `POST /execute`. It validates required execution fields, then proxies the request to Judge0.
- `infra/judge0`: Docker Compose configuration for a local Judge0 deployment and its Postgres and Redis dependencies.

Each top-level component and the repository root has a README explaining its role and how to run it.

## Execution Flow

1. The web app posts source code, language ID, and optional stdin to the API.
2. The API passes the request to Judge0 using its configured URL.
3. The API returns Judge0's result to the web app.

Judge0 is never called from the browser, so Judge0 configuration and future access controls remain server-side.

## Configuration

- The API reads `JUDGE0_URL`, defaulting to the local Docker Judge0 endpoint.
- The web app reads `NEXT_PUBLIC_API_URL`, defaulting to the local Express API endpoint.
- Docker Compose owns Judge0 runtime configuration and persistent service wiring.

## Explicitly Excluded

This boilerplate does not include authentication, user data, a problem catalogue, test-case storage, submissions, queues, rate limits, dashboards, or deployment configuration.

## Verification

- Type-check the web and API workspaces.
- Start Judge0 through Docker Compose.
- Start the API and confirm `/health` responds.
- Use the web form or a request to confirm `/execute` reaches Judge0.
