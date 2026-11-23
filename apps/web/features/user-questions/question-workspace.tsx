"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AuthCard } from "../../app/auth-card";
import QuestionNav from "./question-nav";
import PythonEditor from "./python-editor";
import type { ExecutionResponse, QuestionDetail } from "./question-types";

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
const starterCode = `import sys

def solve():
    data = sys.stdin.read().strip().split()

    # Write your solution here

if __name__ == "__main__":
    solve()
`;

function difficultyClass(difficulty: string) { return `rx-q-difficulty rx-q-${difficulty.toLowerCase()}`; }
function statusLabel(status: string) {
  return ({ ACCEPTED: "Accepted", WRONG_ANSWER: "Wrong answer", TIME_LIMIT_EXCEEDED: "Time limit exceeded", MEMORY_LIMIT_EXCEEDED: "Memory limit exceeded", COMPILATION_ERROR: "Compilation error", RUNTIME_ERROR: "Runtime error", INTERNAL_ERROR: "Internal error", PENDING: "Pending" } as Record<string, string>)[status] ?? status;
}

export default function QuestionWorkspace({ slug }: { slug: string }) {
  const [question, setQuestion] = useState<QuestionDetail | null>(null);
  const [code, setCode] = useState(starterCode);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<"run" | "submit" | null>(null);
  const [error, setError] = useState("");
  const [result, setResult] = useState<ExecutionResponse | null>(null);
  const [showAuth, setShowAuth] = useState(false);
  const [queuedAction, setQueuedAction] = useState<"run" | "submit" | null>(null);
  const [resultTab, setResultTab] = useState<"testcases" | "result">("testcases");

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    fetch(`${apiUrl}/api/questions/${encodeURIComponent(slug)}`, { signal: controller.signal, credentials: "include" })
      .then(async response => {
        if (!response.ok) throw new Error(response.status === 404 ? "This question could not be found." : "Questions are unavailable right now.");
        return response.json() as Promise<QuestionDetail>;
      })
      .then(setQuestion)
      .catch(fetchError => { if (!controller.signal.aborted) setError(fetchError instanceof Error ? fetchError.message : "Could not load this question."); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [slug]);

  async function execute(mode: "run" | "submit") {
    if (!question || busy) return;
    setBusy(mode);
    setError("");
    setResult(null);
    setResultTab("result");
    try {
      const response = await fetch(`${apiUrl}/api/executions/${mode}`, {
        method: "POST", credentials: "include", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questionSlug: question.slug, sourceCode: code })
      });
      const data = await response.json().catch(() => ({}));
      if (response.status === 401) { setQueuedAction(mode); setShowAuth(true); return; }
      if (!response.ok) throw new Error(data.error ?? `Could not ${mode} this solution.`);
      setResult(data as ExecutionResponse);
    } catch (executeError) {
      setError(executeError instanceof Error ? executeError.message : "Execution failed. Please try again.");
    } finally { setBusy(null); }
  }

  function finishSignIn() {
    const action = queuedAction;
    setQueuedAction(null);
    setShowAuth(false);
    // The auth card has refreshed the Better Auth session before calling this.
    // Retry the action that opened the sign-in prompt so the user does not have
    // to click Run or Submit a second time.
    if (action) void execute(action);
  }

  if (loading) return <main className="rx-qpage"><QuestionNav/><div className="rx-q-loading" role="status">Loading question…</div></main>;
  if (!question) return <main className="rx-qpage"><QuestionNav/><div className="rx-q-empty"><h1>Question unavailable</h1><p>{error}</p><Link className="rx-btn rx-btn-primary" href="/questions">Back to problems <span>↗</span></Link></div></main>;

  return <main className="rx-qpage rx-lc-page">
    <QuestionNav />
    <div className="rx-lc-topline"><Link href="/questions">← All problems</Link><span>Problem workspace</span><span className="rx-lc-language">Python 3.11</span></div>
    <div className="rx-lc-layout">
      <section className="rx-lc-statement rx-glass" aria-labelledby="rx-lc-title">
        <div className="rx-lc-title-row"><span className="rx-lc-number">{question.id}.</span><h1 id="rx-lc-title">{question.title}</h1><span className={difficultyClass(question.difficulty)}>{question.difficulty[0] + question.difficulty.slice(1).toLowerCase()}</span></div>
        <div className="rx-lc-meta">{question.tags.map(tag => <span key={tag}>{tag}</span>)}</div>
        <div className="rx-lc-description">{question.statement.split("\n").map((line, index) => <p key={`${index}-${line}`}>{line || <br/>}</p>)}</div>
        {question.sampleTestCases.map((testCase, index) => <article className="rx-lc-example" key={testCase.position}><h2>Example {index + 1}</h2><pre><b>Input:</b> {testCase.stdin || "(empty)"}{"\n"}<b>Output:</b> {testCase.expectedOutput.trimEnd()}</pre></article>)}
        <div className="rx-lc-limits"><span>Time limit <b>{question.timeLimit}s</b></span><span>Memory <b>{Math.round(question.memoryLimit / 1000)} MB</b></span></div>
      </section>
      <section className="rx-lc-workbench" aria-label="Code editor and results">
        <div className="rx-lc-editor-card rx-glass">
          <div className="rx-lc-editor-head"><span><i/> CODE</span><span className="rx-lc-language">Python 3.11</span></div>
          <div className="rx-lc-editor"><PythonEditor code={code} onChange={setCode}/></div>
          <div className="rx-lc-actions" role="group" aria-label="Code execution actions">
            <span className="rx-lc-hint" id="rx-lc-actions-hint">Run checks the sample tests. Submit checks all tests and saves your attempt.</span>
            <div>
              <button className="rx-btn rx-btn-secondary" type="button" aria-describedby="rx-lc-actions-hint" disabled={!!busy || !code.trim()} onClick={() => execute("run")}>{busy === "run" ? "Running…" : "Run"}</button>
              <button className="rx-btn rx-btn-primary" type="button" aria-describedby="rx-lc-actions-hint" disabled={!!busy || !code.trim()} onClick={() => execute("submit")}>{busy === "submit" ? "Submitting…" : "Submit"}<span>↗</span></button>
            </div>
          </div>
        </div>
        <section className="rx-lc-results rx-glass" aria-live="polite"><div className="rx-lc-result-tabs"><button type="button" className={resultTab === "testcases" ? "active" : ""} onClick={() => setResultTab("testcases")}>Test cases</button><button type="button" className={resultTab === "result" ? "active" : ""} onClick={() => setResultTab("result")}>Result</button>{result && <span className={result.status === "ACCEPTED" ? "rx-lc-status-ok" : "rx-lc-status-bad"}>{statusLabel(result.status)}</span>}</div>
          <div className="rx-lc-result-body">{error ? <p className="rx-lc-error" role="alert">{error}</p> : busy ? <p className="rx-lc-muted" role="status">{busy === "run" ? "Running your code against the sample cases…" : "Submitting your solution against all test cases…"}</p> : result ? resultTab === "result" ? <><h2 className={result.status === "ACCEPTED" ? "rx-lc-status-ok" : "rx-lc-status-bad"}>{statusLabel(result.status)}</h2><p>{result.passed} / {result.total} test cases passed{result.mode === "run" ? " (sample cases)" : ""}</p>{result.submissionId && <p className="rx-lc-muted">Submission saved to your history.</p>}{result.status !== "ACCEPTED" && result.results.find(item => item.isSample)?.actualOutput && <pre className="rx-lc-diagnostic">{result.results.find(item => item.isSample)?.actualOutput?.trimEnd()}</pre>}<div className="rx-lc-result-metrics"><span>Runtime <b>{result.runtimeMs === null ? "—" : `${result.runtimeMs} ms`}</b></span><span>Memory <b>{result.memoryKb === null ? "—" : `${result.memoryKb} KB`}</b></span></div></> : <div className="rx-lc-test-list">{result.results.map(item => <article key={item.position}><div><span className={item.status === "ACCEPTED" ? "rx-lc-status-ok" : "rx-lc-status-bad"}>{item.status === "ACCEPTED" ? "✓" : "×"} Test case {item.position + 1}</span><span>{statusLabel(item.status)}</span></div>{item.isSample && <pre><b>Input:</b> {item.stdin || "(empty)"}{"\n"}<b>Expected:</b> {item.expectedOutput?.trimEnd()}{"\n"}<b>Output:</b> {item.actualOutput?.trimEnd()}</pre>}</article>)}</div> : <p className="rx-lc-muted">Run your code to see test case results here.</p>}</div>
        </section>
      </section>
    </div>
    {showAuth && <div className="rx-modal-backdrop" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) { setShowAuth(false); setQueuedAction(null); } }}><div className="rx-modal" role="dialog" aria-modal="true" aria-label="Sign in to run code"><button className="rx-modal-close" onClick={() => { setShowAuth(false); setQueuedAction(null); }} aria-label="Close sign in">×</button><AuthCard initialMode="sign-in" onAuthenticated={finishSignIn}/></div></div>}
  </main>;
}
