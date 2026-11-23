"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ApiError, apiRequest } from "../../app/api-request";
import { AuthCard } from "../../app/auth-card";
import PythonEditor from "./python-editor";
import { WorkspaceResults, type ExecutionIssue } from "./workspace-results";
import type { ExecutionResponse, QuestionDetail } from "./question-types";
import styles from "./workspace.module.css";

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
const starterCode = [
  "def solve():",
  "    # Read the input described in the problem.",
  "    # Print only the answer.",
  "    pass",
  "",
  'if __name__ == "__main__":',
  "    solve()",
  ""
].join("\n");

type Mode = ExecutionResponse["mode"];
type Report = { result: ExecutionResponse } | { issue: ExecutionIssue };

export default function QuestionWorkspace({ slug }: { slug: string }) {
  const [question, setQuestion] = useState<QuestionDetail | null>(null);
  const [loadError, setLoadError] = useState("");
  const [notFound, setNotFound] = useState(false);
  const [retry, setRetry] = useState(0);
  const [code, setCode] = useState(starterCode);
  const [busy, setBusy] = useState<Mode | null>(null);
  const [report, setReport] = useState<Report | null>(null);
  const [queuedAction, setQueuedAction] = useState<Mode | null>(null);
  const [view, setView] = useState<"samples" | "result">("samples");
  const [runNumber, setRunNumber] = useState(0);
  const activeRequest = useRef<AbortController | null>(null);
  const resultsPanel = useRef<HTMLElement>(null);
  const resultBody = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const controller = new AbortController();
    apiRequest<QuestionDetail>("/api/questions/" + encodeURIComponent(slug), { signal: controller.signal })
      .then((data) => { if (!controller.signal.aborted) setQuestion(data); })
      .catch((cause: unknown) => {
        if (controller.signal.aborted) return;
        const missing = cause instanceof ApiError && cause.status === 404;
        setNotFound(missing);
        setLoadError(missing ? "This problem could not be found." : "Could not load the problem. Try again.");
      });
    return () => controller.abort();
  }, [slug, retry]);

  useEffect(() => () => activeRequest.current?.abort(), []);

  async function execute(mode: Mode) {
    if (!question || !code.trim() || activeRequest.current) return;
    setView("result");
    setRunNumber((number) => number + 1);
    setReport(null);
    if (resultBody.current) resultBody.current.scrollTop = 0;
    if (window.matchMedia("(max-width: 850px), (max-height: 680px)").matches) {
      resultsPanel.current?.scrollIntoView({ block: "start" });
    }

    if (code.length > 100_000) {
      setReport({ issue: { title: "Solution is too long", hint: "Shorten your code to 100,000 characters or fewer and try again." } });
      return;
    }

    const controller = new AbortController();
    activeRequest.current = controller;
    setBusy(mode);
    try {
      const response = await fetch(apiUrl + "/api/executions/" + mode, {
        method: "POST",
        credentials: "include",
        signal: controller.signal,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questionSlug: question.slug, sourceCode: code })
      });

      if (controller.signal.aborted) return;
      if (response.status === 401) {
        setQueuedAction(mode);
        return;
      }
      const data = await response.json().catch(() => null);
      if (controller.signal.aborted) return;
      if (!response.ok || !data) {
        const action = mode === "run" ? "run the samples" : "submit the solution";
        const savedId = typeof data?.submissionId === "string" ? data.submissionId : undefined;
        const hint = response.status === 502
          ? "The judging service is unavailable. Your code is still in the editor. Try again in a moment."
          : response.status === 422
            ? (mode === "run" ? "This problem has no sample cases. Check the problem statement or return to the catalog." : "This problem has no grading cases. Return to the catalog and try another problem.")
            : "Your code is still in the editor. Try again.";
        setReport({ issue: { title: "Couldn’t " + action, hint, submissionId: savedId } });
        return;
      }
      setReport({ result: data as ExecutionResponse });
    } catch {
      if (!controller.signal.aborted) {
        setReport({ issue: { title: "Couldn’t reach the judge", hint: "Check your connection and try again. Your code is still in the editor." } });
      }
    } finally {
      activeRequest.current = null;
      if (!controller.signal.aborted) setBusy(null);
    }
  }

  function finishSignIn() {
    const action = queuedAction;
    setQueuedAction(null);
    if (action) void execute(action);
  }

  if (!question) return <main id="main-content" className="arena-page" tabIndex={-1}>
    <div className="arena-container">
      {loadError ? <div className="arena-state" role="alert">
        <h1>Problem unavailable</h1><p>{loadError}</p>
        <div className="arena-action-row">
          {!notFound && <button className="rx-btn rx-btn-secondary" type="button" onClick={() => { setLoadError(""); setRetry(retry + 1); }}>Retry</button>}
          <Link className="rx-btn rx-btn-primary" href="/questions">Back to problems</Link>
        </div>
      </div> : <div className="arena-state" role="status">Loading problem…</div>}
    </div>
  </main>;

  const difficulty = question.difficulty.toLowerCase();
  const controls = (
    <div className={styles.actions} role="group" aria-label="Judge your solution" aria-describedby="judge-actions-help">
      <button className="rx-btn rx-btn-secondary" type="button"
        disabled={!!busy || !code.trim() || !question.sampleTestCases.length} onClick={() => void execute("run")}>
        {busy === "run" ? "Running samples…" : "Run samples"}
      </button>
      <button className="rx-btn rx-btn-primary" type="button"
        disabled={!!busy || !code.trim()} onClick={() => void execute("submit")}>
        {busy === "submit" ? "Submitting…" : "Submit solution"}
      </button>
    </div>
  );

  return <main id="main-content" className="arena-page" tabIndex={-1}>
    <div className={styles.toolbar}>
      <Link className="arena-link" href="/questions">Back to problems</Link>
      <p className={styles.toolbarHint} id="judge-actions-help">Run checks the samples. Submit checks all cases and saves your attempt.</p>
      <div className={styles.desktopActions}>{controls}</div>
    </div>

    <div className={styles.split}>
      <section className={styles.panel + " " + styles.description} aria-labelledby="problem-title">
        <div className={styles.panelHeader}><span className={styles.panelTitle}>Description</span></div>
        <div className={styles.descriptionBody} tabIndex={0} role="region" aria-label="Problem description">
          <h1 id="problem-title">{question.title}</h1>
          <div className={styles.metadata}>
            <span className={"rx-q-difficulty rx-q-" + difficulty}>{difficulty[0]?.toUpperCase() + difficulty.slice(1)}</span>
            <span>{question.timeLimit} s time limit</span>
            <span>{question.memoryLimit.toLocaleString()} KB memory limit</span>
          </div>
          <p className={styles.statement}>{question.statement}</p>

          <section className={styles.guide} aria-labelledby="io-heading">
            <h2 id="io-heading">Input and output</h2>
            <p>Read the values from standard input in the order shown below. Print only the answer to standard output, without prompts or labels.</p>
            <p>In Python, <code>input()</code> reads one line. For several values on that line, use <code>input().split()</code>.</p>
          </section>

          {question.sampleTestCases.map((sample, index) => <section className={styles.example} key={sample.position}>
            <h2>Example {index + 1}</h2>
            <dl className={styles.values}>
              <div><dt>Input</dt><dd><pre>{sample.stdin || "(empty)"}</pre></dd></div>
              <div><dt>Expected output</dt><dd><pre>{sample.expectedOutput || "(empty)"}</pre></dd></div>
            </dl>
          </section>)}
          {!!question.tags.length && <div className={"rx-q-tags " + styles.topics} aria-label="Topics">{question.tags.map((tag) => <span key={tag}>{tag}</span>)}</div>}
        </div>
      </section>

      <div className={styles.workbench}>
        <section className={styles.panel + " " + styles.editor} aria-labelledby="editor-heading">
          <header className={styles.panelHeader}>
            <h2 className={styles.panelTitle} id="editor-heading">Code editor</h2><span className={styles.language}>Python 3.11</span>
          </header>
          <div className={styles.editorBody}><PythonEditor code={code} onChange={setCode} /></div>
          <div className={styles.mobileActions}>{controls}</div>
        </section>

        <section className={styles.panel + " " + styles.results} aria-label="Samples and test results" ref={resultsPanel}>
          <div className={styles.panelHeader + " " + styles.resultHeader} role="group" aria-label="Results view">
            <button type="button" aria-pressed={view === "samples"} onClick={() => setView("samples")}>Sample cases</button>
            <button type="button" aria-pressed={view === "result"} onClick={() => setView("result")}>Test result</button>
          </div>
          <div className={styles.resultBody} tabIndex={0} role="region" aria-label="Result details" ref={resultBody}>
            <WorkspaceResults key={runNumber} view={view} samples={question.sampleTestCases} busy={busy} report={report} />
          </div>
        </section>
      </div>
    </div>

    {queuedAction && <WorkspaceSignIn onClose={() => setQueuedAction(null)} onAuthenticated={finishSignIn} />}
  </main>;
}

function WorkspaceSignIn({ onClose, onAuthenticated }: { onClose: () => void; onAuthenticated: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const element = dialog.current;
    element?.showModal();
    return () => element?.close();
  }, []);

  return <dialog ref={dialog} className="arena-dialog" aria-label="Sign in to run code"
    onCancel={(event) => { event.preventDefault(); onClose(); }}>
    <button className="rx-btn rx-btn-quiet arena-close" type="button" onClick={onClose}>Close</button>
    <AuthCard initialMode="sign-in" onAuthenticated={onAuthenticated} embedded />
  </dialog>;
}
