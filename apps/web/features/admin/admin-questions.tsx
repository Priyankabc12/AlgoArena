"use client";

import Link from "next/link";
import { FormEvent, useEffect, useRef, useState } from "react";
import { ApiError, apiRequest } from "../../app/api-request";
import { authClient } from "../../app/auth-client";
import QuestionNav from "../user-questions/question-nav";
import type { QuestionItem, QuestionList } from "../user-questions/question-types";
import styles from "./admin.module.css";

type TestCase = { stdin: string; expectedOutput: string; isSample: boolean };
type AdminQuestion = QuestionItem & { statement: string; testCases: TestCase[] };
type Selection = { kind: "list" } | { kind: "new" } | { kind: "edit"; slug: string };

export default function AdminQuestions() {
  const { data: session, isPending, error, refetch } = authClient.useSession();

  return (
    <main className="rx-qpage">
      <QuestionNav />
      <div className={styles.shell}>
        <h1 className={styles.title}>Manage problems</h1>
        {isPending ? <p role="status">Checking access…</p>
          : error ? <div role="alert"><p>Could not check your session.</p><button className="rx-btn rx-btn-secondary" onClick={() => void refetch()}>Retry</button></div>
          : !session ? <div><p>Sign in with an administrator account.</p><Link className="rx-btn rx-btn-primary" href="/signin?returnTo=%2Fadmin">Sign in</Link></div>
          : session.user.role !== "admin" ? <p role="alert">An administrator account is required to manage problems.</p>
          : <QuestionManager key={session.user.id} />}
      </div>
    </main>
  );
}

function QuestionManager() {
  const [selection, setSelection] = useState<Selection>({ kind: "list" });
  const [notice, setNotice] = useState("");

  function saved(question: AdminQuestion, created: boolean) {
    setNotice((created ? "Created " : "Saved ") + question.title + ".");
    setSelection({ kind: "list" });
  }

  return <>
    {notice && <p className={styles.notice} role="status">{notice}</p>}
    {selection.kind === "list" ? (
      <QuestionListPanel onCreate={() => { setNotice(""); setSelection({ kind: "new" }); }}
        onEdit={(slug) => { setNotice(""); setSelection({ kind: "edit", slug }); }} />
    ) : (
      <QuestionEditor key={selection.kind === "edit" ? selection.slug : "new"}
        slug={selection.kind === "edit" ? selection.slug : undefined}
        onCancel={() => setSelection({ kind: "list" })} onSaved={saved} />
    )}
  </>;
}

function QuestionListPanel({ onCreate, onEdit }: { onCreate: () => void; onEdit: (slug: string) => void }) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [attempt, setAttempt] = useState(0);
  const [data, setData] = useState<QuestionList | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    setData(null);
    setError("");
    const timeout = window.setTimeout(() => {
      const query = new URLSearchParams({ search: search.trim(), page: String(page) });
      apiRequest<QuestionList>("/api/questions?" + query, { signal: controller.signal })
        .then((result) => { if (!controller.signal.aborted) setData(result); })
        .catch((cause: Error) => { if (!controller.signal.aborted) setError(cause.message); });
    }, 160);
    return () => { window.clearTimeout(timeout); controller.abort(); };
  }, [search, page, attempt]);

  return <section aria-labelledby="question-list-heading">
    <div className={styles.toolbar}>
      <div><h2 id="question-list-heading">Problem catalog</h2>{data && <p>{data.total} {data.total === 1 ? "problem" : "problems"}</p>}</div>
      <button className="rx-btn rx-btn-primary" type="button" onClick={onCreate}>Create problem</button>
    </div>
    <label className={styles.search}>Search by title or slug
      <input type="search" value={search} onChange={(event) => { setPage(1); setSearch(event.target.value); }} />
    </label>
    {error ? <div role="alert"><p>{error}</p><button className="rx-btn rx-btn-secondary" onClick={() => setAttempt(attempt + 1)}>Retry</button></div>
      : !data ? <p role="status">Loading problems…</p>
      : !data.items.length ? <p>No problems match this search.</p>
      : <ul className={styles.inventory}>
        {data.items.map((question) => <li key={question.id}>
          <div><strong>{question.title}</strong><code>{question.slug}</code></div>
          <span className={"rx-q-difficulty rx-q-" + question.difficulty.toLowerCase()}>{question.difficulty.toLowerCase()}</span>
          <button className="rx-btn rx-btn-secondary" type="button" aria-label={"Edit " + question.title} onClick={() => onEdit(question.slug)}>Edit</button>
        </li>)}
      </ul>}
    {data && data.totalPages > 1 && <nav className={styles.actions} aria-label="Admin problem pages">
      <button className="rx-btn rx-btn-secondary" type="button" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</button>
      <span>Page {page} of {data.totalPages}</span>
      <button className="rx-btn rx-btn-secondary" type="button" disabled={page >= data.totalPages} onClick={() => setPage(page + 1)}>Next</button>
    </nav>}
  </section>;
}

function QuestionEditor({ slug, onCancel, onSaved }: {
  slug?: string;
  onCancel: () => void;
  onSaved: (question: AdminQuestion, created: boolean) => void;
}) {
  const [question, setQuestion] = useState<AdminQuestion | null>(null);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!slug) return;
    const controller = new AbortController();
    setError("");
    apiRequest<AdminQuestion>("/api/admin/questions/" + encodeURIComponent(slug), { signal: controller.signal })
      .then((result) => { if (!controller.signal.aborted) setQuestion(result); })
      .catch((cause: Error) => { if (!controller.signal.aborted) setError(cause.message); });
    return () => controller.abort();
  }, [slug, attempt]);

  return <section aria-labelledby="question-editor-heading">
    <div className={styles.toolbar}>
      <h2 id="question-editor-heading">{slug ? "Edit problem" : "New problem"}</h2>
      <button type="button" className="rx-btn rx-btn-secondary" onClick={onCancel}>Back to catalog</button>
    </div>
    {error ? <div role="alert"><p>{error}</p><button className="rx-btn rx-btn-secondary" onClick={() => setAttempt(attempt + 1)}>Retry</button></div>
      : slug && !question ? <p role="status">Loading problem and test cases…</p>
      : <QuestionForm question={question} onSaved={onSaved} />}
  </section>;
}

function QuestionForm({ question, onSaved }: {
  question: AdminQuestion | null;
  onSaved: (question: AdminQuestion, created: boolean) => void;
}) {
  const initialCases = question?.testCases ?? [
    { stdin: "", expectedOutput: "", isSample: true },
    { stdin: "", expectedOutput: "", isSample: false }
  ];
  const [cases, setCases] = useState(() => initialCases.map((testCase, key) => ({ ...testCase, key })));
  const nextKey = useRef(initialCases.length);
  const [error, setError] = useState("");
  const [fields, setFields] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const request = useRef<AbortController | null>(null);
  useEffect(() => () => request.current?.abort(), []);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (request.current) return;
    const form = new FormData(event.currentTarget);
    const value = (name: string) => String(form.get(name) ?? "");
    const testCases = cases.map(({ key }) => ({
      stdin: value("input-" + key),
      expectedOutput: value("output-" + key),
      isSample: form.has("sample-" + key)
    }));
    setError("");
    setFields({});
    if (!testCases.some((testCase) => testCase.isSample) || !testCases.some((testCase) => !testCase.isSample)) {
      setFields({ testCases: "Add at least one sample and one hidden case." });
      return;
    }
    const controller = new AbortController();
    request.current = controller;
    setSaving(true);
    try {
      const path = "/api/admin/questions" + (question ? "/" + encodeURIComponent(question.slug) : "");
      const result = await apiRequest<AdminQuestion>(path, {
        method: question ? "PATCH" : "POST",
        signal: controller.signal,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: value("title"),
          slug: value("slug").trim(),
          statement: value("statement"),
          difficulty: value("difficulty"),
          tags: value("tags").split(",").map((tag) => tag.trim()).filter(Boolean),
          timeLimit: Number(value("timeLimit")),
          memoryLimit: Number(value("memoryLimit")),
          testCases
        })
      });
      if (!controller.signal.aborted) onSaved(result, !question);
    } catch (cause) {
      if (!controller.signal.aborted) {
        setError(cause instanceof Error ? cause.message : "Could not save the problem.");
        if (cause instanceof ApiError) setFields(cause.fields);
      }
    } finally {
      request.current = null;
      if (!controller.signal.aborted) setSaving(false);
    }
  }

  const fieldError = (name: string) => fields[name] && <span className={styles.error} id={"error-" + name}>{fields[name]}</span>;
  const feedback = (name: string) => ({ "aria-invalid": fields[name] ? true : undefined, "aria-describedby": fields[name] ? "error-" + name : undefined });

  return <form onSubmit={save} className={styles.editor}>
    <fieldset className={styles.formGrid} disabled={saving}>
      <legend>Problem details</legend>
      <label>Title<input name="title" required defaultValue={question?.title} {...feedback("title")} />{fieldError("title")}</label>
      <label>Slug<input name="slug" required pattern="[a-z0-9]+(?:-[a-z0-9]+)*" defaultValue={question?.slug} {...feedback("slug")} />{fieldError("slug")}</label>
      <div className={styles.wide}><label htmlFor="problem-statement">Statement</label><textarea id="problem-statement" name="statement" required rows={8} defaultValue={question?.statement} {...feedback("statement")} />{fieldError("statement")}</div>
      <label>Difficulty<select name="difficulty" defaultValue={question?.difficulty ?? "EASY"} {...feedback("difficulty")}><option value="EASY">Easy</option><option value="MEDIUM">Medium</option><option value="HARD">Hard</option></select>{fieldError("difficulty")}</label>
      <label>Topics (comma-separated)<input name="tags" defaultValue={question?.tags.join(", ")} {...feedback("tags")} />{fieldError("tags")}</label>
      <label>Time limit (seconds)<input name="timeLimit" required type="number" min="0.01" step="any" defaultValue={question?.timeLimit ?? 2} {...feedback("timeLimit")} />{fieldError("timeLimit")}</label>
      <label>Memory limit (KB)<input name="memoryLimit" required type="number" min="1" step="1" defaultValue={question?.memoryLimit ?? 128000} {...feedback("memoryLimit")} />{fieldError("memoryLimit")}</label>
    </fieldset>
    <fieldset className={styles.caseList} disabled={saving} {...feedback("testCases")}>
      <legend>Test cases</legend>
      <p>Sample cases are visible on the problem page. Hidden cases are used when judging submissions.</p>
      {fields.testCases && <p className={styles.error} id="error-testCases" role="alert">{fields.testCases}</p>}
      {cases.map((testCase, index) => <section className={styles.testCase} key={testCase.key} aria-label={"Case " + (index + 1)}>
        <div className={styles.caseHeader}>
          <h3>Case {index + 1}</h3>
          <label><input type="checkbox" name={"sample-" + testCase.key} defaultChecked={testCase.isSample} /> Show as sample</label>
          <button type="button" className="rx-btn rx-btn-quiet" aria-label={"Remove case " + (index + 1)} onClick={() => setCases(cases.filter(({ key }) => key !== testCase.key))}>Remove</button>
        </div>
        <div className={styles.caseFields}>
          <div><label htmlFor={"input-" + testCase.key}>Input</label><textarea id={"input-" + testCase.key} name={"input-" + testCase.key} rows={3} defaultValue={testCase.stdin} /></div>
          <div><label htmlFor={"output-" + testCase.key}>Expected output</label><textarea id={"output-" + testCase.key} name={"output-" + testCase.key} rows={3} defaultValue={testCase.expectedOutput} /></div>
        </div>
      </section>)}
      <button className="rx-btn rx-btn-secondary" type="button" onClick={() => {
        const key = nextKey.current++;
        setCases([...cases, { key, stdin: "", expectedOutput: "", isSample: false }]);
      }}>Add test case</button>
    </fieldset>
    {error && <p className={styles.error} role="alert">{error}</p>}
    <button className="rx-btn rx-btn-primary" type="submit" disabled={saving}>{saving ? "Saving…" : question ? "Save changes" : "Create problem"}</button>
    {question && <Link className="rx-btn rx-btn-quiet" href={"/questions/" + encodeURIComponent(question.slug)}>Open public problem</Link>}
  </form>;
}
