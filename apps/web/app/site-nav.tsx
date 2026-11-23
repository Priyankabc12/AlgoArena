"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { authClient } from "./auth-client";

const destinations = [
  { href: "/questions", label: "Problems" },
  { href: "/playground", label: "Playground" },
  { href: "/contests", label: "Contests" }
];

export default function SiteNav() {
  const path = usePathname();
  const { data: session, isPending, refetch } = authClient.useSession();
  const [signingOut, setSigningOut] = useState(false);
  const [error, setError] = useState("");
  const links = session?.user.role === "admin"
    ? [...destinations, { href: "/admin", label: "Admin" }]
    : destinations;

  function current(href: string) {
    if (path === href) return "page";
    if (path.startsWith(href + "/") || (href === "/profile" && path.startsWith("/submissions/"))) {
      return "location";
    }
  }

  async function signOut() {
    setError("");
    setSigningOut(true);
    try {
      const result = await authClient.signOut();
      if (result.error) throw new Error();
      await refetch();
    } catch {
      setError("Could not sign out. Try again.");
    } finally {
      setSigningOut(false);
    }
  }

  return <header className="arena-header">
    <a className="arena-skip" href="#main-content">Skip to content</a>
    <div className="arena-nav">
      <Link className="rx-brand arena-brand" href="/" aria-label="AlgoArena home" aria-current={current("/")}>ALGO<span>ARENA</span></Link>
      <nav className="arena-destinations" aria-label="Main navigation">
        {links.map(({ href, label }) => <Link key={href} href={href} aria-current={current(href)}>{label}</Link>)}
      </nav>
      <div className="arena-account" role="group" aria-label="Account">
        {isPending ? <span className="arena-session-placeholder" aria-hidden="true" />
          : session ? <>
            <Link className="arena-account-link" href="/profile" aria-current={current("/profile")}>Profile</Link>
            <button className="rx-btn rx-btn-secondary" type="button" disabled={signingOut} onClick={() => void signOut()}>{signingOut ? "Signing out…" : "Sign out"}</button>
          </> : <>
            <Link className="arena-account-link" href="/signin" aria-current={current("/signin")}>Sign in</Link>
            <Link className="rx-btn rx-btn-primary" href="/signup" aria-current={current("/signup")}>Create account</Link>
          </>}
      </div>
      {error && <p className="arena-nav-error" role="alert">{error}</p>}
    </div>
  </header>;
}
