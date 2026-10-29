import { createClient as createAdminClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { createClient as createServerClient } from '@/lib/supabase/server';

const admin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export async function POST(request: Request) {
  let body: { username?: unknown; password?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Permintaan tidak valid.' }, { status: 400 });
  }

  const username = typeof body.username === 'string' ? body.username.trim() : '';
  const password = typeof body.password === 'string' ? body.password : '';
  if (!username || !password || username.length > 100 || password.length > 128) {
    return NextResponse.json({ error: 'Username atau password salah.' }, { status: 401 });
  }

  const { data: profile, error: profileError } = await admin
    .from('profiles')
    .select('id')
    .eq('username', username)
    .maybeSingle();

  if (profileError) {
    console.error('[auth/login] profile lookup failed:', profileError.message);
    return NextResponse.json({ error: 'Login belum dapat diproses. Coba lagi.' }, { status: 500 });
  }
  if (!profile) {
    return NextResponse.json({ error: 'Username atau password salah.' }, { status: 401 });
  }

  const { data: authUser, error: authUserError } = await admin.auth.admin.getUserById(profile.id);
  if (authUserError) {
    console.error('[auth/login] auth user lookup failed:', authUserError.message);
    return NextResponse.json({ error: 'Login belum dapat diproses. Coba lagi.' }, { status: 500 });
  }
  if (!authUser.user.email) {
    return NextResponse.json({ error: 'Username atau password salah.' }, { status: 401 });
  }

  const supabase = await createServerClient();
  const { data, error: signInError } = await supabase.auth.signInWithPassword({
    email: authUser.user.email,
    password,
  });

  if (signInError || !data.user) {
    return NextResponse.json({ error: 'Username atau password salah.' }, { status: 401 });
  }

  const { data: signedInProfile, error: signedInProfileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', data.user.id)
    .single();

  if (signedInProfileError || !signedInProfile) {
    console.error('[auth/login] signed-in profile lookup failed:', signedInProfileError?.message);
    await supabase.auth.signOut();
    return NextResponse.json({ error: 'Profil akun tidak ditemukan.' }, { status: 403 });
  }

  return NextResponse.json({ role: signedInProfile.role });
}
