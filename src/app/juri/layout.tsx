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
        : 'Juri 3 — Variasi Formasi';

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <Shield className="h-6 w-6 text-blue-600" />
            <div>
              <h1 className="text-sm font-bold leading-tight text-slate-900">{labelTipe}</h1>
              <p className="text-xs text-slate-500">{profile?.username}</p>
            </div>
          </div>
          <LogoutButton />
        </div>
      </header>
      <main className="mx-auto max-w-5xl p-4">{children}</main>
    </div>
  );
}
