import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import LogoutButton from '@/components/logout-button';
import { Shield } from 'lucide-react';

export default async function JuriLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('username, role')
    .eq('id', user.id)
    .single();

  if (profile?.role === 'admin') redirect('/admin');

  const labelTipe =
    profile?.role === 'juri1'
      ? 'Juri 1 — PBB'
      : profile?.role === 'juri2'
        ? 'Juri 2 — PBB'
        : 'Juri 3 — Variasi & Formasi';

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="sticky top-0 z-30 border-b border-white/10 bg-blue-950 text-white shadow-lg shadow-blue-950/10">
        <div className="mx-auto flex min-h-[72px] max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orange-500 text-blue-950 shadow-sm">
              <Shield className="h-5 w-5" />
            </span>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-orange-300">Derap Juara · Juri</p>
              <h1 className="mt-0.5 text-sm font-bold leading-tight text-white sm:text-base">{labelTipe}</h1>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-3">
            <span className="hidden text-right text-xs font-medium text-blue-100 sm:block">
              {profile?.username}
            </span>
            <LogoutButton variant="dark" />
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl px-4 py-5 sm:px-6 sm:py-6 lg:px-8">{children}</main>
    </div>
  );
}
