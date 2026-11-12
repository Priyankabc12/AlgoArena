"use client";

import { ChangeEvent } from "react";

interface QuestionFiltersProps {
  search: string;
  difficulty: string;
  tag: string;
  tags: string[];
  onSearchChange: (value: string) => void;
  onDifficultyChange: (value: string) => void;
  onTagChange: (value: string) => void;
}

export default function QuestionFilters({
  search,
  difficulty,
  tag,
  tags,
  onSearchChange,
  onDifficultyChange,
  onTagChange,
}: QuestionFiltersProps) {
  return (
    <div
      style={{
        display: "grid",
        gap: "16px",
        marginBottom: "24px",
      }}
    >
      <input
        type="text"
        placeholder="Search questions..."
        value={search}
        onChange={(e: ChangeEvent<HTMLInputElement>) =>
          onSearchChange(e.target.value)
        }
        style={{
          padding: "10px",
          border: "1px solid #ccc",
          borderRadius: "8px",
        }}
      />

      <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
        <select
          value={difficulty}
          onChange={(e) => onDifficultyChange(e.target.value)}
        >
          <option value="">All Difficulties</option>
          <option value="Easy">Easy</option>
          <option value="Medium">Medium</option>
          <option value="Hard">Hard</option>
        </select>

        <select
          value={tag}
          onChange={(e) => onTagChange(e.target.value)}
        >
          <option value="">All Tags</option>

          {tags.map((currentTag) => (
            <option key={currentTag} value={currentTag}>
              {currentTag}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
/*What this component does
        It doesn't filter anything by itself.

        It simply displays:
        - 🔎 Search box
        - 🎯 Difficulty dropdown
        - 🏷️ Tag dropdown
        When the user types or selects something, it notifies the parent component, which will perform the actual filtering.

        This is a common React pattern called "lifting state up":
        - QuestionFilters = UI only
        - QuestionCatalog = stores state and filters the questions */