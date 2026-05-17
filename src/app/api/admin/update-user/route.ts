import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } },
);

export async function PUT(req: Request) {
  try {
    const { userId, username, email, password } = await req.json();

    if (!userId || !username?.trim()) {
      return NextResponse.json({ error: 'userId dan username wajib diisi' }, { status: 400 });
    }

    // Update email dan/atau password di Supabase Auth jika disertakan
    const authUpdates: { email?: string; password?: string } = {};
    if (email && email.trim()) authUpdates.email = email.trim();
    if (password && password.trim().length >= 6) authUpdates.password = password.trim();

    if (Object.keys(authUpdates).length > 0) {
      const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(
        userId,
        authUpdates,
      );
      if (authError) {
        return NextResponse.json({ error: authError.message }, { status: 500 });
      }
    }

    // Update username di tabel profiles
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .update({ username: username.trim() })
      .eq('id', userId);

    if (profileError) {
      return NextResponse.json({ error: profileError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}