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

  if (isSessionPending && !isSessionExpired) {
    return (
      <main className={styles.page}>
        <div className={styles.loadingScreen} role="status">Checking your session…</div>
      </main>
    );
  }

  if (session && !isSessionExpired && dataSessionId !== sessionId) {
    return (
      <main className={styles.page}>
        <div className={styles.loadingScreen} role="status">Loading your private profile…</div>
      </main>
    );
  }

  if (!session || isSessionExpired) {
    return (
      <main className={styles.page}>
        <header className={styles.topbar}>
          <Link className={styles.brand} href="/" aria-label="AlgoArena home"><span className={styles.brandMark}>A</span>AlgoArena</Link>
          <nav className={styles.navLinks} aria-label="Main navigation"><Link href="/questions">Problems</Link></nav>
        </header>
        <section className={styles.signedOutCard}>
          <span className={styles.eyebrow}>YOUR PRACTICE, IN ONE PLACE</span>
          <h1>{isSessionExpired ? "Your session expired" : "Sign in to view your profile"}</h1>
          <p>Your account details, progress, and submission history are private to you.</p>
          <Link className={styles.primaryLink} href="/signin?returnTo=%2Fprofile">Sign in to AlgoArena <span aria-hidden="true">→</span></Link>
          <Link className={styles.secondaryLink} href="/">Back to home</Link>
        </section>
      </main>
    );
  }

  return (
    <main className={styles.page}>
      <header className={styles.topbar}>
        <div className={styles.topbarInner}>
          <Link className={styles.brand} href="/" aria-label="AlgoArena home"><span className={styles.brandMark}>A</span>AlgoArena</Link>
          <nav className={styles.navLinks} aria-label="Main navigation">
            <Link href="/questions">Problems</Link>
            <Link className={styles.activeNav} href="/profile" aria-current="page">Profile</Link>
          </nav>
          <div className={styles.userMenu}>
            <span className={styles.userInitial}>{getInitials(profile?.name ?? session.user.name)}</span>
            <span className={styles.topbarName}>{profile?.name ?? session.user.name}</span>
            <button className={styles.signOutButton} type="button" onClick={() => { void authClient.signOut(); }}>Sign out</button>
          </div>
        </div>
      </header>

      <div className={styles.content}>
        <div className={styles.breadcrumb}><Link href="/">Home</Link><span aria-hidden="true">/</span><span>Profile</span></div>

        <section className={styles.profileHero} aria-labelledby="profile-heading">
          <div className={styles.avatar} aria-hidden="true">{getInitials(profile?.name ?? session.user.name)}</div>
          <div className={styles.heroCopy}>
            <span className={styles.eyebrow}>ACCOUNT OVERVIEW</span>
            {accountLoading ? <div className={styles.skeletonTitle} aria-label="Loading account" /> : (
              <h1 id="profile-heading">{profile?.name ?? "Your profile"}</h1>
            )}
            <p>{profile?.email ?? session.user.email}</p>
            <div className={styles.memberLine}>
              <span className={styles.memberDot} aria-hidden="true" />
              {profile ? `Member since ${formatDate(profile.createdAt)}` : "Private account"}
            </div>
          </div>
          <div className={styles.heroBadge}><span aria-hidden="true">◆</span> MEMBER</div>
        </section>

        {accountError && (
          <div className={styles.inlineError} role="alert">
            <span>{accountError}</span>
            <button type="button" onClick={() => setAccountRetry((value) => value + 1)}>Retry account load</button>
          </div>
        )}

        <section className={styles.statsGrid} aria-label="Practice statistics">
          <article className={styles.statCard}>
            <span className={styles.statIcon} aria-hidden="true">↗</span>
            <div><p className={styles.statLabel}>SUBMISSIONS</p>
              {statsLoading ? <div className={styles.skeletonValue} aria-label="Loading submissions" /> : statsError ? <span className={styles.statUnavailable}>Unavailable</span> : <p className={styles.statValue}>{stats?.totalSubmissions ?? 0}</p>}
            </div>
            <span className={styles.statFootnote}>All attempts</span>
          </article>
          <article className={`${styles.statCard} ${styles.solvedCard}`}>
            <span className={`${styles.statIcon} ${styles.solvedIcon}`} aria-hidden="true">✓</span>
            <div><p className={styles.statLabel}>PROBLEMS SOLVED</p>
              {statsLoading ? <div className={styles.skeletonValue} aria-label="Loading solved problems" /> : statsError ? <span className={styles.statUnavailable}>Unavailable</span> : <p className={styles.statValue}>{stats?.solvedQuestions ?? 0}</p>}
            </div>
            <span className={styles.statFootnote}>Unique problems</span>
          </article>
          <aside className={styles.statsNote}>
            <span className={styles.noteIcon} aria-hidden="true">✦</span>
            <p>Every attempt is a step forward. Keep practicing and your progress will grow here.</p>
          </aside>
        </section>
        {statsError && <div className={styles.retryLine}><span role="alert">Stats couldn’t be loaded: {statsError}</span><button type="button" onClick={() => setStatsRetry((value) => value + 1)}>Retry stats</button></div>}

        <section className={styles.accountPanel} aria-labelledby="account-heading">
          <div className={styles.sectionHeader}>
            <div><span className={styles.eyebrow}>PERSONAL DETAILS</span><h2 id="account-heading">Account</h2></div>
            <span className={styles.privateBadge}><span aria-hidden="true">●</span> Private</span>
          </div>
          {profile ? (
            <div className={styles.accountGrid}>
              <div className={styles.readonlyField}><span className={styles.fieldLabel}>Email address</span><span className={styles.readonlyValue}>{profile.email}</span><span className={styles.fieldHint}>Email is managed by your account settings.</span></div>
              <form className={styles.nameForm} onSubmit={saveName}>
                <label className={styles.fieldLabel} htmlFor="display-name">Display name</label>
                <div className={styles.nameControls}>
                  <input id="display-name" name="name" value={draftName} maxLength={50} onChange={(event) => { setDraftName(event.target.value); setNameError(""); setSaveNotice(""); }} disabled={isSaving} />
                  <button className={styles.saveButton} type="submit" disabled={isSaving || draftName.trim() === profile.name}>{isSaving ? "Saving…" : "Save"}</button>
                  <button className={styles.cancelButton} type="button" onClick={() => { setDraftName(profile.name); setNameError(""); setSaveNotice(""); }} disabled={isSaving || draftName === profile.name}>Cancel</button>
                </div>
                {nameError && <p className={styles.fieldError} role="alert">{nameError}</p>}
                {saveNotice && <p className={styles.saveSuccess} role="status">{saveNotice}</p>}
                {!nameError && !saveNotice && <p className={styles.fieldHint}>Choose a name up to 50 characters.</p>}
              </form>
            </div>
          ) : accountLoading ? <p className={styles.loadingInline} role="status">Loading account details…</p> : <p className={styles.loadingInline}>Account details are unavailable. Retry to try again.</p>}
        </section>

        <section className={styles.historyPanel} aria-labelledby="history-heading">
          <div className={styles.sectionHeader}>
            <div><span className={styles.eyebrow}>YOUR CODING PRACTICE</span><h2 id="history-heading">Submission history</h2></div>
            {!historyLoading && !historyError && <span className={styles.pageCount}>Page {historyPage}</span>}
          </div>

          {historyLoading ? (
            <div className={styles.historyLoading} role="status"><span className={styles.spinner} aria-hidden="true" />Loading submissions…</div>
          ) : historyError ? (
            <div className={styles.historyMessage}>
              <p role="alert">Couldn’t load submission history: {historyError}</p>
              <button className={styles.secondaryButton} type="button" onClick={() => setHistoryRetry((value) => value + 1)}>Retry history</button>
            </div>
          ) : submissions.length === 0 ? (
            <div className={styles.emptyState}>
              <span className={styles.emptyIcon} aria-hidden="true">⌁</span>
              <h3>No submissions yet</h3>
              <p>When you submit a solution, it will appear here.</p>
              <Link href="/questions" className={styles.secondaryButton}>Browse problems</Link>
            </div>
          ) : (
            <>
              <div className={styles.tableWrap}>
                <table className={styles.historyTable}>
                  <thead><tr><th scope="col">Problem</th><th scope="col">Language</th><th scope="col">Verdict</th><th scope="col">Submitted</th></tr></thead>
                  <tbody>{submissions.map((submission) => (
                    <tr key={submission.id}>
                      <td className={styles.problemTitle}><Link href={"/submissions/" + encodeURIComponent(submission.id)}>{submission.question.title}</Link></td>
                      <td><span className={styles.languageTag}>{submission.language}</span></td>
                      <td><span className={`${styles.verdict} ${submission.status === "ACCEPTED" ? styles.accepted : ""}`}><span className={styles.verdictDot} aria-hidden="true" />{readableVerdict(submission.status)}</span></td>
                      <td className={styles.dateCell}>{formatDate(submission.createdAt, true)}</td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
              <div className={styles.mobileHistory}>
                {submissions.map((submission) => (
                  <article className={styles.mobileSubmission} key={submission.id}>
                    <div className={styles.mobileSubmissionTop}><strong><Link href={"/submissions/" + encodeURIComponent(submission.id)}>{submission.question.title}</Link></strong><span className={`${styles.verdict} ${submission.status === "ACCEPTED" ? styles.accepted : ""}`}><span className={styles.verdictDot} aria-hidden="true" />{readableVerdict(submission.status)}</span></div>
                    <div className={styles.mobileSubmissionMeta}><span>{submission.language}</span><time dateTime={submission.createdAt}>{formatDate(submission.createdAt, true)}</time></div>
                  </article>
                ))}
              </div>
              <nav className={styles.pagination} aria-label="Submission history pages">
                <button className={styles.pageButton} type="button" onClick={() => setHistoryPage((page) => Math.max(1, page - 1))} disabled={historyPage <= 1}>← Previous</button>
                <span aria-live="polite">Page {historyPage}</span>
                <button className={styles.pageButton} type="button" onClick={() => setHistoryPage((page) => page + 1)} disabled={!hasNextPage}>Next →</button>
              </nav>
            </>
          )}
        </section>

        <footer className={styles.footer}><span>ALGOARENA</span><span>Progress is built one problem at a time.</span><Link href="/questions">Explore problems</Link></footer>
      </div>
    </main>
  );
}
