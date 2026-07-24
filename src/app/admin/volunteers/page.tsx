"use client";

import { useEffect, useState } from "react";
import { ROLE_LABELS } from "@/lib/utils";
import type { Role } from "@/types/roles";

export default function VolunteersPage() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [users, setUsers] = useState<any[]>([]);

  useEffect(() => {
    fetch("/api/users")
      .then((r) => r.json())
      .then((d) => setUsers(Array.isArray(d) ? d : []));
  }, []);

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <h1 className="font-[family-name:var(--font-display)] text-3xl text-teal-950">
        Volunteers & users
      </h1>
      <p className="mt-1 text-sm text-teal-800/70">
        District admins manage field officers. MFA flags shown for privileged roles.
      </p>
      <table className="mt-8 w-full text-left text-sm">
        <thead className="border-b border-teal-900/15 text-teal-700">
          <tr>
            <th className="py-2">Name</th>
            <th className="py-2">Role</th>
            <th className="py-2">District</th>
            <th className="py-2">MFA</th>
          </tr>
        </thead>
        <tbody>
          {users.map((u) => (
            <tr key={u.id} className="border-b border-teal-900/5">
              <td className="py-2.5">
                <p className="font-medium">{u.name}</p>
                <p className="text-xs text-teal-700">{u.email}</p>
              </td>
              <td className="py-2.5">{ROLE_LABELS[u.role as Role] || u.role}</td>
              <td className="py-2.5">{u.district || "—"}</td>
              <td className="py-2.5">{u.mfaEnabled ? "Enabled" : "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
