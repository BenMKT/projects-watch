import Link from "next/link";
import { ArrowRight, MapPinned, Mic, ShieldCheck, Users } from "lucide-react";

export default function HomePage() {
  return (
    <div className="relative overflow-hidden">
      <section className="relative min-h-[calc(100vh-4rem)]">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage:
              "linear-gradient(120deg, rgba(4,47,46,0.88) 0%, rgba(15,118,110,0.55) 45%, rgba(4,47,46,0.35) 100%), url('https://images.unsplash.com/photo-1749096596888-0490c0eef19a?auto=format&fit=crop&w=2000&q=80')",
          }}
        />
        <div className="animate-drift pointer-events-none absolute -right-20 top-24 h-72 w-72 rounded-full bg-emerald-300/20 blur-3xl" />
        <div className="animate-drift pointer-events-none absolute bottom-10 left-10 h-56 w-56 rounded-full bg-cyan-200/15 blur-3xl" style={{ animationDelay: "2s" }} />

        <div className="relative mx-auto flex min-h-[calc(100vh-4rem)] max-w-7xl flex-col justify-end px-4 pb-16 pt-24 sm:px-6 lg:justify-center lg:pb-24">
          <p className="animate-rise font-[family-name:var(--font-display)] text-5xl font-semibold tracking-tight text-white sm:text-6xl lg:text-7xl">
            Citizen Development Watch
          </p>
          <p className="animate-rise-delay mt-4 max-w-xl text-lg text-teal-50/90 sm:text-xl">
            Uganda&apos;s civic lens on public projects — report with evidence and hold ministries to
            account.
          </p>
          <div className="animate-rise-delay mt-8 flex flex-wrap gap-3" style={{ animationDelay: "0.25s" }}>
            <Link
              href="/map"
              className="inline-flex items-center gap-2 rounded-lg bg-white px-5 py-3 text-sm font-semibold text-teal-950 shadow-lg transition hover:bg-teal-50"
            >
              Explore the map <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center gap-2 rounded-lg border border-white/40 bg-white/10 px-5 py-3 text-sm font-semibold text-white backdrop-blur hover:bg-white/20"
            >
              Sign in to report
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
        <h2 className="font-[family-name:var(--font-display)] text-3xl text-teal-950">
          How CDW works
        </h2>
        <p className="mt-2 max-w-2xl text-teal-900/70">
          One platform connecting Ugandan citizens, field officers, and ministries around live
          project truth — from Kampala to Gulu and beyond.
        </p>
        <div className="mt-10 grid gap-8 md:grid-cols-3">
          {[
            {
              icon: MapPinned,
              title: "Monitor projects",
              body: "Locate works on an interactive map. RAG traffic lights surface stalled, slow, or on-track delivery.",
            },
            {
              icon: Mic,
              title: "Inclusive reporting",
              body: "Photos, video, written forms, and voice reports for low-literacy participation — even offline.",
            },
            {
              icon: ShieldCheck,
              title: "Accountability loop",
              body: "Escalations reach officers, ministers, and anti-corruption bodies with deadlines and public statements.",
            },
          ].map((item) => (
            <div key={item.title} className="border-t border-teal-800/20 pt-5">
              <item.icon className="h-6 w-6 text-teal-700" />
              <h3 className="mt-3 font-[family-name:var(--font-display)] text-xl text-teal-950">
                {item.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-teal-900/70">{item.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="border-y border-teal-900/10 bg-gradient-to-br from-teal-900 to-teal-950 text-teal-50">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:items-center">
          <div>
            <h2 className="font-[family-name:var(--font-display)] text-3xl text-white">
              RAG Traffic Light System
            </h2>
            <p className="mt-3 text-teal-100/80">
              Status requires at least three independent citizen reports, AI sentiment & activity
              analysis, weighted consensus, then admin review before ministry alerts.
            </p>
          </div>
          <div className="space-y-3">
            {[
              { color: "bg-emerald-500", title: "Green — On track", desc: "Informational logging only." },
              { color: "bg-amber-500", title: "Amber — Slow progress", desc: "Officer + ministry · 14-day deadline." },
              { color: "bg-rose-600", title: "Red — Stalled / abandoned", desc: "Minister, PS, IGG · 5 days · public statement." },
            ].map((r) => (
              <div key={r.title} className="flex items-start gap-3 rounded-xl bg-white/5 px-4 py-3">
                <span className={`mt-1 h-3 w-3 rounded-full ${r.color}`} />
                <div>
                  <p className="font-medium text-white">{r.title}</p>
                  <p className="text-sm text-teal-100/70">{r.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="font-[family-name:var(--font-display)] text-3xl text-teal-950">
              Built for every role
            </h2>
            <p className="mt-2 text-teal-900/70">From household surveys to parliamentary oversight.</p>
          </div>
          <Link href="/dashboard" className="inline-flex items-center gap-2 text-sm font-semibold text-teal-800">
            Open public dashboard <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        <div className="mt-8 flex items-center gap-3 text-sm text-teal-800">
          <Users className="h-5 w-5" />
          Super Admin · District Admin · Field Officer · Citizen · Parliamentary / Audit
        </div>
      </section>
    </div>
  );
}
