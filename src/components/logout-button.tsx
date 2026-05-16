'use client';

import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { LogOut } from 'lucide-react';

export default function LogoutButton() {
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
      className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-100"
    >
      <LogOut className="h-4 w-4" />
      Logout
    </button>
  );
}
