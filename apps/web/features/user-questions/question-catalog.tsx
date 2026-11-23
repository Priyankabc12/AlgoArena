"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { authClient } from "../../app/auth-client";
import QuestionNav from "./question-nav";

import { apiRequest } from "../../app/api-request";
import type { QuestionItem, QuestionList, SubmissionSummary } from "./question-types";

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

function difficultyClass(difficulty: string) {
  return `rx-q-difficulty rx-q-${difficulty.toLowerCase()}`;
}

export default function QuestionCatalog() {
  const { data: session } = authClient.useSession();
  const [search, setSearch] = useState("");
  const [difficulty, setDifficulty] = useState("");
  const [tag, setTag] = useState("");
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<QuestionItem[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [solved, setSolved] = useState<{ userId: string | undefined; slugs: Set<string> } | null>(null);
  const tags = useMemo(() => Array.from(new Set(items.flatMap(question => question.tags))).sort(), [items]);

  useEffect(() => {
    const controller = new AbortController();
    const timeout = window.setTimeout(async () => {
      setLoading(true);
      setError("");
      const params = new URLSearchParams({ limit: "50", page: String(page) });
      if (search.trim()) params.set("search", search.trim());
      if (difficulty) params.set("difficulty", difficulty);
      if (tag) params.set("tag", tag);
      try {
        const response = await fetch(`${apiUrl}/api/questions?${params}`, { signal: controller.signal, credentials: "include" });
        if (!response.ok) throw new Error("Could not load questions. Try refreshing the page.");
        const data = await response.json() as QuestionList;
        setItems(data.items);
        setTotal(data.total);
        setTotalPages(data.totalPages);
      } catch (fetchError) {
        if (!controller.signal.aborted) setError(fetchError instanceof Error ? fetchError.message : "Could not load questions.");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 180);
    return () => { window.clearTimeout(timeout); controller.abort(); };
  }, [search, difficulty, tag, page]);

  useEffect(() => {
    const userId = session?.user.id;
    if (!userId) return;
    const controller = new AbortController();

    async function loadSolved() {
      const slugs = new Set<string>();
      let currentPage = 1;
      let pages = 1;
      do {
        const data = await apiRequest<{ items: SubmissionSummary[]; totalPages: number }>(
          "/api/submissions?limit=100&page=" + currentPage, { signal: controller.signal }
        );
        for (const item of data.items) {
          if (item.status === "ACCEPTED") slugs.add(item.question.slug);
        }
        pages = data.totalPages;
        currentPage += 1;
      } while (!controller.signal.aborted && currentPage <= pages);
      if (!controller.signal.aborted) setSolved({ userId, slugs });
    }

    void loadSolved().catch(() => undefined);
    return () => controller.abort();
  }, [session?.user.id]);

  function clearFilters() { setSearch(""); setDifficulty(""); setTag(""); setPage(1); }

  return <main className="rx-qpage">
    <QuestionNav />
    <section className="rx-qcontent">
      <div className="rx-qheading"><div><span className="rx-eyebrow">THE PRACTICE SET</span><h1>Problems <em>to solve.</em></h1><p>Choose a challenge and work through it at your own pace.</p></div><div className="rx-q-total"><strong>{total}</strong><span>PROBLEMS</span></div></div>
      <div className="rx-qtoolbar"><label className="rx-q-search"><span aria-hidden="true">⌕</span><input type="search" value={search} onChange={event => { setSearch(event.target.value); setPage(1); }} placeholder="Search by title or keyword" aria-label="Search questions" /></label>
        <label className="rx-q-select"><span>Difficulty</span><select value={difficulty} onChange={event => { setDifficulty(event.target.value); setPage(1); }}><option value="">All levels</option><option value="EASY">Easy</option><option value="MEDIUM">Medium</option><option value="HARD">Hard</option></select></label>
        <label className="rx-q-select"><span>Topic</span><select value={tag} onChange={event => { setTag(event.target.value); setPage(1); }}><option value="">All topics</option>{tags.map(currentTag => <option key={currentTag} value={currentTag}>{currentTag}</option>)}</select></label>
        {(search || difficulty || tag) && <button className="rx-q-clear" type="button" onClick={clearFilters}>Clear filters</button>}
      </div>
      <div className="rx-q-table-wrap">
        {error ? <div className="rx-q-empty"><h2>Questions aren’t available</h2><p>{error}</p><button className="rx-btn rx-btn-secondary" onClick={clearFilters}>Clear filters</button></div> : loading ? <div className="rx-q-loading" role="status">Loading questions…</div> : items.length === 0 ? <div className="rx-q-empty"><h2>No matching questions</h2><p>Try a different search or clear the filters.</p><button className="rx-btn rx-btn-secondary" onClick={clearFilters}>Clear filters</button></div> : <table className="rx-q-table"><thead><tr><th scope="col">Status</th><th scope="col">Title</th><th scope="col">Difficulty</th><th scope="col">Topics</th><th scope="col">Time</th></tr></thead><tbody>{items.map(question => <tr key={question.id}><td className="rx-q-index">{solved?.userId === session?.user.id && solved?.slugs.has(question.slug) ? <span className="rx-q-solved" aria-label="Solved">✓</span> : <span aria-label="Not solved">○</span>}</td><td><Link href={`/questions/${question.slug}`} className="rx-q-title">{question.title}<span aria-hidden="true">↗</span></Link></td><td><span className={difficultyClass(question.difficulty)}>{question.difficulty[0] + question.difficulty.slice(1).toLowerCase()}</span></td><td><div className="rx-q-tags">{question.tags.map(currentTag => <span key={currentTag}>{currentTag}</span>)}</div></td><td className="rx-q-time">{question.timeLimit}s</td></tr>)}</tbody></table>}
      </div>
      {!loading && !error && totalPages > 1 && <nav className="rx-q-pagination" aria-label="Question pages"><button className="rx-btn rx-btn-secondary" disabled={page <= 1} onClick={() => setPage(page - 1)}>← Previous</button><span>Page {page} of {totalPages}</span><button className="rx-btn rx-btn-secondary" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>Next →</button></nav>}
      <p className="rx-q-footnote">Showing {items.length} of {total} questions</p>
    </section>
  </main>;
}
