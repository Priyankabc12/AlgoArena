# API

Express and TypeScript service that is the browser-facing execution boundary.

## Endpoints

- `GET /health` returns `{ "status": "ok" }`.
- `POST /execute` accepts Judge0's `source_code`, `language_id`, and optional `stdin` fields, then forwards them to Judge0.

Copy `.env.example` to `.env` to override the local Judge0 URL or API port.
