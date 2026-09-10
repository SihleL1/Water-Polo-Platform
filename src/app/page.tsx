import Link from 'next/link';
import Header from '@/components/Header';

export default function HomePage() {
  return (
    <div
      className="min-h-screen"
      style={{
        background: 'var(--bg-soft)',
      }}
    >
      <Header />

      <main className="mx-auto max-w-6xl px-5 py-12 md:px-8 md:py-20">
        {/* HERO */}
        <section className="rounded-[32px] border bg-white p-8 shadow-sm md:p-12">
          <div className="max-w-3xl">
            <p
              className="text-xs font-black uppercase tracking-[0.25em]"
              style={{
                color: 'var(--veldt-ochre)',
              }}
            >
              Veldt Analytics
            </p>

            <h1
              className="mt-3 text-4xl font-black tracking-tight md:text-6xl"
              style={{
                color: 'var(--veldt-green)',
              }}
            >
              Water Polo Platform
            </h1>

            <p
              className="mt-5 max-w-2xl text-base leading-7 md:text-lg"
              style={{
                color: 'var(--muted-text)',
              }}
            >
              Follow tournaments, teams and matches with
              live scorekeeping and detailed water polo
              statistics.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/dashboard"
                className="inline-flex items-center justify-center rounded-xl px-5 py-3 text-sm font-black text-white shadow-sm transition hover:-translate-y-0.5"
                style={{
                  background:
                    'var(--veldt-green)',
                }}
              >
                View Dashboard
              </Link>

              <Link
                href="/scorekeeper"
                className="inline-flex items-center justify-center rounded-xl px-5 py-3 text-sm font-black transition hover:-translate-y-0.5"
                style={{
                  background:
                    'var(--veldt-ochre)',
                  color: '#111827',
                }}
              >
                Open Scorekeeper
              </Link>

              <Link
                href="/admin"
                className="inline-flex items-center justify-center rounded-xl border px-5 py-3 text-sm font-black text-slate-700 transition hover:bg-slate-50"
                style={{
                  borderColor:
                    'var(--muted-slate)',
                }}
              >
                Admin
              </Link>
            </div>
          </div>
        </section>

        {/* PUBLIC AREAS */}
        <section className="mt-8 grid gap-5 md:grid-cols-3">
          <Link
            href="/dashboard"
            className="group rounded-3xl border bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-md"
            style={{
              borderColor:
                'var(--muted-slate)',
            }}
          >
            <div
              className="flex h-11 w-11 items-center justify-center rounded-xl text-sm font-black"
              style={{
                background:
                  'rgba(35, 71, 35, 0.1)',
                color:
                  'var(--veldt-green)',
              }}
            >
              ST
            </div>

            <h2
              className="mt-5 text-xl font-black"
              style={{
                color:
                  'var(--veldt-green)',
              }}
            >
              Statistics
            </h2>

            <p className="mt-2 text-sm leading-6 text-slate-500">
              Explore boys and girls standings,
              team performance, tournaments and
              advanced statistics.
            </p>

            <p
              className="mt-5 text-sm font-black"
              style={{
                color:
                  'var(--veldt-ochre)',
              }}
            >
              View statistics →
            </p>
          </Link>

          <Link
            href="/scorekeeper"
            className="group rounded-3xl border bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-md"
            style={{
              borderColor:
                'var(--muted-slate)',
            }}
          >
            <div
              className="flex h-11 w-11 items-center justify-center rounded-xl text-sm font-black"
              style={{
                background:
                  'rgba(216, 145, 59, 0.15)',
                color:
                  'var(--veldt-ochre)',
              }}
            >
              SK
            </div>

            <h2
              className="mt-5 text-xl font-black"
              style={{
                color:
                  'var(--veldt-green)',
              }}
            >
              Scorekeeper
            </h2>

            <p className="mt-2 text-sm leading-6 text-slate-500">
              Open a fixture and record goals, assists,
              saves, exclusions, turnovers and other
              match events.
            </p>

            <p
              className="mt-5 text-sm font-black"
              style={{
                color:
                  'var(--veldt-ochre)',
              }}
            >
              Open scorekeeper →
            </p>
          </Link>

          <Link
            href="/admin"
            className="group rounded-3xl border bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-md"
            style={{
              borderColor:
                'var(--muted-slate)',
            }}
          >
            <div
              className="flex h-11 w-11 items-center justify-center rounded-xl text-sm font-black"
              style={{
                background:
                  'rgba(100, 116, 139, 0.1)',
                color: '#475569',
              }}
            >
              AD
            </div>

            <h2
              className="mt-5 text-xl font-black"
              style={{
                color:
                  'var(--veldt-green)',
              }}
            >
              Administration
            </h2>

            <p className="mt-2 text-sm leading-6 text-slate-500">
              Manage tournaments, pools, teams and
              fixtures from the administration platform.
            </p>

            <p
              className="mt-5 text-sm font-black"
              style={{
                color:
                  'var(--veldt-ochre)',
              }}
            >
              Open admin →
            </p>
          </Link>
        </section>
      </main>
    </div>
  );
}
