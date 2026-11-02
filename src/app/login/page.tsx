'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowRight,
  ClipboardList,
  Eye,
  EyeOff,
  LockKeyhole,
  Medal,
  ShieldCheck,
  Trophy,
  Users,
} from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
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
    <main className="relative flex min-h-[calc(100vh-76px)] items-center justify-center overflow-hidden bg-[#f7f8fc] px-4 py-8 sm:px-8">
      <div className="pointer-events-none absolute -left-32 top-20 h-80 w-80 rounded-full bg-blue-200/30 blur-3xl" />
      <div className="pointer-events-none absolute -right-32 bottom-0 h-96 w-96 rounded-full bg-orange-200/30 blur-3xl" />

      <div className="relative w-full max-w-5xl rounded-[2rem] border border-white bg-white p-2.5 shadow-[0_30px_90px_-40px_rgba(15,23,42,0.35)] sm:p-3">
        <div className="grid overflow-hidden rounded-[1.5rem] md:min-h-[590px] md:grid-cols-2">
          <section className="relative flex min-h-[330px] flex-col justify-between overflow-hidden bg-gradient-to-br from-blue-950 via-blue-900 to-slate-950 p-7 text-white sm:p-10 md:min-h-0">
            <div className="pointer-events-none absolute -right-16 -top-20 h-72 w-72 rounded-full border border-white/10" />
            <div className="pointer-events-none absolute -right-5 -top-9 h-56 w-56 rounded-full border border-orange-300/20" />
            <div className="pointer-events-none absolute bottom-0 left-0 h-1.5 w-3/4 bg-gradient-to-r from-orange-400 via-orange-300 to-transparent" />

            <div className="relative flex items-center gap-2.5">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/15 bg-white/10 text-orange-300">
                <Medal className="h-5 w-5" />
              </span>
              <span className="text-xs font-black tracking-[0.2em]">DERAP JUARA</span>
            </div>

            <div className="relative mt-10 md:mt-0">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-[0.15em] text-orange-200">
                <ShieldCheck className="h-3.5 w-3.5" />
                Platform lomba baris-berbaris
              </span>
              <h1 className="mt-5 max-w-md text-3xl font-black leading-tight tracking-tight sm:text-4xl">
                Kelola lomba,
                <span className="block text-orange-300">dari nilai sampai juara.</span>
              </h1>
              <p className="mt-4 max-w-md text-sm leading-6 text-blue-100/80">
                Satu platform untuk mengatur event, mendampingi penilaian juri, dan memantau hasil
                perlombaan Paskibra.
              </p>
            </div>

            <div className="relative mt-8 grid gap-2 sm:grid-cols-3 md:mt-0">
              <Feature icon={<ClipboardList className="h-4 w-4" />} label="Penilaian terarah" />
              <Feature icon={<Users className="h-4 w-4" />} label="Data peserta" />
              <Feature icon={<Trophy className="h-4 w-4" />} label="Rekap lomba" />
            </div>
          </section>

          <section className="flex items-center justify-center bg-white px-6 py-9 sm:px-10 md:px-12">
            <div className="w-full max-w-sm">
              <div className="mb-8">
                <div className="flex items-center gap-2 text-xs font-black tracking-[0.22em] text-blue-950">
                  <Medal className="h-4 w-4 text-orange-500" />
                  DERAP JUARA
                </div>
                <h2 className="mt-8 text-3xl font-black tracking-tight text-slate-950">Selamat datang</h2>
                <p className="mt-2 text-sm text-slate-500">Masuk untuk melanjutkan ke ruang kerja Anda.</p>
              </div>

              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label htmlFor="username" className="mb-1.5 block text-xs font-bold text-slate-700">
                    Username
                  </label>
                  <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 transition focus-within:border-blue-400 focus-within:bg-white focus-within:ring-4 focus-within:ring-blue-100">
                    <Users className="h-4 w-4 shrink-0 text-slate-400" />
                    <input
                      id="username"
                      type="text"
                      required
                      autoComplete="username"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="w-full bg-transparent py-3.5 text-sm text-slate-900 outline-none placeholder:text-slate-400"
                      placeholder="Masukkan username"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="password" className="mb-1.5 block text-xs font-bold text-slate-700">
                    Password
                  </label>
                  <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 transition focus-within:border-blue-400 focus-within:bg-white focus-within:ring-4 focus-within:ring-blue-100">
                    <LockKeyhole className="h-4 w-4 shrink-0 text-slate-400" />
                    <input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      required
                      autoComplete="current-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full bg-transparent py-3.5 text-sm text-slate-900 outline-none placeholder:text-slate-400"
                      placeholder="Masukkan password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((visible) => !visible)}
                      aria-label={showPassword ? 'Sembunyikan password' : 'Tampilkan password'}
                      className="shrink-0 rounded-md p-1 text-slate-400 transition hover:text-blue-950"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {error && (
                  <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="group mt-2 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-orange-500 px-4 py-3.5 text-sm font-extrabold text-white shadow-lg shadow-orange-500/20 transition duration-200 hover:-translate-y-0.5 hover:bg-orange-600 disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? 'Memproses...' : 'Masuk'}
                  {!loading && <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />}
                </button>
              </form>

              <p className="mt-6 text-center text-xs leading-5 text-slate-500">
                Gunakan akun admin atau juri yang telah diberikan panitia.
              </p>
              <div className="mt-7 flex items-center justify-center gap-2 border-t border-slate-100 pt-5 text-[11px] font-medium text-slate-400">
                <LockKeyhole className="h-3.5 w-3.5" />
                Akses aman untuk pengelola dan juri
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}

function Feature({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.07] px-3 py-2.5 text-[10px] font-bold text-blue-50/90 backdrop-blur transition hover:border-orange-300/30 hover:bg-white/10">
      <span className="text-orange-300">{icon}</span>
      {label}
    </div>
  );
}
