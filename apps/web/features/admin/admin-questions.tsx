"use client";

import Link from "next/link";
import { FormEvent, useEffect, useRef, useState } from "react";
import { ApiError, apiRequest } from "../../app/api-request";
import { authClient } from "../../app/auth-client";
import type { QuestionItem, QuestionList } from "../user-questions/question-types";
import styles from "./admin.module.css";

type TestCase = { stdin: string; expectedOutput: string; isSample: boolean };
type AdminQuestion = QuestionItem & { statement: string; testCases: TestCase[] };
type Selection = { kind: "list" } | { kind: "new" } | { kind: "edit"; slug: string };

export default function AdminQuestions() {
  const { data: session, isPending, error, refetch } = authClient.useSession();

  return (
    <main id="main-content" className="arena-page" tabIndex={-1}>
      <div className="arena-container">
        <header className="arena-page-heading"><div><h1>Manage problems</h1><p>Maintain the problem catalog and its grading cases.</p></div></header>
        {isPending ? <div className="arena-state" role="status">Checking access…</div>
          : error ? <div className="arena-state" role="alert"><p>Could not check your session.</p><button className="rx-btn rx-btn-secondary" onClick={() => void refetch()}>Retry</button></div>
          : !session ? <div className="arena-state"><p>Sign in with an administrator account.</p><Link className="rx-btn rx-btn-primary" href="/signin?returnTo=%2Fadmin">Sign in</Link></div>
          : session.user.role !== "admin" ? <div className="arena-state" role="alert"><h2>Admin access required</h2><p>An administrator account is required to manage problems.</p><Link className="rx-btn rx-btn-secondary" href="/questions">Browse problems</Link></div>
          : <QuestionManager key={session.user.id} />}
      </div>
    </main>
  );
}

function QuestionManager() {
  const [selection, setSelection] = useState<Selection>({ kind: "list" });
  const [notice, setNotice] = useState("");
  const [revision, setRevision] = useState(0);

  function saved(question: AdminQuestion, created: boolean) {
    setNotice((created ? "Created " : "Saved ") + question.title + ".");
    setRevision((value) => value + 1);
    setSelection({ kind: "list" });
  }

  return <>
    {notice && <p className="arena-success" role="status">{notice}</p>}
    <div hidden={selection.kind !== "list"} inert={selection.kind !== "list"}>
      <QuestionListPanel revision={revision} onCreate={() => { setNotice(""); setSelection({ kind: "new" }); }}
        onEdit={(slug) => { setNotice(""); setSelection({ kind: "edit", slug }); }} />
    </div>
    {selection.kind !== "list" && (
      <QuestionEditor key={selection.kind === "edit" ? selection.slug : "new"}
        slug={selection.kind === "edit" ? selection.slug : undefined}
        onCancel={() => setSelection({ kind: "list" })} onSaved={saved} />
    )}
  </>;
}

function QuestionListPanel({ onCreate, onEdit, revision }: {
  onCreate: () => void;
  onEdit: (slug: string) => void;
  revision: number;
}) {
  const [search, setSearch] = useState("");
  const [difficulty, setDifficulty] = useState("");
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
      if (difficulty) query.set("difficulty", difficulty);
      apiRequest<QuestionList>("/api/questions?" + query, { signal: controller.signal })
        .then((result) => { if (!controller.signal.aborted) setData(result); })
        .catch((cause: Error) => { if (!controller.signal.aborted) setError(cause.message); });
    }, 160);
    return () => { window.clearTimeout(timeout); controller.abort(); };
  }, [search, difficulty, page, attempt, revision]);

  function resetFilters() {
    setSearch("");
    setDifficulty("");
    setPage(1);
  }

  return <section aria-labelledby="question-list-heading">
    <div className="arena-section-head">
      <h2 className="arena-section-title" id="question-list-heading">Problem catalog</h2>
      <button className="rx-btn rx-btn-primary" type="button" onClick={onCreate}>Create problem</button>
    </div>
    <div className="arena-filterbar">
      <label className="arena-field arena-search">Search problems
        <input type="search" placeholder="Title or slug" value={search} onChange={(event) => { setPage(1); setSearch(event.target.value); }} />
      </label>
      <label className="arena-field arena-filter">Difficulty
        <select value={difficulty} onChange={(event) => { setPage(1); setDifficulty(event.target.value); }}>
          <option value="">All levels</option><option value="EASY">Easy</option><option value="MEDIUM">Medium</option><option value="HARD">Hard</option>
        </select>
      </label>
      {(search || difficulty) && <button className="rx-btn rx-btn-secondary" type="button" onClick={resetFilters}>Clear filters</button>}
    </div>
    {error ? <div className="arena-state" role="alert"><h3>Couldn’t load problems</h3><p>{error}</p>
      <button className="rx-btn rx-btn-secondary" type="button" onClick={() => setAttempt(attempt + 1)}>Retry</button>
    </div> : !data ? <div className="arena-state" role="status">Loading problems…</div>
      : !data.items.length ? <div className="arena-state">
        <h3>{search || difficulty ? "No matching problems" : "No problems yet"}</h3>
        {search || difficulty ? <button className="rx-btn rx-btn-secondary" type="button" onClick={resetFilters}>Clear filters</button>
          : <p>Create a problem to add it to the learner catalog.</p>}
      </div> : <div className="arena-table-frame">
        <table className="arena-table">
          <thead><tr><th scope="col">Problem</th><th scope="col">Difficulty</th><th scope="col" className="arena-wide-col">Topics</th><th scope="col" className="arena-column-end">Actions</th></tr></thead>
          <tbody>{data.items.map((question) => <tr key={question.id}>
            <th scope="row">{question.title}<code className="arena-slug">{question.slug}</code></th>
            <td><span className={"rx-q-difficulty rx-q-" + question.difficulty.toLowerCase()}>{question.difficulty[0] + question.difficulty.slice(1).toLowerCase()}</span></td>
            <td className="arena-wide-col"><div className="rx-q-tags">{question.tags.map((topic) => <span key={topic}>{topic}</span>)}</div></td>
            <td className="arena-column-end"><button className="rx-btn rx-btn-secondary arena-table-action" type="button" aria-label={"Edit " + question.title} onClick={() => onEdit(question.slug)}>Edit</button></td>
          </tr>)}</tbody>
        </table>
      </div>}
    {data && data.totalPages > 1 && <nav className="arena-pagination" aria-label="Admin problem pages">
      <button className="rx-btn rx-btn-secondary" type="button" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</button>
      <span aria-live="polite">Page {page} of {data.totalPages}</span>
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

  useEffect(() => { document.getElementById("question-editor-heading")?.focus(); }, []);
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
      <h2 id="question-editor-heading" className="arena-section-title" tabIndex={-1}>{slug ? "Edit problem" : "New problem"}</h2>
      <button type="button" className="rx-btn rx-btn-secondary" onClick={onCancel}>Back to catalog</button>
    </div>
    {error ? <div className="arena-state" role="alert"><p>{error}</p><button className="rx-btn rx-btn-secondary" onClick={() => setAttempt(attempt + 1)}>Retry</button></div>
      : slug && !question ? <div className="arena-state" role="status">Loading problem and test cases…</div>
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

  const fieldError = (name: string) => fields[name] && <span className={styles.fieldError} id={"error-" + name}>{fields[name]}</span>;
  const feedback = (name: string) => ({ "aria-invalid": fields[name] ? true : undefined, "aria-describedby": fields[name] ? "error-" + name : undefined });

  return <form onSubmit={save} className={styles.editor}>
    <fieldset className={"arena-panel " + styles.formGrid} disabled={saving}>
      <legend>Problem details</legend>
      <label className="arena-field">Title<input name="title" required defaultValue={question?.title} {...feedback("title")} />{fieldError("title")}</label>
      <label className="arena-field">Slug<input name="slug" required pattern="[a-z0-9]+(?:-[a-z0-9]+)*" defaultValue={question?.slug} {...feedback("slug")} />{fieldError("slug")}</label>
      <div className={"arena-field " + styles.wide}><label htmlFor="problem-statement">Statement</label><textarea id="problem-statement" name="statement" required rows={8} defaultValue={question?.statement} {...feedback("statement")} />{fieldError("statement")}</div>
      <div className="arena-field"><label htmlFor="editor-difficulty">Difficulty</label><select id="editor-difficulty" name="difficulty" defaultValue={question?.difficulty ?? "EASY"} {...feedback("difficulty")}><option value="EASY">Easy</option><option value="MEDIUM">Medium</option><option value="HARD">Hard</option></select>{fieldError("difficulty")}</div>
      <label className="arena-field">Topics (comma-separated)<input name="tags" defaultValue={question?.tags.join(", ")} {...feedback("tags")} />{fieldError("tags")}</label>
      <label className="arena-field">Time limit (seconds)<input name="timeLimit" required type="number" min="0.01" step="any" defaultValue={question?.timeLimit ?? 2} {...feedback("timeLimit")} />{fieldError("timeLimit")}</label>
      <label className="arena-field">Memory limit (KB)<input name="memoryLimit" required type="number" min="1" step="1" defaultValue={question?.memoryLimit ?? 128000} {...feedback("memoryLimit")} />{fieldError("memoryLimit")}</label>
    </fieldset>
    <fieldset className={"arena-panel " + styles.caseList} disabled={saving} {...feedback("testCases")}>
      <legend>Test cases</legend>
      <p>Sample cases are visible on the problem page. Hidden cases are used when judging submissions.</p>
      {fields.testCases && <p className="arena-error" id="error-testCases" role="alert">{fields.testCases}</p>}
      {cases.map((testCase, index) => <section className={styles.testCase} key={testCase.key} aria-label={"Case " + (index + 1)}>
        <div className={styles.caseHeader}>
          <h3>Case {index + 1}</h3>
          <label><input type="checkbox" name={"sample-" + testCase.key} defaultChecked={testCase.isSample} /> Show as sample</label>
          <button type="button" className="rx-btn rx-btn-quiet" aria-label={"Remove case " + (index + 1)} onClick={() => setCases(cases.filter(({ key }) => key !== testCase.key))}>Remove</button>
        </div>
        <div className={styles.caseFields}>
          <div className="arena-field"><label htmlFor={"input-" + testCase.key}>Input</label><textarea className="arena-code-input" id={"input-" + testCase.key} name={"input-" + testCase.key} rows={3} defaultValue={testCase.stdin} /></div>
          <div className="arena-field"><label htmlFor={"output-" + testCase.key}>Expected output</label><textarea className="arena-code-input" id={"output-" + testCase.key} name={"output-" + testCase.key} rows={3} defaultValue={testCase.expectedOutput} /></div>
        </div>
      </section>)}
      <button className="rx-btn rx-btn-secondary" type="button" onClick={() => {
        const key = nextKey.current++;
        setCases([...cases, { key, stdin: "", expectedOutput: "", isSample: false }]);
      }}>Add test case</button>
    </fieldset>
    {error && <p className="arena-error" role="alert">{error}</p>}
    <div className="arena-action-row">
    <button className="rx-btn rx-btn-primary" type="submit" disabled={saving}>{saving ? "Saving…" : question ? "Save changes" : "Create problem"}</button>
    {question && <Link className="rx-btn rx-btn-quiet" href={"/questions/" + encodeURIComponent(question.slug)}>Open public problem</Link>}
    </div>
  </form>;
}
