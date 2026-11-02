'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  CalendarDays,
  ChevronRight,
  Menu,
  Medal,
  Settings,
  Shield,
  Users,
  X,
} from 'lucide-react';
import LogoutButton from '@/components/logout-button';

const navigation = [
  { href: '/admin', label: 'Event', icon: CalendarDays },
  { href: '/admin/users', label: 'User Juri', icon: Users },
];

export default function AdminWorkspaceShell({
  username,
  children,
}: {
  username: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pageTitle = pathname.startsWith('/admin/users') ? 'Pengguna' : 'Event';

  function isActive(href: string) {
    return href === '/admin' ? pathname === '/admin' || pathname.startsWith('/admin/events/') : pathname.startsWith(href);
  }

  return (
    <div className="min-h-screen bg-[#f7f8fc] text-slate-950 md:flex">
      {sidebarOpen && (
        <button
          type="button"
          aria-label="Tutup menu navigasi"
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 z-40 bg-slate-950/40 md:hidden"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-[min(82vw,280px)] flex-col bg-blue-950 text-white shadow-2xl transition-transform duration-300 md:sticky md:top-0 md:z-20 md:h-screen md:w-64 md:translate-x-0 md:shadow-none ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex h-[76px] items-center justify-between border-b border-white/10 px-5">
          <Link href="/admin" className="flex items-center gap-3" onClick={() => setSidebarOpen(false)}>
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-orange-300">
              <Medal className="h-5 w-5" />
            </span>
            <span>
              <span className="block text-xs font-black tracking-[0.16em]">DERAP JUARA</span>
              <span className="mt-0.5 block text-[10px] font-medium text-blue-200/70">ADMIN WORKSPACE</span>
            </span>
          </Link>
          <button
            type="button"
            aria-label="Tutup menu"
            onClick={() => setSidebarOpen(false)}
            className="rounded-lg p-2 text-blue-100 hover:bg-white/10 md:hidden"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="px-4 pt-7">
          <p className="px-3 text-[10px] font-extrabold uppercase tracking-[0.18em] text-blue-200/55">
            Menu utama
          </p>
          <nav aria-label="Navigasi admin" className="mt-3 space-y-1.5">
            {navigation.map(({ href, label, icon: Icon }) => {
              const active = isActive(href);
              return (
                <Link
                  key={href}
                  href={href}
                  aria-current={active ? 'page' : undefined}
                  onClick={() => setSidebarOpen(false)}
                  className={`group flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold transition duration-200 ${
                    active
                      ? 'bg-orange-500 text-white shadow-lg shadow-orange-950/20'
                      : 'text-blue-100/75 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <Icon className={`h-4.5 w-4.5 ${active ? 'text-white' : 'text-blue-200/70 group-hover:text-orange-200'}`} />
                  <span className="flex-1">{label}</span>
                  {active && <ChevronRight className="h-4 w-4" />}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="mt-auto p-4">
          <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-4">
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-400/15 text-orange-200">
                <Settings className="h-4 w-4" />
              </span>
              <span>
                <span className="block text-xs font-bold text-white">Panel pengelola</span>
                <span className="mt-0.5 block text-[10px] text-blue-100/55">Derap Juara</span>
              </span>
            </div>
          </div>
          <Link
            href="/"
            className="mt-4 flex items-center gap-2 px-2 py-2 text-xs font-semibold text-blue-100/60 transition hover:text-white"
          >
            <Shield className="h-3.5 w-3.5" />
            Kembali ke halaman publik
          </Link>
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/90 backdrop-blur-xl">
          <div className="flex h-[76px] items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
            <div className="flex min-w-0 items-center gap-3">
              <button
                type="button"
                aria-label={sidebarOpen ? 'Tutup menu' : 'Buka menu'}
                aria-expanded={sidebarOpen}
                onClick={() => setSidebarOpen((open) => !open)}
                className="rounded-xl border border-slate-200 bg-white p-2 text-blue-950 shadow-sm transition hover:border-orange-200 hover:bg-orange-50 md:hidden"
              >
                {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>
              <div className="min-w-0">
                <p className="truncate text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">
                  Admin / {pageTitle}
                </p>
                <h1 className="mt-0.5 truncate text-lg font-black text-blue-950">{pageTitle}</h1>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2 sm:gap-4">
              <div className="hidden text-right sm:block">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Masuk sebagai</p>
                <p className="text-sm font-bold text-slate-700">{username}</p>
              </div>
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-950 text-xs font-black uppercase text-orange-200">
                {username.slice(0, 1)}
              </span>
              <LogoutButton />
            </div>
          </div>
        </header>

        <main className="mx-auto w-full max-w-[1600px] p-4 sm:p-6 lg:p-8">
          <div key={pathname} className="admin-content-enter">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
