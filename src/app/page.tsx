import Link from 'next/link';

export default function Home() {
  return (
    <main style={{ background: 'var(--bg-soft)', minHeight: '100vh' }} className="font-sans">
      <div className="mx-auto max-w-4xl p-6">
        <section
          className="rounded-3xl border border-[#CBD5E1] bg-white p-10 shadow-sm"
          style={{ borderColor: 'var(--muted-slate)' }}
        >
          <h1 className="text-4xl font-black" style={{ color: 'var(--veldt-green)' }}>
            Water Polo Platform
          </h1>
          <p className="mt-4 max-w-2xl text-base" style={{ color: 'var(--muted-text)' }}>
            Manage tournaments, create fixtures, and run the poolside scorekeeper with real-time
            Supabase updates.
          </p>
          <div className="mt-8 flex flex-col gap-4 sm:flex-row">
            <Link
              href="/admin"
              className="inline-flex items-center justify-center rounded-2xl bg-[#E3A355] px-6 py-4 text-sm font-semibold text-black transition hover:bg-[#d8a44d]"
            >
              Go to Admin
            </Link>
            <Link
              href="/scorekeeper"
              className="inline-flex items-center justify-center rounded-2xl border border-[#CBD5E1] bg-white px-6 py-4 text-sm font-semibold text-[#0F172A] transition hover:bg-[#f8fafc]"
            >
              Open Scorekeeper Match List
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
