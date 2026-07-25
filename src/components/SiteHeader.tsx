"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { cn } from "@/lib/utils";
import { Menu, X, Shield, Radio } from "lucide-react";
import { useState } from "react";

const links = [
  { href: "/map", label: "Project Map" },
  { href: "/projects", label: "Projects" },
  { href: "/reports", label: "Reports Feed" },
  { href: "/briefings", label: "Chamber" },
  { href: "/dashboard", label: "Dashboard" },
  { href: "/surveys", label: "Surveys" },
];

export function SiteHeader() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [open, setOpen] = useState(false);
  const role = session?.user?.role;

  return (
    <header className="sticky top-0 z-50 border-b border-teal-900/10 bg-[#f4faf8]/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <Link href="/" className="group flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-teal-800 text-white shadow-sm">
            <Shield className="h-5 w-5" />
          </span>
          <div className="leading-tight">
            <p className="font-[family-name:var(--font-display)] text-lg font-semibold tracking-tight text-teal-950">
              CDW
            </p>
            <p className="hidden text-[10px] uppercase tracking-[0.14em] text-teal-700/80 sm:block">
              Citizen Development Watch
            </p>
          </div>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={cn(
                "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                pathname.startsWith(l.href)
                  ? "bg-teal-800 text-white"
                  : "text-teal-900/70 hover:bg-teal-800/10 hover:text-teal-950"
              )}
            >
              {l.label}
            </Link>
          ))}
          {(role === "SUPER_ADMIN" || role === "DISTRICT_ADMIN" || role === "PARLIAMENTARY") && (
            <Link
              href="/admin"
              className={cn(
                "rounded-md px-3 py-1.5 text-sm font-medium",
                pathname.startsWith("/admin")
                  ? "bg-teal-800 text-white"
                  : "text-teal-900/70 hover:bg-teal-800/10"
              )}
            >
              Admin
            </Link>
          )}
          {(role === "FIELD_OFFICER" || role === "DISTRICT_ADMIN" || role === "SUPER_ADMIN") && (
            <Link
              href="/officer"
              className={cn(
                "rounded-md px-3 py-1.5 text-sm font-medium",
                pathname.startsWith("/officer")
                  ? "bg-teal-800 text-white"
                  : "text-teal-900/70 hover:bg-teal-800/10"
              )}
            >
              Field
            </Link>
          )}
        </nav>

        <div className="flex items-center gap-2">
          <span className="hidden items-center gap-1 rounded-full border border-teal-800/15 bg-white/60 px-2.5 py-1 text-[11px] text-teal-800 sm:inline-flex">
            <Radio className="h-3 w-3" />
            Live civic feed
          </span>
          {session?.user ? (
            <div className="hidden items-center gap-2 sm:flex">
              <span className="max-w-[120px] truncate text-xs text-teal-900/60">
                {session.user.name}
              </span>
              <button
                onClick={() => signOut({ callbackUrl: "/" })}
                className="rounded-md border border-teal-800/20 px-2.5 py-1.5 text-xs font-medium text-teal-900 hover:bg-white"
              >
                Sign out
              </button>
            </div>
          ) : (
            <Link
              href="/login"
              className="hidden rounded-md bg-teal-800 px-3 py-1.5 text-sm font-medium text-white hover:bg-teal-900 sm:inline-flex"
            >
              Sign in
            </Link>
          )}
          <button
            className="rounded-md p-2 text-teal-900 md:hidden"
            onClick={() => setOpen((v) => !v)}
            aria-label="Toggle menu"
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {open && (
        <div className="border-t border-teal-900/10 bg-[#f4faf8] px-4 py-3 md:hidden">
          <div className="flex flex-col gap-1">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className="rounded-md px-3 py-2 text-sm text-teal-950 hover:bg-teal-800/10"
              >
                {l.label}
              </Link>
            ))}
            {session?.user ? (
              <button
                onClick={() => signOut({ callbackUrl: "/" })}
                className="rounded-md px-3 py-2 text-left text-sm text-teal-950 hover:bg-teal-800/10"
              >
                Sign out
              </button>
            ) : (
              <Link href="/login" className="rounded-md px-3 py-2 text-sm text-teal-950">
                Sign in
              </Link>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
