"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ApiError, apiRequest } from "../../app/api-request";
import { authClient } from "../../app/auth-client";
import QuestionNav from "./question-nav";
import { statusLabel, type CaseResult, type SubmissionSummary } from "./question-types";
import styles from "./practice-tools.module.css";

type Submission = SubmissionSummary & { sourceCode: string; results: CaseResult[] };

export default function SubmissionDetails({ id }: { id: string }) {
  const { data: session, isPending, error, refetch } = authClient.useSession();
  return <main className="rx-qpage">
    <QuestionNav />
    <div className={styles.content}>
      <Link className={styles.back} href="/profile">Back to profile</Link>
      <h1>Submission details</h1>
      {isPending ? <p role="status">Checking your session…</p>
        : error ? <div role="alert"><p>Could not check your session.</p><button className="rx-btn rx-btn-secondary" onClick={() => void refetch()}>Retry</button></div>
        : !session ? <SignIn id={id} />
        : <Details key={session.user.id + "/" + id} id={id} />}
    </div>
  </main>;
}

function SignIn({ id }: { id: string }) {
  return <div><p>Sign in to view your saved submission.</p><Link className="rx-btn rx-btn-primary" href={"/signin?returnTo=" + encodeURIComponent("/submissions/" + id)}>Sign in</Link></div>;
}

function Details({ id }: { id: string }) {
  const [data, setData] = useState<Submission | null>(null);
  const [error, setError] = useState<{ message: string; status?: number } | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setError(null);
    apiRequest<Submission>("/api/submissions/" + encodeURIComponent(id), { signal: controller.signal })
      .then((submission) => { if (!controller.signal.aborted) setData(submission); })
      .catch((cause: Error) => {
        if (!controller.signal.aborted) setError({ message: cause.message, status: cause instanceof ApiError ? cause.status : undefined });
      });
    return () => controller.abort();
  }, [id, attempt]);

  if (error?.status === 401) return <SignIn id={id} />;
  if (error) return <div role="alert"><p>{error.message}</p>{error.status !== 404 &&
    <button className="rx-btn rx-btn-secondary" onClick={() => setAttempt(attempt + 1)}>Retry</button>}</div>;
  if (!data) return <p role="status">Loading submission…</p>;

  return <>
    <header className={styles.panel}>
      <h2><Link href={"/questions/" + encodeURIComponent(data.question.slug)}>{data.question.title}</Link></h2>
      <p><strong>{statusLabel(data.status)}</strong> · {data.language} · <time dateTime={data.createdAt}>{new Date(data.createdAt).toLocaleString()}</time></p>
      <p>Runtime {data.runtimeMs ?? "—"}{data.runtimeMs !== null && " ms"} · Memory {data.memoryKb ?? "—"}{data.memoryKb !== null && " KB"}</p>
    </header>
    <section className={styles.panel} aria-label="Source code"><h2>Source code</h2><pre><code>{data.sourceCode}</code></pre></section>
    <section className={styles.panel} aria-label="Test case results">
      <h2>Test case results</h2>
      {!data.results.length && <p>No case results are available for this submission.</p>}
      {data.results.map((item) => <section className={styles.case} key={item.position}>
        <h3>{item.isSample ? "Sample" : "Hidden"} case {item.position + 1}</h3>
        <p>{statusLabel(item.status)}</p>
        {item.isSample && <dl className={styles.outputs}>
          <div><dt>Input</dt><dd><pre>{item.stdin || "(empty)"}</pre></dd></div>
          <div><dt>Expected output</dt><dd><pre>{item.expectedOutput || "(empty)"}</pre></dd></div>
          <div><dt>Actual output</dt><dd><pre>{item.actualOutput || "(empty)"}</pre></dd></div>
        </dl>}
      </section>)}
    </section>
  </>;
}
