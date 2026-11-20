"use client";

import { useEffect, useState } from "react";
import type { ExampleQuestion } from "./example-questions";
import PythonEditor from "./python-editor";
import ExecutionResults from "./execution-results";
import SignInModal from "./sign-in-modal";
import { authClient } from "../../app/auth-client";
import DifficultyBadge from "./difficulty-badge";

type Props = {
  question: ExampleQuestion;
};

export default function QuestionWorkspace({
  question,
}: Props) {
  const [code, setCode] = useState(`import sys

def solve():
    data = sys.stdin.read().strip().split()

    # Write your solution here

    print()

if __name__ == "__main__":
    solve()
`);

  const [loading, setLoading] = useState(false);

  const [result, setResult] = useState<{
    type: "run" | "submit";
  } | null>(null);

  const [signedIn, setSignedIn] = useState(false);

  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    authClient.getSession().then(({ data }) => {
      setSignedIn(!!data);
    });
  }, []);

  async function handleRun() {
    if (!signedIn) {
      setShowModal(true);
      return;
    }

    setLoading(true);

    await new Promise((resolve) =>
      setTimeout(resolve, 1000)
    );

    setResult({
      type: "run",
    });

    setLoading(false);
  }

  async function handleSubmit() {
    if (!signedIn) {
      setShowModal(true);
      return;
    }

    setLoading(true);

    await new Promise((resolve) =>
      setTimeout(resolve, 1000)
    );

    setResult({
      type: "submit",
    });

    setLoading(false);
  }

  return (
    <>
      <main
        style={{
          maxWidth: "1440px",
          margin: "0 auto",
          padding: "24px",
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "24px",
        }}
      >
        <section>
          <h1>{question.title}</h1>

          <p>
            <strong>Difficulty:</strong>{" "}
            <DifficultyBadge
                difficulty={question.difficulty}
            />
        </p>

          <p>
            <strong>Tags:</strong>{" "}
            {question.tags.join(", ")}
          </p>

          <p>
            <strong>Time Limit:</strong>{" "}
            {question.timeLimit}s
          </p>

          <p>
            <strong>Memory Limit:</strong>{" "}
            {question.memoryLimit} KB
          </p>

          <hr
            style={{
              margin: "20px 0",
            }}
          />

          <p>{question.statement}</p>

          <h3
            style={{
              marginTop: "24px",
            }}
          >
            Sample Test Cases
          </h3>

          {question.sampleTestCases.map((testCase) => (
            <div
              key={testCase.position}
              style={{
                border: "1px solid #ddd",
                borderRadius: "8px",
                padding: "12px",
                marginBottom: "12px",
              }}
            >
              <p>
                <strong>
                  Sample {testCase.position + 1}
                </strong>
              </p>

              <p>
                <strong>Input</strong>
              </p>

              <pre>{testCase.stdin}</pre>

              <p>
                <strong>Expected Output</strong>
              </p>

              <pre>{testCase.expectedOutput}</pre>
            </div>
          ))}
        </section>

        <section>
          <PythonEditor
            code={code}
            onChange={setCode}
          />

          <div
            style={{
              display: "flex",
              gap: "12px",
              marginTop: "16px",
              marginBottom: "16px",
            }}
          >
            <button
              onClick={handleRun}
              disabled={loading}
            >
              {loading
                ? "Running..."
                : "Run"}
            </button>

            <button
              onClick={handleSubmit}
              disabled={loading}
            >
              {loading
                ? "Submitting..."
                : "Submit"}
            </button>
          </div>

          <ExecutionResults
            result={result}
            question={question}
          />
        </section>
      </main>

      <SignInModal
        open={showModal}
        onClose={() => {
          setShowModal(false);

          authClient
            .getSession()
            .then(({ data }) => {
              setSignedIn(!!data);
            });
        }}
      />
    </>
  );
}