import type { ExampleQuestion } from "./example-questions";

type Props = {
  result: {
    type: "run" | "submit";
  } | null;
  question: ExampleQuestion;
};

export default function ExecutionResults({
  result,
  question,
}: Props) {
  if (!result) {
    return (
      <div
        style={{
          border: "1px solid #e5e7eb",
          borderRadius: "8px",
          padding: "16px",
          marginTop: "16px",
        }}
      >
        <h3>Results</h3>

        <p style={{ color: "#6b7280" }}>
          Run or Submit your solution to see demo results.
        </p>
      </div>
    );
  }

  if (result.type === "submit") {
    return (
      <div
        style={{
          border: "1px solid #e5e7eb",
          borderRadius: "8px",
          padding: "16px",
          marginTop: "16px",
        }}
      >
        <h3>Submission Result</h3>

        <p
          style={{
            color: "#15803d",
            fontWeight: "bold",
          }}
        >
          ✅ Accepted
        </p>

        <p>Runtime: 24 ms (Demo)</p>

        <p>Memory: 9 MB (Demo)</p>

        <p
          style={{
            color: "#b45309",
          }}
        >
          Demo submission only. No real judging was performed.
        </p>
      </div>
    );
  }

  return (
    <div
      style={{
        border: "1px solid #e5e7eb",
        borderRadius: "8px",
        padding: "16px",
        marginTop: "16px",
      }}
    >
      <h3>Run Results</h3>

      <p
        style={{
          color: "#b45309",
          marginBottom: "20px",
        }}
      >
        Demo execution — every sample test passes.
      </p>

      {question.sampleTestCases.map((testCase) => (
        <div
          key={testCase.position}
          style={{
            border: "1px solid #e5e7eb",
            borderRadius: "8px",
            padding: "12px",
            marginBottom: "16px",
          }}
        >
          <p
            style={{
              color: "#15803d",
              fontWeight: "bold",
            }}
          >
            ✅ Passed
          </p>

          <p>
            <strong>Input</strong>
          </p>

          <pre>{testCase.stdin}</pre>

          <p>
            <strong>Expected Output</strong>
          </p>

          <pre>{testCase.expectedOutput}</pre>

          <p>
            <strong>Actual Output</strong>
          </p>

          <pre>{testCase.expectedOutput}</pre>
        </div>
      ))}
    </div>
  );
}