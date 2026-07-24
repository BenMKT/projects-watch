"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { DISTRICTS } from "@/lib/surveys";

export default function AdminProjectsPage() {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [form, setForm] = useState({
    projectCode: "",
    name: "",
    contractor: "",
    contractSum: 50000000,
    durationMonths: 18,
    scope: "",
    district: DISTRICTS[0],
    sector: "Infrastructure",
    latitude: 0.3476,
    longitude: 32.5825,
    startDate: new Date().toISOString().slice(0, 10),
    milestoneTitle: "Foundation complete",
    milestoneDesc: "Site clearance and foundation works",
  });

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setMessage("");
    const res = await fetch("/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        contractSum: Number(form.contractSum),
        durationMonths: Number(form.durationMonths),
        latitude: Number(form.latitude),
        longitude: Number(form.longitude),
        baselinePhotos: [],
        milestones: [
          {
            title: form.milestoneTitle,
            description: form.milestoneDesc,
            dueDate: form.startDate,
            orderIndex: 1,
          },
          {
            title: "Structural works",
            description: "Primary structure and utilities",
            dueDate: form.startDate,
            orderIndex: 2,
          },
          {
            title: "Handover",
            description: "Final inspection and commissioning",
            dueDate: form.startDate,
            orderIndex: 3,
          },
        ],
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setMessage("Failed — ensure you are signed in as Super Admin.");
      return;
    }
    setMessage(`Project ${data.projectCode} onboarded.`);
    router.push(`/projects/${data.id}`);
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
      <h1 className="font-[family-name:var(--font-display)] text-3xl text-teal-950">
        Project onboarding
      </h1>
      <p className="mt-1 text-sm text-teal-800/70">
        Upload project details, GPS, milestones, and baseline metadata.
      </p>

      <form onSubmit={onSubmit} className="mt-8 space-y-4">
        {(
          [
            ["projectCode", "Project ID"],
            ["name", "Project name"],
            ["contractor", "Contractor"],
            ["scope", "Scope of works"],
          ] as const
        ).map(([key, label]) => (
          <label key={key} className="block text-sm">
            <span className="text-teal-900/70">{label}</span>
            {key === "scope" ? (
              <textarea
                required
                value={form[key]}
                onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                className="mt-1 w-full rounded-lg border border-teal-900/15 bg-white px-3 py-2"
                rows={3}
              />
            ) : (
              <input
                required
                value={form[key]}
                onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                className="mt-1 w-full rounded-lg border border-teal-900/15 bg-white px-3 py-2"
              />
            )}
          </label>
        ))}

        <div className="grid grid-cols-2 gap-3">
          <label className="block text-sm">
            <span className="text-teal-900/70">Contract sum</span>
            <input
              type="number"
              value={form.contractSum}
              onChange={(e) => setForm({ ...form, contractSum: Number(e.target.value) })}
              className="mt-1 w-full rounded-lg border border-teal-900/15 bg-white px-3 py-2"
            />
          </label>
          <label className="block text-sm">
            <span className="text-teal-900/70">Duration (months)</span>
            <input
              type="number"
              value={form.durationMonths}
              onChange={(e) => setForm({ ...form, durationMonths: Number(e.target.value) })}
              className="mt-1 w-full rounded-lg border border-teal-900/15 bg-white px-3 py-2"
            />
          </label>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <label className="block text-sm">
            <span className="text-teal-900/70">District</span>
            <select
              value={form.district}
              onChange={(e) => setForm({ ...form, district: e.target.value })}
              className="mt-1 w-full rounded-lg border border-teal-900/15 bg-white px-3 py-2"
            >
              {DISTRICTS.map((d) => (
                <option key={d}>{d}</option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            <span className="text-teal-900/70">Sector</span>
            <input
              value={form.sector}
              onChange={(e) => setForm({ ...form, sector: e.target.value })}
              className="mt-1 w-full rounded-lg border border-teal-900/15 bg-white px-3 py-2"
            />
          </label>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <label className="block text-sm">
            <span className="text-teal-900/70">Latitude</span>
            <input
              type="number"
              step="any"
              value={form.latitude}
              onChange={(e) => setForm({ ...form, latitude: Number(e.target.value) })}
              className="mt-1 w-full rounded-lg border border-teal-900/15 bg-white px-3 py-2"
            />
          </label>
          <label className="block text-sm">
            <span className="text-teal-900/70">Longitude</span>
            <input
              type="number"
              step="any"
              value={form.longitude}
              onChange={(e) => setForm({ ...form, longitude: Number(e.target.value) })}
              className="mt-1 w-full rounded-lg border border-teal-900/15 bg-white px-3 py-2"
            />
          </label>
        </div>

        <button type="submit" className="w-full rounded-lg bg-teal-800 py-2.5 text-sm font-semibold text-white">
          Onboard project
        </button>
        {message && <p className="text-sm text-teal-800">{message}</p>}
      </form>
    </div>
  );
}
