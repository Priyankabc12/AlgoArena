import Link from "next/link";
import { useState } from "react";
import { statusLabel, type CaseResult, type ExecutionResponse, type QuestionDetail } from "./question-types";
import styles from "./workspace.module.css";

export type ExecutionIssue = { title: string; hint: string; submissionId?: string };

type Sample = QuestionDetail["sampleTestCases"][number];
type Props = {
  view: "samples" | "result";
  samples: Sample[];
  busy: ExecutionResponse["mode"] | null;
  report: { result: ExecutionResponse } | { issue: ExecutionIssue } | null;
};

export function WorkspaceResults({ view, samples, busy, report }: Props) {
  if (view === "samples") return <SampleCases samples={samples} />;
  if (busy) return <div className={styles.feedback} role="status">
    <h3>{busy === "run" ? "Running the sample cases…" : "Judging your submission…"}</h3>
    <p>{busy === "run" ? "Your output is being compared with the expected answers." : "Your code is being checked against the sample and hidden cases."}</p>
  </div>;
  if (!report) return <div className={styles.feedback}>
    <h3>No result yet</h3>
    <p><strong>Run samples</strong> to check the visible examples. <strong>Submit solution</strong> to check all cases and save an attempt.</p>
  </div>;
  if ("issue" in report) return <div className={styles.feedback} role="alert">
    <h3 className={styles.failure}>{report.issue.title}</h3>
    <p>{report.issue.hint}</p>
    {report.issue.submissionId && <Link className="arena-link" href={"/submissions/" + encodeURIComponent(report.issue.submissionId)}>View saved attempt</Link>}
  </div>;
  return <CaseResults result={report.result} samples={samples} />;
}

function SampleCases({ samples }: { samples: Sample[] }) {
  const [position, setPosition] = useState(samples[0]?.position);
  const sample = samples.find((item) => item.position === position);
  if (!sample) return <p className={styles.muted}>This problem has no published sample cases.</p>;

  return <>
    <div className={styles.casePills} role="group" aria-label="Choose a sample">
      {samples.map((item, index) => <button key={item.position} type="button" aria-pressed={item.position === position} onClick={() => setPosition(item.position)}>Sample {index + 1}</button>)}
    </div>
    <dl className={styles.values}>
      <Value label="Input" value={sample.stdin} />
      <Value label="Expected output" value={sample.expectedOutput} />
    </dl>
  </>;
}

function CaseResults({ result, samples }: { result: ExecutionResponse; samples: Sample[] }) {
  const defaultCase = result.status === "ACCEPTED" ? result.results[0]
    : result.results.find((item) => item.isSample && item.status === result.status)
      ?? result.results.find((item) => item.status === result.status)
      ?? result.results[0];
  const [position, setPosition] = useState(defaultCase?.position);
  const selected = result.results.find((item) => item.position === position);
  const sampleNumber = (item: CaseResult) => samples.findIndex((sample) => sample.position === item.position) + 1 || item.position + 1;
  const caseName = (item: CaseResult) => item.isSample ? "Sample " + sampleNumber(item) : "Hidden case " + (item.position + 1);

  return <>
    <div className={styles.verdict} role="status">
      <h3 className={result.status === "ACCEPTED" ? styles.success : styles.failure}>{statusLabel(result.status)}</h3>
      <p>{result.passed} / {result.total} {result.mode === "run" ? "sample cases passed" : "test cases passed"}</p>
      {result.runtimeMs !== null && <span>Runtime {result.runtimeMs} ms</span>}
      {result.memoryKb !== null && <span>Memory {result.memoryKb} KB</span>}
    </div>
    {result.submissionId && <p className={styles.saved}><Link className="arena-link" href={"/submissions/" + encodeURIComponent(result.submissionId)}>View saved submission</Link></p>}
    <div className={styles.casePills} role="group" aria-label="Choose a result">
      {result.results.map((item) => <button key={item.position} type="button" aria-pressed={item.position === position}
        data-verdict={item.status === "ACCEPTED" ? "pass" : "fail"} onClick={() => setPosition(item.position)}>
        {caseName(item)}<span className={styles.srOnly}>{", " + statusLabel(item.status)}</span>
      </button>)}
    </div>
    {selected && <CaseDetails testCase={selected} name={caseName(selected)} />}
  </>;
}

function getHint(status: CaseResult["status"], diagnostic: string) {
  if (status === "RUNTIME_ERROR") {
    if (/^EOFError:/m.test(diagnostic)) {
      return "Your program tried to read more input than this case supplied. Check how many times you call input(). sys.stdin.read() consumes all remaining input.";
    }
    if (/^ValueError: invalid literal for int\(\)/m.test(diagnostic)) {
      return "Check that the value passed to int() is one number. If the input has several numbers on one line, split the line before converting them.";
    }
    return diagnostic
      ? "Your program stopped with an exception. Check the failing line below, then run the sample again."
      : "Your program stopped unexpectedly. Check how it handles the sample input, then run it again.";
  }
  return {
    PENDING: "This case is still waiting to be judged.",
    ACCEPTED: "Your output matched the expected output.",
    WRONG_ANSWER: "Your code ran, but the output differs from the expected answer. Compare them below and check for extra prompts or debug prints.",
    TIME_LIMIT_EXCEEDED: "Your program ran out of time. Check for loops that never finish or repeated work on large inputs.",
    MEMORY_LIMIT_EXCEEDED: "Your program used more memory than allowed. Check how much data you keep in memory at once.",
    COMPILATION_ERROR: "Python could not parse your code. Check the indicated line and the lines just above it for syntax or indentation errors.",
    INTERNAL_ERROR: "The judge could not finish this case. Try running again."
  }[status];
}

function CaseDetails({ testCase, name }: { testCase: CaseResult; name: string }) {
  const { status, isSample } = testCase;
  // Older API responses can contain a Python diagnostic in actualOutput.
  const reported = testCase.actualOutput ?? "";
  const legacyDiagnostic = testCase.stdout === undefined && (status === "RUNTIME_ERROR" || status === "COMPILATION_ERROR") && /\b(?:Traceback|Error:)/.test(reported);
  const diagnostic = testCase.diagnostic || (legacyDiagnostic ? reported : "");
  const output = testCase.stdout ?? (legacyDiagnostic ? "" : reported);
  const lines = diagnostic.trimEnd().split("\n");
  const summary = lines.at(-1);
  const line = Array.from(diagnostic.matchAll(/File ["'][^"'\n]+["'], line (\d+)/g)).at(-1)?.[1];
  const showDiagnostic = (status === "RUNTIME_ERROR" || status === "COMPILATION_ERROR") && diagnostic;
  const hint = !isSample && status === "WRONG_ANSWER"
    ? "Your output differed on a hidden case. Try edge cases covered by the problem statement."
    : !isSample && status === "RUNTIME_ERROR"
      ? "Your code stopped on a hidden case. Check input handling and edge cases, then run the public samples again."
      : getHint(status, diagnostic);

  return <section className={styles.caseDetails} aria-label={name + " details"}>
    <h4>{name} <span className={status === "ACCEPTED" ? styles.success : styles.failure}>{statusLabel(status)}</span></h4>
    <p>{hint}</p>
    {isSample ? <>
      {showDiagnostic && <div className={styles.diagnostic}>
        <p>{line && <strong>Line {line}: </strong>}<code>{summary}</code></p>
        {lines.length > 1 && <details><summary>Show Python traceback</summary><pre>{diagnostic}</pre></details>}
      </div>}
      <dl className={styles.values}>
        <Value label="Input" value={testCase.stdin} />
        <Value label="Expected output" value={testCase.expectedOutput} />
        <Value label="Your output" value={output} />
      </dl>
    </> : <p className={styles.muted}>This case’s input and output are private.</p>}
  </section>;
}

function Value({ label, value }: { label: string; value?: string }) {
  return <div><dt>{label}</dt><dd><pre>{value || "(empty)"}</pre></dd></div>;
}
