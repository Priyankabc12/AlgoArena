"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "./auth-client";

export function AuthCard({ initialMode = "sign-in", redirectTo = "/questions", onAuthenticated, embedded = false }: { initialMode?: "sign-in" | "sign-up"; redirectTo?: string; onAuthenticated?: () => void; embedded?: boolean }) {
  const router = useRouter();
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
        if (onAuthenticated) onAuthenticated();
        else router.replace(redirectTo);
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
      else {
        await refetch();
        if (onAuthenticated) onAuthenticated();
        else router.replace(redirectTo);
      }
    } catch {
      setError("Google sign-in did not finish. Check your popup settings and try again.");
    } finally {
      setPopupBusy(false);
    }
  }

  const Heading = embedded ? "h2" : "h1";

  return <section className="rx-auth-card" aria-labelledby="rx-auth-title">
    <Heading id="rx-auth-title">{mode === "sign-in" ? "Sign in" : "Create account"}</Heading>
    {process.env.NEXT_PUBLIC_GOOGLE_OAUTH_ENABLED === "true" && <><button className="rx-btn rx-btn-secondary rx-google" type="button" disabled={popupBusy} onClick={googleSignIn}>
      <span className="rx-google-mark" aria-hidden="true">G</span>{popupBusy ? "Connecting to Google…" : "Continue with Google"}
    </button>
    <div className="rx-divider"><span>or continue with email</span></div></>}
    <form onSubmit={submit} className="rx-form">
      {mode === "sign-up" && <label className="rx-field">Name<input autoComplete="name" required value={name} onChange={event => setName(event.target.value)} /></label>}
      <label className="rx-field">Email address<input type="email" autoComplete="email" required value={email} onChange={event => setEmail(event.target.value)} /></label>
      <label className="rx-field">Password<input type="password" minLength={8} autoComplete={mode === "sign-up" ? "new-password" : "current-password"} required value={password} onChange={event => setPassword(event.target.value)} /></label>
      {error && <p className="rx-error" role="alert">{error}</p>}
      {success && <p className="rx-success" role="status">{success}</p>}
      <button className="rx-btn rx-btn-primary rx-submit" type="submit" disabled={busy}>{busy ? "Please wait…" : mode === "sign-in" ? "Sign in" : "Create account"}</button>
    </form>
    <p className="rx-switch">{mode === "sign-in" ? "New to Algo Arena?" : "Already have an account?"} <button type="button" onClick={() => { setMode(mode === "sign-in" ? "sign-up" : "sign-in"); setError(""); setSuccess(""); }}>{mode === "sign-in" ? "Create an account" : "Sign in"}</button></p>
  </section>;
}
