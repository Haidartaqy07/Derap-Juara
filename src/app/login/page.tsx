'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ArrowRight, Check, Medal, Shield, Users } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const result: { role?: string; error?: string } = await response.json();

      if (!response.ok || !result.role) {
        setError(result.error || 'Username atau password salah');
        return;
      }

      router.push(result.role === 'admin' ? '/admin' : '/juri');
      router.refresh();
    } catch {
      setError('Tidak dapat terhubung. Periksa koneksi lalu coba lagi.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#f7f8fc] text-slate-950">
      <div className="pointer-events-none absolute -left-40 top-28 h-96 w-96 rounded-full bg-blue-200/35 blur-3xl" />
      <div className="pointer-events-none absolute -right-24 bottom-0 h-96 w-96 rounded-full bg-orange-200/30 blur-3xl" />

      <header className="relative z-10 border-b border-slate-200/70 bg-[#f7f8fc]/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-2 sm:px-8 lg:px-12">
          <Link href="/" className="flex items-center gap-2.5" aria-label="Derap Juara, beranda">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-950 text-white shadow-md shadow-blue-950/15">
              <Medal className="h-5 w-5" />
            </span>
            <span className="text-sm font-black tracking-[0.12em] text-blue-950">DERAP JUARA</span>
          </Link>
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm font-bold text-slate-600 transition hover:text-blue-950"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Kembali ke beranda</span>
            <span className="sm:hidden">Beranda</span>
          </Link>
        </div>
      </header>

      <div className="relative mx-auto grid min-h-[calc(100svh-57px)] max-w-7xl items-center gap-8 px-5 py-6 sm:px-8 lg:grid-cols-[1fr_0.85fr] lg:gap-12 lg:px-12 lg:py-6">
        <section className="relative z-10 hidden max-w-xl lg:block">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-orange-200 bg-white/80 px-3.5 py-2 text-[10px] font-extrabold uppercase tracking-[0.2em] text-blue-950 shadow-sm">
            <span className="h-2 w-2 rounded-full bg-orange-500" />
            Platform perlombaan Paskibra
          </div>
          <p className="text-sm font-extrabold tracking-[0.28em] text-orange-600">DERAP JUARA</p>
          <h1 className="mt-2 text-5xl font-black leading-[1.05] tracking-tight text-blue-950 xl:text-6xl">
            Selamat datang
            <span className="block text-orange-500">kembali.</span>
          </h1>
          <p className="mt-4 max-w-lg text-lg leading-8 text-slate-600">
            Masuk untuk mengelola lomba, melanjutkan penilaian, dan memantau hasil perlombaan
            Paskibra.
          </p>

          <div className="relative mt-6 flex min-h-52 items-center justify-center">
            <div className="absolute h-52 w-52 rounded-full border border-blue-200/80" />
            <div className="absolute h-40 w-40 rounded-full border border-orange-200/80" />
            <div className="relative flex h-32 w-32 items-center justify-center rounded-[2rem] bg-gradient-to-br from-blue-950 via-blue-900 to-slate-800 text-orange-300 shadow-[0_35px_80px_-25px_rgba(23,37,84,0.65)] ring-8 ring-white/80">
              <Shield className="absolute h-20 w-20 stroke-[1.2]" />
              <Medal className="h-12 w-12" />
            </div>
            <div className="absolute left-0 top-5 rounded-2xl border border-white bg-white/90 p-3.5 shadow-lg shadow-blue-950/10">
              <div className="flex items-center gap-2.5">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-100 text-blue-950">
                  <Users className="h-4 w-4" />
                </span>
                <span>
                  <span className="block text-xs font-extrabold text-slate-800">Admin dan juri</span>
                  <span className="block text-[10px] text-slate-500">Satu platform terintegrasi</span>
                </span>
              </div>
            </div>
            <div className="absolute bottom-3 right-0 rounded-2xl border border-white bg-white p-3.5 shadow-xl shadow-blue-950/10">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
                  <Check className="h-4 w-4" />
                </span>
                Rekap nilai terpusat
              </div>
            </div>
          </div>
        </section>

        <section className="relative z-10 mx-auto w-full max-w-md">
          <div className="rounded-3xl border border-white bg-white p-5 shadow-2xl shadow-blue-950/10 sm:p-7">
            <div className="mb-5">
              <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-100 text-blue-950">
                <Shield className="h-6 w-6" />
              </div>
              <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-orange-600">
                Akses akun
              </p>
              <h2 className="mt-1.5 text-3xl font-black tracking-tight text-blue-950">
                Masuk ke aplikasi
              </h2>
              <p className="mt-1.5 text-sm leading-5 text-slate-500">
                Gunakan akun admin atau juri untuk melanjutkan.
              </p>
            </div>

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label htmlFor="username" className="mb-1.5 block text-sm font-bold text-slate-700">
                  Username
                </label>
                <input
                  id="username"
                  type="text"
                  required
                  autoComplete="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-300 focus:bg-white focus:ring-4 focus:ring-blue-100"
                  placeholder="Masukkan username"
                />
              </div>

              <div>
                <label htmlFor="password" className="mb-1.5 block text-sm font-bold text-slate-700">
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-300 focus:bg-white focus:ring-4 focus:ring-blue-100"
                  placeholder="Masukkan password"
                />
              </div>

              {error && (
                <div
                  role="alert"
                  className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700"
                >
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-950 px-5 py-3 text-sm font-extrabold text-white shadow-xl shadow-blue-950/20 transition hover:-translate-y-0.5 hover:bg-blue-900 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? 'Memproses...' : 'Masuk'}
                {!loading && <ArrowRight className="h-4 w-4" />}
              </button>
            </form>

            <p className="mt-4 text-center text-xs leading-5 text-slate-500">
              Akun hanya diberikan oleh pengelola event.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
