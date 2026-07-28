"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { INPUT_CLASS } from "@/lib/ui";

export function AuthForm({ mode }: { mode: "login" | "register" }) {
  const { login, register } = useAuth();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const isRegister = mode === "register";

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors([]);
    setSubmitting(true);
    try {
      if (isRegister) await register(email, username, password);
      else await login(email, password);
      router.push("/slot");
    } catch (err) {
      setErrors(err instanceof ApiError ? err.messages : ["Something went wrong. Try again."]);
      setSubmitting(false);
    }
  };

  const inputClass = `${INPUT_CLASS} px-4`;

  return (
    <div className="max-w-md mx-auto pt-16">
      <div className="rounded-2xl border border-white/10 bg-white/5 p-8">
        <div className="text-center mb-6">
          <div className="text-4xl mb-2">🎰</div>
          <h1 className="text-xl font-bold">
            {isRegister ? "Create your account" : "Welcome back"}
          </h1>
          <p className="text-sm text-white/50 mt-1">
            {isRegister
              ? "New players start with 20 coins on the house."
              : "Log in to play the slot machine."}
          </p>
        </div>

        {errors.length > 0 && (
          <ul className="rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-300 px-4 py-3 text-sm mb-4 space-y-1">
            {errors.map((e, i) => (
              <li key={i}>{e}</li>
            ))}
          </ul>
        )}

        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm text-white/70 mb-1.5">
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={inputClass}
              placeholder="you@example.com"
            />
          </div>

          {isRegister && (
            <div>
              <label htmlFor="username" className="block text-sm text-white/70 mb-1.5">
                Username
              </label>
              <input
                id="username"
                type="text"
                required
                minLength={3}
                maxLength={20}
                pattern="[A-Za-z0-9_]+"
                title="3-20 characters: letters, numbers, underscores"
                autoComplete="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className={inputClass}
                placeholder="lucky_player"
              />
            </div>
          )}

          <div>
            <label htmlFor="password" className="block text-sm text-white/70 mb-1.5">
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              minLength={isRegister ? 8 : 1}
              maxLength={72}
              autoComplete={isRegister ? "new-password" : "current-password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={inputClass}
              placeholder={isRegister ? "At least 8 characters" : "Your password"}
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-xl bg-amber-400 text-black font-semibold py-2.5 hover:bg-amber-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {submitting ? "Please wait…" : isRegister ? "Sign up" : "Log in"}
          </button>
        </form>

        <p className="text-center text-sm text-white/50 mt-6">
          {isRegister ? (
            <>
              Already have an account?{" "}
              <Link href="/login" className="text-amber-300 hover:underline">
                Log in
              </Link>
            </>
          ) : (
            <>
              No account yet?{" "}
              <Link href="/register" className="text-amber-300 hover:underline">
                Sign up free
              </Link>
            </>
          )}
        </p>
      </div>
    </div>
  );
}
