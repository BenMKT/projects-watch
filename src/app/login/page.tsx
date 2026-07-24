"use client";

import { signIn } from "next-auth/react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useState } from "react";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState("citizen@cdw.local");
  const [password, setPassword] = useState("password123");
  const [mfaCode, setMfaCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await signIn("credentials", {
      email,
      password,
      mfaCode,
      redirect: false,
    });
    setLoading(false);
    if (res?.error) {
      setError(
        res.error === "MFA_REQUIRED" || res.error.includes("MFA")
          ? "MFA required for this role. Use code 123456."
          : "Invalid credentials."
      );
      return;
    }
    router.push(params.get("callbackUrl") || "/dashboard");
    router.refresh();
  }

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-4 py-12">
      <h1 className="font-[family-name:var(--font-display)] text-3xl text-teal-950">Sign in</h1>
      <p className="mt-2 text-sm text-teal-800/70">
        JWT session with role-based access. Admins and field officers use MFA.
      </p>

      <form onSubmit={onSubmit} className="mt-8 space-y-4">
        <label className="block text-sm">
          <span className="text-teal-900/70">Email</span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full rounded-lg border border-teal-900/15 bg-white px-3 py-2"
            required
          />
        </label>
        <label className="block text-sm">
          <span className="text-teal-900/70">Password</span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 w-full rounded-lg border border-teal-900/15 bg-white px-3 py-2"
            required
          />
        </label>
        <label className="block text-sm">
          <span className="text-teal-900/70">MFA code (admins / officers)</span>
          <input
            type="text"
            value={mfaCode}
            onChange={(e) => setMfaCode(e.target.value)}
            placeholder="123456"
            className="mt-1 w-full rounded-lg border border-teal-900/15 bg-white px-3 py-2"
          />
        </label>
        {error && <p className="text-sm text-rose-600">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-teal-800 py-2.5 text-sm font-semibold text-white hover:bg-teal-900 disabled:opacity-60"
        >
          {loading ? "Signing in…" : "Sign in"}
        </button>
      </form>

      <div className="mt-8 rounded-xl border border-teal-900/10 bg-white p-4 text-xs text-teal-800/80">
        <p className="font-semibold text-teal-950">Demo accounts (password: password123)</p>
        <ul className="mt-2 space-y-1">
          <li>superadmin@cdw.local — Super Admin (MFA)</li>
          <li>district@cdw.local — District Admin (MFA)</li>
          <li>officer@cdw.local — Field Officer (MFA)</li>
          <li>citizen@cdw.local — Citizen</li>
          <li>parliament@cdw.local — Parliamentary</li>
        </ul>
      </div>

      <p className="mt-6 text-center text-sm text-teal-800">
        No account?{" "}
        <Link href="/register" className="font-semibold underline">
          Register as citizen
        </Link>
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
