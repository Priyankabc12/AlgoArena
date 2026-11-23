"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { authClient } from "./auth-client";
import { AuthCard } from "./auth-card";

export default function Home() {
  const { data: session, refetch } = authClient.useSession();
  const [showAuth, setShowAuth] = useState(false);
  const [authMode, setAuthMode] = useState<"sign-in" | "sign-up">("sign-in");
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showAuth) return;
    const modal = modalRef.current;
    const focusable = () =>
      Array.from(
        modal?.querySelectorAll<HTMLElement>(
          "a[href], button:not(:disabled), input:not(:disabled)"
        ) ?? []
      );

    focusable()[0]?.focus();

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setShowAuth(false);
      if (event.key !== "Tab") return;

      const items = focusable();
      if (!items.length) return;

      const first = items[0];
      const last = items[items.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [showAuth]);

  return <main className="rx-shell">
    <nav className="rx-nav"><Link className="rx-brand" href="/">ALGO<span>ARENA</span><b>®</b></Link><div className="rx-nav-links"><Link href="/questions">Problems</Link><Link href="/contests">Contests</Link><Link href="/questions">Practice</Link><Link href="/playground">Playground</Link><a href="#docs">Docs</a></div>
      <div className="rx-nav-actions">{session ? <><Link className="rx-user-chip" href="/profile" aria-label="Profile">{session.user.name}</Link>{session.user.role === "admin" && <Link className="rx-btn rx-btn-quiet" href="/admin">Admin</Link>}<button className="rx-btn rx-btn-quiet" onClick={async () => { await authClient.signOut(); await refetch(); }}>Sign out</button></> : <><Link className="rx-btn rx-btn-quiet" href="/signin" onClick={event => { event.preventDefault(); setAuthMode("sign-in"); setShowAuth(true); }}>Sign in</Link><Link className="rx-btn rx-btn-primary rx-nav-cta" href="/signup" onClick={event => { event.preventDefault(); setAuthMode("sign-up"); setShowAuth(true); }}>Get started <span>↗</span></Link></>}</div>
    </nav>

    <section className="rx-hero"><div className="rx-orbit rx-orbit-one"/><div className="rx-orbit rx-orbit-two"/><span className="rx-eyebrow">THE SPACE TO THINK IN CODE</span><h1>Make your next<br/><em>breakthrough.</em></h1><p>Sharpen your problem-solving instincts in a focused arena built for curious minds and ambitious builders.</p><div className="rx-hero-actions"><Link className="rx-btn rx-btn-primary" href="/questions">Start practicing <span>↗</span></Link><Link className="rx-btn rx-btn-secondary" href="/questions">Explore problems</Link></div>
      <div className="rx-preview rx-glass"><div className="rx-preview-top"><span><i/> LIVE WORKSPACE</span><span>PYTHON 3.11</span></div><div className="rx-preview-body"><div className="rx-preview-line"><b>01</b><code><i>def</i> solve<span>(</span>nums<span>):</span></code></div><div className="rx-preview-line"><b>02</b><code>&nbsp;&nbsp;<i>return</i> max<span>(</span>nums<span>)</span></code></div><div className="rx-preview-line"><b>03</b><code/></div><div className="rx-preview-status"><span>✓ All systems ready</span><strong>● 1,284 tests passed</strong></div></div></div>
      <div className="rx-float rx-float-a"><span>ACCEPTANCE</span><strong>98.6%</strong><small>↑ 4.2% this week</small></div><div className="rx-float rx-float-b"><span>STREAK</span><strong>07 <small>DAYS</small></strong></div>
    </section>

    <section className="rx-stats"><div><span>01 / PRACTICE</span><strong>Curated challenges</strong></div><div><span>02 / MOMENTUM</span><strong>Visible progress</strong></div><div><span>03 / COMMUNITY</span><strong>Better together</strong></div></section>
    <section className="rx-workspace" id="docs"><header className="rx-section-heading"><div><span className="rx-eyebrow">READY WHEN YOU ARE</span><h2>Pick a problem.<br/><em>Find your flow.</em></h2></div><Link className="rx-btn rx-btn-primary" href="/questions">Browse questions <span>↗</span></Link></header></section>
    {showAuth && <div className="rx-modal-backdrop" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) setShowAuth(false); }}><div className="rx-modal" ref={modalRef} role="dialog" aria-modal="true" aria-label={authMode === "sign-in" ? "Sign in to Algo Arena" : "Create an Algo Arena account"}><button className="rx-modal-close" onClick={() => setShowAuth(false)} aria-label="Close sign in">×</button><AuthCard initialMode={authMode}/></div></div>}
    <footer className="rx-footer"><Link className="rx-brand" href="/">ALGO<span>ARENA</span><b>®</b></Link><Link href="/playground">Code playground</Link><span>© 2026 Algo Arena</span></footer>
  </main>;
}
