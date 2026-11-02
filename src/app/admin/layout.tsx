import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import AdminWorkspaceShell from '@/components/admin/admin-workspace-shell';

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

  return <AdminWorkspaceShell username={profile.username}>{children}</AdminWorkspaceShell>;
}
