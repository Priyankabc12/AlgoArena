"use client";

import { useState } from "react";
import { authClient } from "../../app/auth-client";

type Props = {
  open: boolean;
  onClose: () => void;
};

export default function SignInModal({
  open,
  onClose,
}: Props) {
  const [email, setEmail] = useState("");
  const [password, setPassword] =
    useState("");

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  if (!open) return null;

  async function handleSubmit(
    e: React.FormEvent
  ) {
    e.preventDefault();

    setLoading(true);
    setError("");

    try {
      const result =
        await authClient.signIn.email({
          email,
          password,
        });

      if (result.error) {
        setError(
          result.error.message ??
            "Sign in failed."
        );
      } else {
        onClose();
      }
    } catch {
      setError(
        "Something went wrong."
      );
    }

    setLoading(false);
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="signin-title"
      style={{
        position: "fixed",
        inset: 0,
        background:
          "rgba(0,0,0,0.45)",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        zIndex: 1000,
      }}
    >
      <div
        style={{
          width: "420px",
          background: "white",
          borderRadius: "8px",
          padding: "24px",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent:
              "space-between",
            alignItems: "center",
          }}
        >
          <h2 id="signin-title">
            Sign In
          </h2>

          <button
            onClick={onClose}
          >
            ✕
          </button>
        </div>

        <form
          onSubmit={handleSubmit}
        >
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) =>
              setEmail(
                e.target.value
              )
            }
            required
            style={{
              width: "100%",
              padding: "10px",
              marginTop: "16px",
            }}
          />

          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) =>
              setPassword(
                e.target.value
              )
            }
            required
            style={{
              width: "100%",
              padding: "10px",
              marginTop: "12px",
            }}
          />

          {error && (
            <p
              style={{
                color: "red",
              }}
            >
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%",
              marginTop: "20px",
              padding: "12px",
            }}
          >
            {loading
              ? "Signing In..."
              : "Sign In"}
          </button>
        </form>
      </div>
    </div>
  );
}