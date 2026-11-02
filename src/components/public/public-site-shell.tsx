'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ArrowLeft, ArrowRight, Medal } from 'lucide-react';

const links = [
  { label: 'Beranda', href: '/' },
  { label: 'Event', href: '/events' },
  { label: 'Voting', href: '/voting' },
  { label: 'Pengumuman', href: '/pengumuman' },
];

export default function PublicSiteShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isWorkspace = pathname.startsWith('/admin') || pathname.startsWith('/juri');
  const showNavigation = !isWorkspace && pathname !== '/login';

  return (
    <>
      {showNavigation && (
        <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-[#f7f8fc]/95 backdrop-blur-xl">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-5 py-3 sm:px-8 lg:px-12">
            <Link
              href="/"
              className="flex shrink-0 items-center gap-2.5"
              aria-label="Derap Juara, beranda"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-950 text-orange-300 shadow-md shadow-blue-950/15">
                <Medal className="h-5 w-5" />
              </span>
              <span className="text-xs font-black tracking-[0.12em] text-blue-950 sm:text-sm">
                DERAP JUARA
              </span>
            </Link>

            <nav
              aria-label="Navigasi utama"
              className="order-3 flex w-full items-center justify-center gap-1 overflow-x-auto rounded-full border border-slate-200 bg-white p-1.5 shadow-sm sm:order-none sm:absolute sm:left-1/2 sm:w-auto sm:-translate-x-1/2"
            >
              {links.map(({ label, href }) => {
                const active =
                  href === '/'
                    ? pathname === '/'
                    : pathname === href || pathname.startsWith(`${href}/`);
                return (
                  <Link
                    key={href}
                    href={href}
                    aria-current={active ? 'page' : undefined}
                    className={`shrink-0 rounded-full px-3 py-2 text-xs font-bold transition duration-200 sm:px-4 ${
                      active
                        ? 'bg-blue-950 text-white shadow-sm'
                        : 'text-slate-500 hover:bg-orange-50 hover:text-blue-950'
                    }`}
                  >
                    {label}
                  </Link>
                );
              })}
            </nav>

            <Link
              href={pathname === '/login' ? '/' : '/login'}
              className="inline-flex shrink-0 items-center gap-2 rounded-full bg-orange-500 px-4 py-2.5 text-xs font-extrabold text-white shadow-lg shadow-orange-500/20 transition duration-200 hover:-translate-y-0.5 hover:bg-orange-600 sm:px-5 sm:text-sm"
            >
              {pathname === '/login' ? 'Beranda' : 'Masuk'}
              {pathname === '/login' ? (
                <ArrowLeft className="h-4 w-4" />
              ) : (
                <ArrowRight className="h-4 w-4" />
              )}
            </Link>
          </div>
        </header>
      )}
      <div key={pathname} className="page-transition">
        {children}
      </div>
    </>
  );
}
