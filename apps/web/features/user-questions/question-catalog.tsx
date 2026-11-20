"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { exampleQuestions } from "./example-questions";
import DifficultyBadge from "./difficulty-badge";

export default function QuestionCatalog() {
  const [search, setSearch] = useState("");
  const [difficulty, setDifficulty] = useState("ALL");
  const [tag, setTag] = useState("ALL");

  const tags = useMemo(() => {
    return Array.from(
      new Set(exampleQuestions.flatMap((q) => q.tags))
    ).sort();
  }, []);

  const filteredQuestions = useMemo(() => {
    return exampleQuestions.filter((question) => {
      const matchesSearch =
        question.title.toLowerCase().includes(search.toLowerCase()) ||
        question.slug.toLowerCase().includes(search.toLowerCase());

      const matchesDifficulty =
        difficulty === "ALL" ||
        question.difficulty === difficulty;

      const matchesTag =
        tag === "ALL" ||
        question.tags.includes(tag);

      return (
        matchesSearch &&
        matchesDifficulty &&
        matchesTag
      );
    });
  }, [search, difficulty, tag]);

  return (
    <main
      style={{
        maxWidth: "1440px",
        margin: "0 auto",
        padding: "32px",
      }}
    >
      <h1>Practice Questions</h1>

      <p
        style={{
          color: "#6b7280",
          marginBottom: "24px",
        }}
      >
        Solve algorithmic programming problems using Python.
      </p>

      <div
        style={{
          display: "flex",
          gap: "16px",
          flexWrap: "wrap",
          marginBottom: "24px",
        }}
      >
        <input
          placeholder="Search title or slug..."
          value={search}
          onChange={(e) =>
            setSearch(e.target.value)
          }
          style={{
            padding: "10px",
            minWidth: "250px",
          }}
        />

        <select
          value={difficulty}
          onChange={(e) =>
            setDifficulty(e.target.value)
          }
        >
          <option value="ALL">All Difficulties</option>
          <option value="EASY">Easy</option>
          <option value="MEDIUM">Medium</option>
          <option value="HARD">Hard</option>
        </select>

        <select
          value={tag}
          onChange={(e) =>
            setTag(e.target.value)
          }
        >
          <option value="ALL">All Tags</option>

          {tags.map((tag) => (
            <option
              key={tag}
              value={tag}
            >
              {tag}
            </option>
          ))}
        </select>

        <button
          onClick={() => {
            setSearch("");
            setDifficulty("ALL");
            setTag("ALL");
          }}
        >
          Clear Filters
        </button>
      </div>

      <p
        style={{
          marginBottom: "20px",
          color: "#6b7280",
        }}
      >
        {filteredQuestions.length} question(s)
      </p>

      {filteredQuestions.length === 0 ? (
        <div
          style={{
            padding: "40px",
            border: "1px solid #e5e7eb",
            borderRadius: "8px",
          }}
        >
          <h3>No matching questions</h3>

          <button
            onClick={() => {
              setSearch("");
              setDifficulty("ALL");
              setTag("ALL");
            }}
          >
            Clear Filters
          </button>
        </div>
      ) : (
        <table
          width="100%"
          cellPadding={12}
          style={{
            borderCollapse: "collapse",
          }}
        >
          <thead>
            <tr>
              <th align="left">Title</th>
              <th align="left">Difficulty</th>
              <th align="left">Tags</th>
              <th align="left">Time Limit</th>
              <th align="left">Memory Limit</th>
            </tr>
          </thead>

          <tbody>
            {filteredQuestions.map((question) => (
              <tr
                key={question.id}
                style={{
                  borderTop:
                    "1px solid #e5e7eb",
                }}
              >
                <td>
                  <Link
                    href={`/questions/${question.slug}`}
                  >
                    {question.title}
                  </Link>
                </td>

                <td>
                    <DifficultyBadge
                    difficulty={question.difficulty}
                    />
                 </td>

                <td>
                  {question.tags.join(", ")}
                </td>

                <td>
                  {question.timeLimit}s
                </td>

                <td>
                  {question.memoryLimit} KB
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </main>
  );
}
/*
What this file is doing
        This is the "brain" of the catalog.

        It:
        - ✅ Stores the search text.
        - ✅ Stores the selected difficulty.
        - ✅ Stores the selected tag.
        - ✅ Filters the questions.
        - ✅ Displays them.
        - ✅ Makes each card clickable.
        - ✅ Sends the user to /questions/[slug].
        Notice how we use:
        const [search, setSearch] = useState("");

        This is called state. Whenever the user types something, React updates search, recalculates filteredQuestions, and automatically re-renders the page.
        */