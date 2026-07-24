"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { DISTRICTS } from "@/lib/surveys";

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "CITIZEN",
    district: DISTRICTS[0],
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setLoading(false);
    if (!res.ok) {
      const data = await res.json();
      setError(typeof data.error === "string" ? data.error : "Registration failed");
      return;
    }
    router.push("/login");
  }

  return (
    <div className="mx-auto max-w-md px-4 py-12">
      <h1 className="font-[family-name:var(--font-display)] text-3xl text-teal-950">Create account</h1>
      <p className="mt-2 text-sm text-teal-800/70">Citizens and field officer volunteers can self-register.</p>
      <form onSubmit={onSubmit} className="mt-8 space-y-4">
        {(["name", "email", "password"] as const).map((field) => (
          <label key={field} className="block text-sm capitalize">
            <span className="text-teal-900/70">{field}</span>
            <input
              type={field === "password" ? "password" : field === "email" ? "email" : "text"}
              value={form[field]}
              onChange={(e) => setForm({ ...form, [field]: e.target.value })}
              className="mt-1 w-full rounded-lg border border-teal-900/15 bg-white px-3 py-2"
              required
              minLength={field === "password" ? 8 : 2}
            />
          </label>
        ))}
        <label className="block text-sm">
          <span className="text-teal-900/70">Role</span>
          <select
            value={form.role}
            onChange={(e) => setForm({ ...form, role: e.target.value })}
            className="mt-1 w-full rounded-lg border border-teal-900/15 bg-white px-3 py-2"
          >
            <option value="CITIZEN">Citizen</option>
            <option value="FIELD_OFFICER">Authorized Volunteer / Field Officer</option>
          </select>
        </label>
        <label className="block text-sm">
          <span className="text-teal-900/70">District</span>
          <select
            value={form.district}
            onChange={(e) => setForm({ ...form, district: e.target.value })}
            className="mt-1 w-full rounded-lg border border-teal-900/15 bg-white px-3 py-2"
          >
            {DISTRICTS.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </label>
        {error && <p className="text-sm text-rose-600">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-teal-800 py-2.5 text-sm font-semibold text-white"
        >
          {loading ? "Creating…" : "Register"}
        </button>
      </form>
      <p className="mt-6 text-center text-sm">
        <Link href="/login" className="text-teal-800 underline">
          Back to sign in
        </Link>
      </p>
    </div>
  );
}
