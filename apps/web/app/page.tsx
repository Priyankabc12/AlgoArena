"use client";

import { FormEvent, useState } from "react";
import { authClient } from "./auth-client";

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export default function Home() {
  const { data: session, isPending: isSessionPending } = authClient.useSession();
  const [authMode, setAuthMode] = useState<"sign-in" | "sign-up">("sign-in");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [sourceCode, setSourceCode] = useState('print("Hello, world!")');
  const [languageId, setLanguageId] = useState(71);
  const [stdin, setStdin] = useState("");
  const [result, setResult] = useState("Run some code to see its result.");
  const [isRunning, setIsRunning] = useState(false);

  async function authenticate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAuthError("");

    const response = authMode === "sign-up"
      ? await authClient.signUp.email({ name, email, password })
      : await authClient.signIn.email({ email, password });

    if (response.error) setAuthError(response.error.message ?? "Authentication failed.");
    else setPassword("");
  }

  async function run(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsRunning(true);

    try {
      const response = await fetch(`${apiUrl}/execute`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source_code: sourceCode, language_id: languageId, stdin })
      });
      setResult(JSON.stringify(await response.json(), null, 2));
    } catch {
      setResult("The API is unavailable. Start the API and Judge0, then try again.");
    } finally {
      setIsRunning(false);
    }
  }

  return (
    <main>
      <h1>Coding Practice</h1>
      {isSessionPending ? <p>Checking your session…</p> : session ? (
        <section className="auth-panel">
          <p>Signed in as <strong>{session.user.name}</strong> ({session.user.email})</p>
          <button type="button" onClick={() => authClient.signOut()}>Sign out</button>
        </section>
      ) : (
        <section className="auth-panel">
          <h2>{authMode === "sign-in" ? "Sign in" : "Create account"}</h2>
          <form onSubmit={authenticate}>
            {authMode === "sign-up" && <label>Name<input required value={name} onChange={(event) => setName(event.target.value)} /></label>}
            <label>Email<input required type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} /></label>
            <label>Password<input required type="password" minLength={8} autoComplete={authMode === "sign-up" ? "new-password" : "current-password"} value={password} onChange={(event) => setPassword(event.target.value)} /></label>
            {authError && <p className="error" role="alert">{authError}</p>}
            <button>{authMode === "sign-in" ? "Sign in" : "Sign up"}</button>
          </form>
          <button className="link-button" type="button" onClick={() => { setAuthMode(authMode === "sign-in" ? "sign-up" : "sign-in"); setAuthError(""); }}>
            {authMode === "sign-in" ? "Need an account? Sign up" : "Already registered? Sign in"}
          </button>
        </section>
      )}

      <h2>Run code</h2>
      {!session && !isSessionPending && <p>Sign in to execute code.</p>}
      <form onSubmit={run}>
        <label>Judge0 language ID<input type="number" value={languageId} onChange={(event) => setLanguageId(Number(event.target.value))} /></label>
        <label>Source code<textarea value={sourceCode} onChange={(event) => setSourceCode(event.target.value)} rows={12} /></label>
        <label>Standard input<textarea value={stdin} onChange={(event) => setStdin(event.target.value)} rows={4} /></label>
        <button disabled={isRunning || !session}>{isRunning ? "Running…" : "Run"}</button>
      </form>
      <pre>{result}</pre>
    </main>
  );
}
