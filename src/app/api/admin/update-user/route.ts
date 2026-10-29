import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { createClient as createServerClient } from '@/lib/supabase/server';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } },
);

const ALLOWED_ROLES = ['admin', 'juri1', 'juri2', 'juri3'] as const;
type Role = (typeof ALLOWED_ROLES)[number];

export async function PUT(req: Request) {
  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: callerProfile, error: authorizationError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();
    if (authorizationError || callerProfile?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden — admin only' }, { status: 403 });
    }

    const { userId, username, email, password, role } = await req.json();

    if (!userId || !username?.trim()) {
      return NextResponse.json({ error: 'userId dan username wajib diisi' }, { status: 400 });
    }

    if (role && !ALLOWED_ROLES.includes(role as Role)) {
      return NextResponse.json({ error: 'Role tidak valid' }, { status: 400 });
    }

    // ── 1. Update email dan/atau password di Supabase Auth ──
    const authUpdates: { email?: string; password?: string } = {};
    if (email?.trim()) authUpdates.email = email.trim();
    if (password?.trim().length >= 6) authUpdates.password = password.trim();

    if (Object.keys(authUpdates).length > 0) {
      const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(
        userId,
        authUpdates,
      );
      if (authError) {
        return NextResponse.json({ error: authError.message }, { status: 500 });
      }
    }

    // ── 2. Update profiles (username + role opsional) ──
    const profileUpdates: { username: string; role?: string } = {
      username: username.trim(),
    };
    if (role) profileUpdates.role = role;

    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .update(profileUpdates)
      .eq('id', userId);

    if (profileError) {
      return NextResponse.json({ error: profileError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}