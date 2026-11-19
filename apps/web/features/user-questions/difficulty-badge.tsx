type Props = {
  difficulty: "EASY" | "MEDIUM" | "HARD";
};

const colors = {
  EASY: "#15803d",
  MEDIUM: "#b45309",
  HARD: "#b91c1c",
};

export default function DifficultyBadge({
  difficulty,
}: Props) {
  return (
    <span
      style={{
        background: colors[difficulty],
        color: "white",
        padding: "4px 10px",
        borderRadius: "999px",
        fontSize: "14px",
        fontWeight: 600,
      }}
    >
      {difficulty}
    </span>
  );
}