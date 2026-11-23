"use client";

import Link from "next/link";
import { FormEvent, useEffect, useRef, useState } from "react";
import { authClient } from "../../app/auth-client";
import styles from "./profile.module.css";

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
const pageSize = 20;

type Profile = {
  id: string;
  name: string;
  email: string;
  createdAt: string;
};

type ProfileStats = {
  totalSubmissions: number;
  solvedQuestions: number;
};

type Submission = {
  id: string;
  language: string;
  status: string;
  createdAt: string;
  runtimeMs: number | null;
  memoryKb: number | null;
  question: { title: string; slug: string };
};

type SubmissionPage = {
  page: number;
  pageSize: number;
  hasNextPage: boolean;
  submissions: Submission[];
};

class SessionExpiredError extends Error {}

async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${apiUrl}${path}`, {
    ...init,
    credentials: "include",
    cache: "no-store",
    headers: {
      ...(init?.headers ?? {})
    }
  });

  let result: unknown;
  try {
    result = await response.json();
  } catch {
    result = null;
  }

  if (response.status === 401) throw new SessionExpiredError("Your session has expired.");
  if (!response.ok) {
    const message = result && typeof result === "object" && "error" in result && typeof result.error === "string"
      ? result.error
      : "The request could not be completed. Try again.";
    throw new Error(message);
  }

  return result as T;
}

function getInitials(name: string) {
  const words = name.trim().split(/\s+/).filter(Boolean);
  return words.slice(0, 2).map((word) => word[0]?.toUpperCase()).join("") || "U";
}

function readableVerdict(status: string) {
  const labels: Record<string, string> = {
    ACCEPTED: "Accepted",
    PENDING: "Pending",
    WRONG_ANSWER: "Wrong Answer",
    TIME_LIMIT_EXCEEDED: "Time Limit Exceeded",
    MEMORY_LIMIT_EXCEEDED: "Memory Limit Exceeded",
    COMPILATION_ERROR: "Compilation Error",
    RUNTIME_ERROR: "Runtime Error",
    INTERNAL_ERROR: "Internal Error"
  };
  return labels[status] ?? status.toLowerCase().replaceAll("_", " ");
}

function formatDate(date: string, includeTime = false) {
  const value = new Date(date);
  if (Number.isNaN(value.getTime())) return "Date unavailable";
  return new Intl.DateTimeFormat(undefined, includeTime
    ? { dateStyle: "medium", timeStyle: "short" }
    : { dateStyle: "long" }
  ).format(value);
}

export default function ProfilePage() {
  const { data: session, isPending: isSessionPending, refetch: refreshSession } = authClient.useSession();
  const sessionId = session?.user.id ?? null;
  const requestVersion = useRef(0);

  const [dataSessionId, setDataSessionId] = useState<string | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [draftName, setDraftName] = useState("");
  const [stats, setStats] = useState<ProfileStats | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [historyPage, setHistoryPage] = useState(1);
  const [accountLoading, setAccountLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [statsError, setStatsError] = useState("");
  const [historyError, setHistoryError] = useState("");
  const [accountError, setAccountError] = useState("");
  const [nameError, setNameError] = useState("");
  const [saveNotice, setSaveNotice] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isSessionExpired, setIsSessionExpired] = useState(false);
  const [accountRetry, setAccountRetry] = useState(0);
  const [statsRetry, setStatsRetry] = useState(0);
  const [historyRetry, setHistoryRetry] = useState(0);

  function clearPrivateData() {
    setProfile(null);
    setDraftName("");
    setStats(null);
    setSubmissions([]);
    setHasNextPage(false);
    setNameError("");
    setSaveNotice("");
    setDataSessionId(null);
  }

  function expireSession(version: number) {
    if (requestVersion.current !== version) return;
    requestVersion.current += 1;
    clearPrivateData();
    setAccountLoading(false);
    setStatsLoading(false);
    setHistoryLoading(false);
    setIsSessionExpired(true);
    void refreshSession({ query: { disableCookieCache: true } });
  }

  useEffect(() => {
    if (isSessionPending) return;

    const version = ++requestVersion.current;
    if (!sessionId) {
      clearPrivateData();
      setIsSessionExpired(false);
      setAccountLoading(false);
      setStatsLoading(false);
      setHistoryLoading(false);
      return;
    }

    const controller = new AbortController();
    setIsSessionExpired(false);
    clearPrivateData();
    setDataSessionId(sessionId);
    setAccountError("");
    setStatsError("");
    setHistoryError("");
    setAccountLoading(true);
    setHistoryLoading(true);
    setHistoryPage(1);

    requestJson<Profile>("/api/profile", { signal: controller.signal })
      .then((account) => {
        if (requestVersion.current !== version) return;
        setProfile(account);
        setDraftName(account.name);
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted || requestVersion.current !== version) return;
        if (error instanceof SessionExpiredError) {
          expireSession(version);
          return;
        }
        setAccountError(error instanceof Error ? error.message : "Could not load your account.");
      })
      .finally(() => {
        if (requestVersion.current === version) setAccountLoading(false);
      });

    return () => {
      controller.abort();
      if (requestVersion.current === version) requestVersion.current += 1;
    };
  }, [sessionId, isSessionPending, accountRetry]);

  useEffect(() => {
    if (isSessionPending || !sessionId || isSessionExpired) return;

    const version = requestVersion.current;
    const controller = new AbortController();
    setStatsLoading(true);
    setStatsError("");

    requestJson<ProfileStats>("/api/profile/stats", { signal: controller.signal })
      .then((data) => {
        if (requestVersion.current === version) setStats(data);
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted || requestVersion.current !== version) return;
        if (error instanceof SessionExpiredError) {
          expireSession(version);
          return;
        }
        setStatsError(error instanceof Error ? error.message : "Could not load your stats.");
      })
      .finally(() => {
        if (requestVersion.current === version) setStatsLoading(false);
      });

    return () => controller.abort();
  }, [sessionId, isSessionPending, isSessionExpired, accountRetry, statsRetry]);

  useEffect(() => {
    if (isSessionPending || !sessionId || isSessionExpired) return;

    const version = requestVersion.current;
    const controller = new AbortController();
    setHistoryLoading(true);
    setHistoryError("");

    requestJson<SubmissionPage>(`/api/profile/submissions?page=${historyPage}`, { signal: controller.signal })
      .then((data) => {
        if (requestVersion.current !== version) return;
        setSubmissions(data.submissions);
        setHasNextPage(data.hasNextPage);
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted || requestVersion.current !== version) return;
        if (error instanceof SessionExpiredError) {
          expireSession(version);
          return;
        }
        setHistoryError(error instanceof Error ? error.message : "Could not load submission history.");
      })
      .finally(() => {
        if (requestVersion.current === version) setHistoryLoading(false);
      });

    return () => controller.abort();
  }, [sessionId, isSessionPending, isSessionExpired, accountRetry, historyPage, historyRetry]);

  async function saveName(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = draftName.trim();
    setNameError("");
    setSaveNotice("");

    if (!name) {
      setNameError("Enter a display name.");
      return;
    }
    if (name.length > 50) {
      setNameError("Display name must be 50 characters or fewer.");
      return;
    }

    const version = requestVersion.current;
    setIsSaving(true);
    try {
      const updated = await requestJson<{ name: string }>("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name })
      });
      if (requestVersion.current !== version) return;

      setProfile((current) => current ? { ...current, name: updated.name } : current);
      setDraftName(updated.name);
      setSaveNotice("Display name saved.");
      await refreshSession({ query: { disableCookieCache: true } });
    } catch (error) {
      if (error instanceof SessionExpiredError) {
        expireSession(version);
      } else {
        setNameError(error instanceof Error ? error.message : "Could not save your display name. Try again.");
      }
    } finally {
      setIsSaving(false);
    }
  }

  const waitingForAccount = session && !isSessionExpired && dataSessionId !== sessionId;
  if ((isSessionPending && !isSessionExpired) || waitingForAccount) {
    return <main id="main-content" className="arena-page" tabIndex={-1}>
      <div className="arena-container"><div className="arena-state" role="status">Loading profile…</div></div>
    </main>;
  }

  if (!session || isSessionExpired) {
    return <main id="main-content" className="arena-page" tabIndex={-1}>
      <div className="arena-container">
        <header className="arena-page-heading"><h1>{isSessionExpired ? "Your session expired" : "Sign in to view your profile"}</h1></header>
        <section className="arena-state">
          <p>Sign in to see your account details, progress, and saved submissions.</p>
          <div className="arena-action-row">
            <Link className="rx-btn rx-btn-primary" href="/signin?returnTo=%2Fprofile">Sign in</Link>
            <Link className="rx-btn rx-btn-secondary" href="/questions">Browse problems</Link>
          </div>
        </section>
      </div>
    </main>;
  }

  const profileName = profile?.name ?? session.user.name;

  return <main id="main-content" className="arena-page" tabIndex={-1}>
    <div className="arena-container">
      <header className="arena-page-heading">
        <div className={styles.identity}>
          <span className={styles.avatar} aria-hidden="true">{getInitials(profileName)}</span>
          <div>
            <h1>{profileName}</h1>
            <p>{profile?.email ?? session.user.email}</p>
            {profile && <time className={"arena-meta " + styles.dates} dateTime={profile.createdAt}>Member since {formatDate(profile.createdAt)}</time>}
          </div>
        </div>
      </header>

      <dl className={styles.stats} aria-label="Practice statistics">
        <div><dt>Submissions</dt><dd>{statsLoading ? "…" : statsError ? "—" : stats?.totalSubmissions ?? 0}</dd></div>
        <div><dt>Problems solved</dt><dd>{statsLoading ? "…" : statsError ? "—" : stats?.solvedQuestions ?? 0}</dd></div>
      </dl>
      {statsLoading && <p className="arena-meta" role="status">Loading practice statistics…</p>}
      {statsError && <div className={"arena-error arena-action-row " + styles.feedback} role="alert">
        <span>{statsError}</span><button className="rx-btn rx-btn-secondary" type="button" onClick={() => setStatsRetry((value) => value + 1)}>Retry stats</button>
      </div>}

      <section className={"arena-panel " + styles.account} aria-labelledby="account-heading">
        <header className="arena-section-head"><h2 className="arena-section-title" id="account-heading">Account</h2></header>
        {profile ? <div className={styles.accountGrid}>
          <div>
            <p className="arena-meta">Email address</p>
            <strong>{profile.email}</strong>
          </div>
          <form onSubmit={saveName}>
            <div className={styles.nameControls}>
              <label className="arena-field" htmlFor="display-name">Display name
                <input id="display-name" name="name" value={draftName} maxLength={50} required
                  aria-invalid={Boolean(nameError)} aria-describedby={nameError ? "display-name-error" : undefined}
                  onChange={(event) => { setDraftName(event.target.value); setNameError(""); setSaveNotice(""); }} disabled={isSaving} />
              </label>
              <button className="rx-btn rx-btn-primary" type="submit" disabled={isSaving || draftName.trim() === profile.name}>{isSaving ? "Saving…" : "Save"}</button>
              <button className="rx-btn rx-btn-secondary" type="button" onClick={() => { setDraftName(profile.name); setNameError(""); setSaveNotice(""); }} disabled={isSaving || draftName === profile.name}>Cancel</button>
            </div>
            {nameError && <p className="arena-error" id="display-name-error" role="alert">{nameError}</p>}
            {saveNotice && <p className="arena-success" role="status">{saveNotice}</p>}
          </form>
        </div> : accountLoading ? <p className="arena-meta" role="status">Loading account details…</p> : <div className="arena-error arena-action-row" role="alert">
          <span>{accountError || "Account details are unavailable."}</span>
          <button className="rx-btn rx-btn-secondary" type="button" onClick={() => setAccountRetry((value) => value + 1)}>Retry account details</button>
        </div>}
      </section>

      <section aria-labelledby="history-heading">
        <header className="arena-section-head"><h2 className="arena-section-title" id="history-heading">Submission history</h2></header>
        {historyLoading ? <div className="arena-state" role="status">Loading submissions…</div>
          : historyError ? <div className="arena-state" role="alert">
            <h3>Couldn’t load submissions</h3><p>{historyError}</p>
            <button className="rx-btn rx-btn-secondary" type="button" onClick={() => setHistoryRetry((value) => value + 1)}>Retry history</button>
          </div>
          : submissions.length === 0 ? <div className="arena-state">
            <h3>No submissions yet</h3><p>Submit a solution to see the verdict and test results here.</p>
            <Link href="/questions" className="rx-btn rx-btn-primary">Browse problems</Link>
          </div>
          : <>
            <div className="arena-table-frame">
              <table className="arena-table">
                <thead><tr><th scope="col">Problem</th><th scope="col">Verdict</th><th scope="col" className="arena-wide-col">Language</th><th scope="col" className="arena-wide-col">Submitted</th></tr></thead>
                <tbody>{submissions.map((submission) => <tr key={submission.id}>
                  <th scope="row"><Link href={"/submissions/" + encodeURIComponent(submission.id)}>{submission.question.title}</Link>
                    <time className={"arena-meta " + styles.mobileDate} dateTime={submission.createdAt}>{formatDate(submission.createdAt, true)}</time>
                  </th>
                  <td><span className={styles.verdict + (submission.status === "ACCEPTED" ? " " + styles.accepted : "")}>{readableVerdict(submission.status)}</span></td>
                  <td className="arena-wide-col">{submission.language}</td>
                  <td className="arena-wide-col"><time className="arena-meta" dateTime={submission.createdAt}>{formatDate(submission.createdAt, true)}</time></td>
                </tr>)}</tbody>
              </table>
            </div>
            {(historyPage > 1 || hasNextPage) && <nav className="arena-pagination" aria-label="Submission history pages">
              <button className="rx-btn rx-btn-secondary" type="button" onClick={() => setHistoryPage((page) => Math.max(1, page - 1))} disabled={historyPage <= 1}>Previous</button>
              <span aria-live="polite">Page {historyPage}</span>
              <button className="rx-btn rx-btn-secondary" type="button" onClick={() => setHistoryPage((page) => page + 1)} disabled={!hasNextPage}>Next</button>
            </nav>}
          </>}
      </section>
    </div>
  </main>;
}
