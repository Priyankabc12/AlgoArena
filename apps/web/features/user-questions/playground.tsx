"use client";

import Link from "next/link";
import { FormEvent, useEffect, useRef, useState } from "react";
import { ApiError, apiRequest } from "../../app/api-request";
import { authClient } from "../../app/auth-client";
import QuestionNav from "./question-nav";
import styles from "./practice-tools.module.css";

type JudgeResult = {
  status?: { description: string };
  stdout: string | null;
  stderr: string | null;
  compile_output: string | null;
  message: string | null;
  time: string | null;
  memory: number | null;
};

export default function Playground() {
  const { data: session, isPending } = authClient.useSession();
  const [reachable, setReachable] = useState<boolean | null>(null);
  const [healthAttempt, setHealthAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setReachable(null);
    apiRequest<{ status: string }>("/health", { signal: controller.signal })
      .then(() => { if (!controller.signal.aborted) setReachable(true); })
      .catch(() => { if (!controller.signal.aborted) setReachable(false); });
    return () => controller.abort();
  }, [healthAttempt]);

  return <main className="rx-qpage">
    <QuestionNav />
    <div className={styles.content}>
      <h1>Code playground</h1>
      <p>Run code with your own input and inspect the compiler or program output.</p>
      <p className={styles.health} role="status">{reachable === null ? "Checking API…" : reachable ? "API reachable" : "API unavailable"}
        {reachable === false && <button className="rx-btn rx-btn-quiet" type="button" onClick={() => setHealthAttempt(healthAttempt + 1)}>Retry connection</button>}
      </p>
      <Runner key={session?.user.id ?? "guest"} signedIn={!!session} checkingSession={isPending} />
    </div>
  </main>;
}

function Runner({ signedIn, checkingSession }: { signedIn: boolean; checkingSession: boolean }) {
  const [result, setResult] = useState<JudgeResult | null>(null);
  const [error, setError] = useState("");
  const [expired, setExpired] = useState(false);
  const [busy, setBusy] = useState(false);
  const pending = useRef<AbortController | null>(null);
  useEffect(() => () => pending.current?.abort(), []);

  async function run(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!signedIn || pending.current) return;
    const form = new FormData(event.currentTarget);
    const controller = new AbortController();
    pending.current = controller;
    setError("");
    setResult(null);
    setBusy(true);
    try {
      const data = await apiRequest<JudgeResult>("/execute", {
        method: "POST", signal: controller.signal, headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source_code: String(form.get("code") ?? ""),
          language_id: Number(form.get("language")),
          stdin: String(form.get("input") ?? "")
        })
      });
      if (!controller.signal.aborted) setResult(data);
    } catch (cause) {
      if (!controller.signal.aborted) {
        setExpired(cause instanceof ApiError && cause.status === 401);
        setError(cause instanceof Error ? cause.message : "Could not run the code.");
      }
    } finally {
      pending.current = null;
      if (!controller.signal.aborted) setBusy(false);
    }
  }

  return <div className={styles.workbench}>
    <form className={styles.panel} onSubmit={run}>
      <label>Judge0 language ID<input type="number" name="language" defaultValue="71" min="1" step="1" required /></label>
      <div><label htmlFor="playground-source">Source code</label><textarea id="playground-source" name="code" rows={10} defaultValue={'print("Hello, world!")'} required /></div>
      <label>Standard input<textarea name="input" rows={4} /></label>
      {checkingSession ? <p role="status">Checking your session…</p>
        : !signedIn || expired ? <Link className="rx-btn rx-btn-primary" href="/signin?returnTo=%2Fplayground">Sign in to run</Link>
        : <button className="rx-btn rx-btn-primary" type="submit" disabled={busy}>{busy ? "Running…" : "Run code"}</button>}
    </form>
    <section className={styles.panel} aria-live="polite">
      <h2>Execution output</h2>
      {busy ? <p role="status">Waiting for Judge0…</p>
        : error ? <p role="alert" className={styles.error}>{error}</p>
        : result ? <>
          <p><strong>{result.status?.description ?? "No verdict returned"}</strong></p>
          <dl className={styles.outputs}>
            {result.stdout && <div><dt>Standard output</dt><dd><pre>{result.stdout}</pre></dd></div>}
            {result.stderr && <div><dt>Standard error</dt><dd><pre>{result.stderr}</pre></dd></div>}
            {result.compile_output && <div><dt>Compiler output</dt><dd><pre>{result.compile_output}</pre></dd></div>}
            {result.message && <div><dt>Message</dt><dd><pre>{result.message}</pre></dd></div>}
          </dl>
          {!result.stdout && !result.stderr && !result.compile_output && !result.message && <p>No output.</p>}
          <p>Runtime {result.time ?? "—"}{result.time !== null && " s"} · Memory {result.memory ?? "—"}{result.memory !== null && " KB"}</p>
        </> : <p>Run code to see its output here.</p>}
    </section>
  </div>;
}
