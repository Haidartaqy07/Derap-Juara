'use client';

import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { LogOut } from 'lucide-react';

export default function LogoutButton({ variant = 'light' }: { variant?: 'light' | 'dark' }) {
  const router = useRouter();

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  }

  return (
    <button
      onClick={handleLogout}
      className={`flex min-h-11 items-center gap-1.5 rounded-xl px-3 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 ${
        variant === 'dark'
          ? 'border border-white/15 bg-white/10 text-white hover:bg-white/20'
          : 'text-slate-700 hover:bg-slate-100'
      }`}
    >
      <LogOut className="h-4 w-4" />
      {variant === 'dark' ? 'Keluar' : 'Logout'}
    </button>
  );
}
