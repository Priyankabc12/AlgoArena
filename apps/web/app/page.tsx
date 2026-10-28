"use client";

import { FormEvent, useState } from "react";

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export default function Home() {
  const [sourceCode, setSourceCode] = useState('print("Hello, world!")');
  const [languageId, setLanguageId] = useState(71);
  const [stdin, setStdin] = useState("");
  const [result, setResult] = useState("Run some code to see its result.");
  const [isRunning, setIsRunning] = useState(false);

  async function run(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsRunning(true);

    try {
      const response = await fetch(`${apiUrl}/execute`, {
        method: "POST",
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

  return <main><h1>Coding Practice</h1><p>Run code with local Judge0.</p><form onSubmit={run}><label>Judge0 language ID<input type="number" value={languageId} onChange={(event) => setLanguageId(Number(event.target.value))} /></label><label>Source code<textarea value={sourceCode} onChange={(event) => setSourceCode(event.target.value)} rows={12} /></label><label>Standard input<textarea value={stdin} onChange={(event) => setStdin(event.target.value)} rows={4} /></label><button disabled={isRunning}>{isRunning ? "Running…" : "Run code"}</button></form><pre>{result}</pre></main>;
}
