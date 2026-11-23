"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { authClient } from "../../app/auth-client";
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
  const [topics, setTopics] = useState<string[]>([]);
  const [retry, setRetry] = useState(0);

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
        if (!search.trim() && !difficulty && !tag) {
          setTopics((current) => Array.from(new Set([...current, ...data.items.flatMap((question) => question.tags)])).sort());
        }
        setTotal(data.total);
        setTotalPages(data.totalPages);
      } catch (fetchError) {
        if (!controller.signal.aborted) setError(fetchError instanceof Error ? fetchError.message : "Could not load questions.");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 180);
    return () => { window.clearTimeout(timeout); controller.abort(); };
  }, [search, difficulty, tag, page, retry]);

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

  const filtered = Boolean(search || difficulty || tag);

  return <main id="main-content" className="arena-page" tabIndex={-1}>
    <div className="arena-container">
      <header className="arena-page-heading">
        <div><h1>Problems</h1><p>Choose a problem, test a solution, and submit it for judging.</p></div>
        {!loading && !error && <span className="arena-meta" aria-live="polite">{total} {total === 1 ? "problem" : "problems"}</span>}
      </header>
      <div className="arena-filterbar">
        <label className="arena-field arena-search">Search problems
          <input type="search" value={search} onChange={event => { setSearch(event.target.value); setPage(1); }} placeholder="Title or slug" />
        </label>
        <label className="arena-field arena-filter">Difficulty
          <select value={difficulty} onChange={event => { setDifficulty(event.target.value); setPage(1); }}>
            <option value="">All levels</option><option value="EASY">Easy</option><option value="MEDIUM">Medium</option><option value="HARD">Hard</option>
          </select>
        </label>
        <label className="arena-field arena-filter">Topic
          <select value={tag} onChange={event => { setTag(event.target.value); setPage(1); }}>
            <option value="">All topics</option>{topics.map(topic => <option key={topic} value={topic}>{topic}</option>)}
          </select>
        </label>
        {filtered && <button className="rx-btn rx-btn-secondary" type="button" onClick={clearFilters}>Clear filters</button>}
      </div>
      {error ? <div className="arena-state" role="alert"><h2>Couldn’t load problems</h2><p>{error}</p>
        <button className="rx-btn rx-btn-secondary" type="button" onClick={() => setRetry(retry + 1)}>Retry</button>
      </div> : loading ? <div className="arena-state" role="status">Loading problems…</div>
        : items.length === 0 ? <div className="arena-state">
          <h2>{filtered ? "No matching problems" : "No problems yet"}</h2>
          {filtered && <><p>Try a different search or reset the filters.</p><button className="rx-btn rx-btn-secondary" type="button" onClick={clearFilters}>Clear filters</button></>}
        </div> : <div className="arena-table-frame">
          <table className="arena-table">
            <thead><tr><th scope="col">Problem</th><th scope="col">Difficulty</th><th scope="col" className="arena-wide-col">Topics</th><th scope="col" className="arena-wide-col">Time limit</th>{session && <th scope="col" className="arena-column-end">Progress</th>}</tr></thead>
            <tbody>{items.map(question => <tr key={question.id}>
              <th scope="row"><Link href={"/questions/" + encodeURIComponent(question.slug)}>{question.title}</Link></th>
              <td><span className={difficultyClass(question.difficulty)}>{question.difficulty[0] + question.difficulty.slice(1).toLowerCase()}</span></td>
              <td className="arena-wide-col"><div className="rx-q-tags">{question.tags.map(topic => <span key={topic}>{topic}</span>)}</div></td>
              <td className="arena-wide-col arena-meta">{question.timeLimit} s</td>
              {session && <td className="arena-column-end">{solved?.userId === session.user.id ? (solved.slugs.has(question.slug) ? <span className="arena-text-success">Solved</span> : <span className="arena-muted">Unsolved</span>) : <span className="arena-muted">—</span>}</td>}
            </tr>)}</tbody>
          </table>
        </div>}
      {!loading && !error && totalPages > 1 && <nav className="arena-pagination" aria-label="Problem pages">
        <button className="rx-btn rx-btn-secondary" type="button" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</button>
        <span aria-live="polite">Page {page} of {totalPages}</span>
        <button className="rx-btn rx-btn-secondary" type="button" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>Next</button>
      </nav>}
    </div>
  </main>;
}
