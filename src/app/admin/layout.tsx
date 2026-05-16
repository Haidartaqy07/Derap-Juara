import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import LogoutButton from '@/components/logout-button';
import { Shield, Calendar, Users, ListOrdered, Trophy, Vote, Settings } from 'lucide-react';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
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

  if (profile?.role !== 'admin') redirect('/juri');

  return (
    <div className="min-h-screen">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <Shield className="h-6 w-6 text-blue-600" />
            <h1 className="text-lg font-bold text-slate-900">Admin Panel</h1>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-slate-600">{profile?.username}</span>
            <LogoutButton />
          </div>
        </div>
        <nav className="mx-auto max-w-7xl px-4">
          <div className="flex gap-1 overflow-x-auto pb-2">
            <NavLink href="/admin" icon={<Calendar className="h-4 w-4" />} label="Event" />
            <NavLink href="/admin/users" icon={<Users className="h-4 w-4" />} label="User Juri" />
          </div>
        </nav>
      </header>
      <main className="mx-auto max-w-7xl p-4">{children}</main>
    </div>
  );
}

function NavLink({ href, icon, label }: { href: string; icon: React.ReactNode; label: string }) {
  return (
    <Link
      href={href}
      className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
    >
      {icon}
      {label}
    </Link>
  );
}
