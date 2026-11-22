"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { authClient } from "./auth-client";

export function AuthCard({ initialMode = "sign-in" }: { initialMode?: "sign-in" | "sign-up" }) {
  const { refetch } = authClient.useSession();
  const [mode, setMode] = useState(initialMode);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [busy, setBusy] = useState(false);
  const [popupBusy, setPopupBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    setSuccess("");
    try {
      const response = mode === "sign-up"
        ? await authClient.signUp.email({ name: name.trim(), email: email.trim(), password })
        : await authClient.signIn.email({ email: email.trim(), password });
      if (response.error) setError(response.error.message ?? "We could not sign you in. Check your details and try again.");
      else {
        setPassword("");
        await refetch();
        setSuccess(mode === "sign-in" ? "You’re signed in. Your session is ready." : "Your account is ready. You’re signed in.");
      }
    } catch {
      setError("The authentication service could not be reached. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function googleSignIn() {
    setPopupBusy(true);
    setError("");
    try {
      const result = await authClient.signIn.popup({ provider: "google" });
      if (result.error) setError(result.error.message);
      else await refetch();
    } catch {
      setError("Google sign-in did not finish. Check your popup settings and try again.");
    } finally {
      setPopupBusy(false);
    }
  }

  return <section className="rx-auth-card rx-glass" aria-labelledby="rx-auth-title">
    <span className="rx-eyebrow">YOUR NEXT SOLVE STARTS HERE</span>
    <h2 id="rx-auth-title">{mode === "sign-in" ? <>Welcome <em>back.</em></> : <>Join the <em>arena.</em></>}</h2>
    <p className="rx-muted">Build momentum, one problem at a time.</p>
    {process.env.NEXT_PUBLIC_GOOGLE_OAUTH_ENABLED === "true" && <button className="rx-btn rx-btn-secondary rx-google" type="button" disabled={popupBusy} onClick={googleSignIn}>
      <span className="rx-google-mark" aria-hidden="true">G</span>{popupBusy ? "Connecting to Google…" : "Continue with Google"}
    </button>}
    <div className="rx-divider"><span>or continue with email</span></div>
    <form onSubmit={submit} className="rx-form">
      {mode === "sign-up" && <label className="rx-field">Name<input autoComplete="name" required value={name} onChange={event => setName(event.target.value)} /></label>}
      <label className="rx-field">Email address<input type="email" autoComplete="email" required value={email} onChange={event => setEmail(event.target.value)} /></label>
      <label className="rx-field">Password<input type="password" minLength={8} autoComplete={mode === "sign-up" ? "new-password" : "current-password"} required value={password} onChange={event => setPassword(event.target.value)} /></label>
      {error && <p className="rx-error" role="alert">{error}</p>}
      {success && <p className="rx-success" role="status">{success} <Link href="/">Continue to Algo Arena ↗</Link></p>}
      <button className="rx-btn rx-btn-primary rx-submit" type="submit" disabled={busy}>{busy ? "Please wait…" : mode === "sign-in" ? "Sign in" : "Create account"}<span aria-hidden="true">↗</span></button>
    </form>
    <p className="rx-switch">{mode === "sign-in" ? "New to Algo Arena?" : "Already have an account?"} <button type="button" onClick={() => { setMode(mode === "sign-in" ? "sign-up" : "sign-in"); setError(""); setSuccess(""); }}>{mode === "sign-in" ? "Create an account" : "Sign in"}</button></p>
  </section>;
}
