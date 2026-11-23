"use client";

import Link from "next/link";
import { authClient } from "../../app/auth-client";

export default function QuestionNav() {
  const { data: session, refetch } = authClient.useSession();
  return <nav className="rx-nav rx-qnav">
    <Link className="rx-brand" href="/">ALGO<span>ARENA</span><b>®</b></Link>
    <div className="rx-nav-links"><Link href="/questions">Problems</Link><Link href="/contests">Contests</Link><Link href="/questions">Practice</Link></div>
    <div className="rx-nav-actions">{session ? <><span className="rx-user-chip">{session.user.name}</span><button className="rx-btn rx-btn-quiet" onClick={async () => { await authClient.signOut(); await refetch(); }}>Sign out</button></> : <Link className="rx-btn rx-btn-primary rx-nav-cta" href="/signin">Sign in <span>↗</span></Link>}</div>
  </nav>;
}
