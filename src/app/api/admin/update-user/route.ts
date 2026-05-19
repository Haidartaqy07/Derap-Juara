import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } },
);

const ALLOWED_ROLES = ['admin', 'juri_1', 'juri_2', 'juri_3'] as const;
type Role = (typeof ALLOWED_ROLES)[number];

export async function PUT(req: Request) {
  try {
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