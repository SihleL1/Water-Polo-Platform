'use client';

import Link from 'next/link';

import {
  BarChart3,
  ClipboardList,
  LayoutDashboard,
  Settings2,
  Radio,
  Trophy,
} from 'lucide-react';

export default function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-veldt-border bg-white/95 backdrop-blur">
      <div className="mx-auto flex min-h-16 max-w-[1600px] items-center justify-between gap-3 px-4 sm:px-6 lg:px-10">
        {/* ================================================= */}
        {/* BRAND */}
        {/* ================================================= */}

        <Link
          href="/"
          className="flex min-w-0 items-center gap-3"
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl shadow-sm">
            <img
              src="/logos/logo-icon.png"
              alt="Veldt Analytics"
              className="h-full w-full object-contain"
            />
          </div>

          <div className="min-w-0 leading-tight">
            <div className="text-[10px] font-black tracking-[0.2em] text-veldt-ochre sm:text-[11px]">
              VELDT ANALYTICS
            </div>

            <div className="truncate text-sm text-veldt-green sm:text-base">
              Water Polo Platform
            </div>
          </div>
        </Link>

        {/* ================================================= */}
        {/* DESKTOP NAVIGATION */}
        {/* ================================================= */}

        <nav className="hidden items-center gap-1 lg:flex">
          <NavLink
            href="/dashboard"
            icon={
              <LayoutDashboard className="h-4 w-4" />
            }
            label="Dashboard"
          />

          <NavLink
            href="/dashboard/teams"
            icon={
              <BarChart3 className="h-4 w-4" />
            }
            label="Teams"
          />

          <NavLink
            href="/dashboard/tournaments"
            icon={
              <Trophy className="h-4 w-4" />
            }
            label="Tournaments"
          />

          <Link
            href="/dashboard/live"
            className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-veldt-green transition hover:bg-red-50 hover:text-red-700"
          >
            <span className="relative flex h-4 w-4 items-center justify-center">
              <span className="absolute h-2 w-2 animate-ping rounded-full bg-red-400 opacity-40" />
              <span className="relative h-2 w-2 rounded-full bg-red-500" />
            </span>

            Live
          </Link>

          <NavLink
            href="/admin"
            icon={
              <Settings2 className="h-4 w-4" />
            }
            label="Admin"
            responsiveLabel="lg"
          />

          <Link
            href="/scorekeeper"
            className="inline-flex items-center gap-2 rounded-lg bg-veldt-green px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-veldt-green/90"
          >
            <ClipboardList className="h-4 w-4" />
            Scorekeeper
          </Link>
        </nav>

        {/* ================================================= */}
        {/* TABLET NAVIGATION */}
        {/* ================================================= */}

        <nav className="hidden items-center gap-1 sm:flex lg:hidden">
          <IconNavLink
            href="/dashboard"
            icon={
              <LayoutDashboard className="h-5 w-5" />
            }
            label="Dashboard"
          />

          <IconNavLink
            href="/dashboard/teams"
            icon={
              <BarChart3 className="h-5 w-5" />
            }
            label="Teams"
          />

          <IconNavLink
            href="/dashboard/tournaments"
            icon={
              <Trophy className="h-5 w-5" />
            }
            label="Tournaments"
          />

          <Link
            href="/dashboard/live"
            aria-label="Live"
            className="relative flex h-10 w-10 items-center justify-center rounded-lg text-veldt-green hover:bg-red-50 hover:text-red-700"
          >
            <Radio className="h-5 w-5" />

            <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-red-500" />
          </Link>

          <IconNavLink
            href="/scorekeeper"
            icon={
              <ClipboardList className="h-5 w-5" />
            }
            label="Scorekeeper"
            solid
          />
        </nav>

        {/* ================================================= */}
        {/* MOBILE */}
        {/* ================================================= */}

        <nav className="flex items-center gap-1 sm:hidden">
          <Link
            href="/dashboard"
            aria-label="Dashboard"
            className="flex h-10 w-10 items-center justify-center rounded-lg text-veldt-green hover:bg-veldt-green/10"
          >
            <LayoutDashboard className="h-5 w-5" />
          </Link>

          <Link
            href="/dashboard/live"
            aria-label="Live"
            className="relative flex h-10 w-10 items-center justify-center rounded-lg text-veldt-green hover:bg-red-50"
          >
            <Radio className="h-5 w-5" />

            <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-red-500" />
          </Link>

          <Link
            href="/scorekeeper"
            aria-label="Scorekeeper"
            className="flex h-10 w-10 items-center justify-center rounded-lg bg-veldt-green text-white shadow-sm"
          >
            <ClipboardList className="h-5 w-5" />
          </Link>
        </nav>
      </div>
    </header>
  );
}

function NavLink({
  href,
  icon,
  label,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  responsiveLabel?: string;
}) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-veldt-green transition hover:bg-veldt-green/10"
    >
      {icon}
      {label}
    </Link>
  );
}

function IconNavLink({
  href,
  icon,
  label,
  solid = false,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  solid?: boolean;
}) {
  return (
    <Link
      href={href}
      aria-label={label}
      className={`flex h-10 w-10 items-center justify-center rounded-lg transition ${
        solid
          ? 'bg-veldt-green text-white shadow-sm'
          : 'text-veldt-green hover:bg-veldt-green/10'
      }`}
    >
      {icon}
    </Link>
  );
}
