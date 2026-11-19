-- AlgoSomething application query catalog
-- Database: PostgreSQL
--
-- These are the SQL equivalents of the database operations performed by the
-- API through Prisma and Better Auth. Positional parameters ($1, $2, ...) are
-- supplied by the application. Test setup/cleanup and schema migrations are
-- intentionally excluded because they are not application queries.

-- ---------------------------------------------------------------------------
-- Authentication and sessions (managed by Better Auth)
-- ---------------------------------------------------------------------------

-- READ
-- Resolve an authenticated session and its user.
-- $1 = session token
SELECT
    s."id" AS session_id,
    s."token",
    s."expiresAt" AS expires_at,
    s."ipAddress" AS ip_address,
    s."userAgent" AS user_agent,
    u."id" AS user_id,
    u."name",
    u."email",
    u."emailVerified" AS email_verified,
    u."image",
    u."role"
FROM "session" AS s
JOIN "user" AS u ON u."id" = s."userId"
WHERE s."token" = $1
  AND s."expiresAt" > CURRENT_TIMESTAMP
LIMIT 1;

-- READ
-- Find a user during email sign-in or before admin promotion.
-- $1 = normalized email address
SELECT
    u."id",
    u."name",
    u."email",
    u."emailVerified" AS email_verified,
    u."image",
    u."role",
    u."createdAt" AS created_at,
    u."updatedAt" AS updated_at
FROM "user" AS u
WHERE u."email" = $1
LIMIT 1;

-- READ
-- Load the credential account and owning user for password authentication.
-- $1 = account ID (normally the user's ID for the credential provider)
-- $2 = provider ID, normally 'credential'
SELECT
    a."id" AS account_row_id,
    a."accountId" AS account_id,
    a."providerId" AS provider_id,
    a."password",
    u."id" AS user_id,
    u."name",
    u."email",
    u."emailVerified" AS email_verified,
    u."role"
FROM "account" AS a
JOIN "user" AS u ON u."id" = a."userId"
WHERE a."accountId" = $1
  AND a."providerId" = $2
LIMIT 1;

-- WRITE
-- Create a user during email/password sign-up.
-- $1 = user ID, $2 = name, $3 = normalized email, $4 = optional image
INSERT INTO "user" (
    "id",
    "name",
    "email",
    "emailVerified",
    "image",
    "role",
    "createdAt",
    "updatedAt"
)
VALUES ($1, $2, $3, FALSE, $4, 'user', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
RETURNING
    "id",
    "name",
    "email",
    "emailVerified",
    "image",
    "role",
    "createdAt",
    "updatedAt";

-- WRITE
-- Store the hashed password for a new credential account.
-- $1 = account row ID, $2 = account ID, $3 = user ID, $4 = password hash
INSERT INTO "account" (
    "id",
    "accountId",
    "providerId",
    "userId",
    "password",
    "createdAt",
    "updatedAt"
)
VALUES ($1, $2, 'credential', $3, $4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
RETURNING "id", "accountId", "providerId", "userId";

-- WRITE
-- Create a signed-in session.
-- $1 = session ID, $2 = token, $3 = expiry, $4 = IP address,
-- $5 = user agent, $6 = user ID
INSERT INTO "session" (
    "id",
    "token",
    "expiresAt",
    "ipAddress",
    "userAgent",
    "userId",
    "createdAt",
    "updatedAt"
)
VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
RETURNING "id", "token", "expiresAt", "userId";

-- WRITE
-- Refresh session metadata and expiry.
-- $1 = session token, $2 = new expiry, $3 = IP address, $4 = user agent
UPDATE "session"
SET
    "expiresAt" = $2,
    "ipAddress" = $3,
    "userAgent" = $4,
    "updatedAt" = CURRENT_TIMESTAMP
WHERE "token" = $1
RETURNING "id", "token", "expiresAt", "userId";

-- WRITE
-- Sign out by deleting the active session.
-- $1 = session token
DELETE FROM "session"
WHERE "token" = $1
RETURNING "id";

-- WRITE
-- Promote an existing user to administrator.
-- $1 = user ID returned by the email lookup
UPDATE "user"
SET
    "role" = 'admin',
    "updatedAt" = CURRENT_TIMESTAMP
WHERE "id" = $1
RETURNING "id", "email", "role";

-- ---------------------------------------------------------------------------
-- Question creation and test cases
-- ---------------------------------------------------------------------------

-- WRITE
-- Create a question. Run this and the following test-case insert in one
-- transaction so a question cannot be saved without its test cases.
-- $1 = slug, $2 = title, $3 = statement, $4 = time limit,
-- $5 = memory limit, $6 = creator user ID
INSERT INTO "questions" (
    "slug",
    "title",
    "statement",
    "time_limit",
    "memory_limit",
    "created_by_id",
    "created_at",
    "updated_at"
)
VALUES ($1, $2, $3, COALESCE($4, 2), COALESCE($5, 128000), $6, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
RETURNING
    "id",
    "slug",
    "title",
    "statement",
    "time_limit",
    "memory_limit",
    "created_by_id",
    "created_at",
    "updated_at";

-- WRITE
-- Insert all test cases for a newly created question.
-- $1 = question ID
-- $2 = JSON array containing stdin, expected_output, is_sample, and position
INSERT INTO "test_cases" (
    "question_id",
    "stdin",
    "expected_output",
    "is_sample",
    "position"
)
SELECT
    $1,
    COALESCE(tc.stdin, ''),
    tc.expected_output,
    COALESCE(tc.is_sample, FALSE),
    tc.position
FROM jsonb_to_recordset($2::jsonb) AS tc(
    stdin TEXT,
    expected_output TEXT,
    is_sample BOOLEAN,
    position INTEGER
)
ORDER BY tc.position
RETURNING
    "id",
    "question_id",
    "stdin",
    "expected_output",
    "is_sample",
    "position";

-- READ
-- Return a newly created question with its ordered test cases.
-- $1 = question ID
SELECT
    q."id" AS question_id,
    q."slug",
    q."title",
    q."statement",
    q."time_limit",
    q."memory_limit",
    q."created_by_id",
    q."created_at",
    q."updated_at",
    tc."id" AS test_case_id,
    tc."stdin",
    tc."expected_output",
    tc."is_sample",
    tc."position"
FROM "questions" AS q
LEFT JOIN "test_cases" AS tc ON tc."question_id" = q."id"
WHERE q."id" = $1
ORDER BY tc."position" ASC;

-- ---------------------------------------------------------------------------
-- Code execution and submission
-- ---------------------------------------------------------------------------

-- READ
-- Load a question and only its sample cases for the Run action.
-- $1 = question slug
SELECT
    q."id" AS question_id,
    q."slug",
    q."title",
    q."time_limit",
    q."memory_limit",
    tc."id" AS test_case_id,
    tc."position",
    tc."stdin",
    tc."expected_output",
    tc."is_sample"
FROM "questions" AS q
JOIN "test_cases" AS tc ON tc."question_id" = q."id"
WHERE q."slug" = $1
  AND tc."is_sample" = TRUE
ORDER BY tc."position" ASC;

-- READ
-- Load a question and every test case for the Submit action.
-- $1 = question slug
SELECT
    q."id" AS question_id,
    q."slug",
    q."title",
    q."time_limit",
    q."memory_limit",
    tc."id" AS test_case_id,
    tc."position",
    tc."stdin",
    tc."expected_output",
    tc."is_sample"
FROM "questions" AS q
JOIN "test_cases" AS tc ON tc."question_id" = q."id"
WHERE q."slug" = $1
ORDER BY tc."position" ASC;

-- WRITE
-- Create a pending submission before sending cases to Judge0.
-- $1 = submission ID, $2 = user ID, $3 = question ID, $4 = source code
INSERT INTO "submissions" (
    "id",
    "user_id",
    "question_id",
    "source_code",
    "language",
    "status",
    "created_at"
)
VALUES ($1, $2, $3, $4, 'python', 'PENDING', CURRENT_TIMESTAMP)
RETURNING
    "id",
    "user_id",
    "question_id",
    "language",
    "status",
    "created_at";

-- WRITE
-- Save the final aggregate result for a submission.
-- $1 = submission ID, $2 = status, $3 = maximum runtime,
-- $4 = maximum memory usage
UPDATE "submissions"
SET
    "status" = $2::"SubmissionStatus",
    "runtime_ms" = $3,
    "memory_kb" = $4
WHERE "id" = $1
RETURNING
    "id",
    "status",
    "runtime_ms",
    "memory_kb",
    "created_at";

-- WRITE
-- Save per-case results. Hidden-case input and expected output are stored as
-- NULL so submission responses cannot accidentally reveal them.
-- $1 = submission ID
-- $2 = JSON array of case-result snapshots
INSERT INTO "submission_case_results" (
    "id",
    "submission_id",
    "test_case_id",
    "position",
    "is_sample",
    "stdin",
    "expected_output",
    "status",
    "runtime_ms",
    "memory_kb",
    "actual_output"
)
SELECT
    result.id,
    $1,
    result.test_case_id,
    result.position,
    result.is_sample,
    CASE WHEN result.is_sample THEN result.stdin ELSE NULL END,
    CASE WHEN result.is_sample THEN result.expected_output ELSE NULL END,
    result.status::"SubmissionStatus",
    result.runtime_ms,
    result.memory_kb,
    result.actual_output
FROM jsonb_to_recordset($2::jsonb) AS result(
    id TEXT,
    test_case_id INTEGER,
    position INTEGER,
    is_sample BOOLEAN,
    stdin TEXT,
    expected_output TEXT,
    status TEXT,
    runtime_ms DOUBLE PRECISION,
    memory_kb INTEGER,
    actual_output TEXT
)
ORDER BY result.position
RETURNING
    "id",
    "submission_id",
    "test_case_id",
    "position",
    "status";

-- WRITE
-- Mark a submission as failed if execution or persistence stops unexpectedly.
-- $1 = submission ID
UPDATE "submissions"
SET "status" = 'INTERNAL_ERROR'
WHERE "id" = $1
RETURNING "id", "status";

-- ---------------------------------------------------------------------------
-- Submission history
-- ---------------------------------------------------------------------------

-- READ
-- List one user's submissions with question information and an optional
-- question-slug filter.
-- $1 = user ID, $2 = optional question slug, $3 = page size, $4 = row offset
SELECT
    s."id",
    s."language",
    s."status",
    s."runtime_ms",
    s."memory_kb",
    s."created_at",
    q."slug" AS question_slug,
    q."title" AS question_title
FROM "submissions" AS s
JOIN "questions" AS q ON q."id" = s."question_id"
WHERE s."user_id" = $1
  AND ($2::TEXT IS NULL OR q."slug" = $2)
ORDER BY s."created_at" DESC
LIMIT $3
OFFSET $4;

-- READ
-- Count submissions for pagination using the same optional filter.
-- $1 = user ID, $2 = optional question slug
SELECT COUNT(*)::INTEGER AS total
FROM "submissions" AS s
JOIN "questions" AS q ON q."id" = s."question_id"
WHERE s."user_id" = $1
  AND ($2::TEXT IS NULL OR q."slug" = $2);

-- READ
-- Load one submission owned by the signed-in user, including its question and
-- ordered case-result snapshots.
-- $1 = submission ID, $2 = signed-in user ID
SELECT
    s."id" AS submission_id,
    s."source_code",
    s."language",
    s."status" AS submission_status,
    s."runtime_ms" AS submission_runtime_ms,
    s."memory_kb" AS submission_memory_kb,
    s."created_at",
    q."slug" AS question_slug,
    q."title" AS question_title,
    scr."id" AS case_result_id,
    scr."test_case_id",
    scr."position",
    scr."is_sample",
    scr."stdin",
    scr."expected_output",
    scr."status" AS case_status,
    scr."runtime_ms" AS case_runtime_ms,
    scr."memory_kb" AS case_memory_kb,
    scr."actual_output"
FROM "submissions" AS s
JOIN "questions" AS q ON q."id" = s."question_id"
LEFT JOIN "submission_case_results" AS scr
    ON scr."submission_id" = s."id"
WHERE s."id" = $1
  AND s."user_id" = $2
ORDER BY scr."position" ASC;
