import { NextResponse } from 'next/server';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';

const ALLOWED_JUDGE_ROLES = ['juri1', 'juri2', 'juri3'] as const;
type JudgeRole = (typeof ALLOWED_JUDGE_ROLES)[number];

type CreateJudgeBody = {
  email?: unknown;
  password?: unknown;
  username?: unknown;
  tipeJuri?: unknown;
  eventId?: unknown;
};

function isJudgeRole(value: unknown): value is JudgeRole {
  return typeof value === 'string' && ALLOWED_JUDGE_ROLES.includes(value as JudgeRole);
}

export async function POST(req: Request) {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: profile, error: profileLookupError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();
  if (profileLookupError) {
    console.error('[create-judge] caller profile lookup failed:', profileLookupError.message);
    return NextResponse.json({ error: 'Tidak dapat memverifikasi akun admin.' }, { status: 500 });
  }
  if (profile?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden — admin only' }, { status: 403 });
  }

  let body: CreateJudgeBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Permintaan tidak valid.' }, { status: 400 });
  }

  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  const password = typeof body.password === 'string' ? body.password : '';
  const username = typeof body.username === 'string' ? body.username.trim() : '';
  const eventId = typeof body.eventId === 'string' ? body.eventId : '';
  const tipeJuri = body.tipeJuri;

  if (!email || !password || !username || !eventId || !tipeJuri) {
    return NextResponse.json({ error: 'Semua field wajib diisi.' }, { status: 400 });
  }

  if (email.length > 255 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: 'Format email tidak valid.' }, { status: 400 });
  }
  if (password.length < 6 || password.length > 128) {
    return NextResponse.json(
      { error: 'Password harus terdiri dari 6 sampai 128 karakter.' },
      { status: 400 },
    );
  }
  if (username.length > 100) {
    return NextResponse.json({ error: 'Username maksimal 100 karakter.' }, { status: 400 });
  }
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(eventId)) {
    return NextResponse.json({ error: 'Event tidak valid.' }, { status: 400 });
  }
  if (!isJudgeRole(tipeJuri)) {
    return NextResponse.json({ error: 'Tipe juri tidak valid' }, { status: 400 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    console.error('[create-judge] missing Supabase server environment variables');
    return NextResponse.json({ error: 'Layanan akun belum dikonfigurasi.' }, { status: 500 });
  }

  const admin = createAdminClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: event, error: eventError } = await admin
    .from('events')
    .select('id')
    .eq('id', eventId)
    .maybeSingle();
  if (eventError) {
    console.error('[create-judge] event lookup failed:', eventError.message);
    return NextResponse.json({ error: 'Event tidak dapat diverifikasi.' }, { status: 500 });
  }
  if (!event) {
    return NextResponse.json({ error: 'Event tidak ditemukan.' }, { status: 404 });
  }

  const { data: existingProfile, error: usernameLookupError } = await admin
    .from('profiles')
    .select('id')
    .eq('username', username)
    .maybeSingle();
  if (usernameLookupError) {
    console.error('[create-judge] username lookup failed:', usernameLookupError.message);
    return NextResponse.json({ error: 'Username tidak dapat diverifikasi.' }, { status: 500 });
  }
  if (existingProfile) {
    return NextResponse.json({ error: 'Username sudah digunakan.' }, { status: 409 });
  }

  const { data: assignedJudge, error: assignmentLookupError } = await admin
    .from('event_judges')
    .select('user_id')
    .eq('event_id', eventId)
    .eq('tipe_juri', tipeJuri)
    .limit(1);
  if (assignmentLookupError) {
    console.error('[create-judge] assignment lookup failed:', assignmentLookupError.message);
    return NextResponse.json({ error: 'Penugasan juri tidak dapat diverifikasi.' }, { status: 500 });
  }
  if (assignedJudge?.length) {
    return NextResponse.json(
      { error: 'Tipe juri tersebut sudah ditugaskan pada event ini.' },
      { status: 409 },
    );
  }

  const { data: newUser, error: createErr } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (createErr || !newUser.user) {
    const message = createErr?.message || 'Gagal membuat akun autentikasi.';
    const status = createErr?.code === 'email_exists' ? 409 : 400;
    return NextResponse.json({ error: message }, { status });
  }

  const { error: profileErr } = await admin
    .from('profiles')
    .insert({ id: newUser.user.id, username, role: tipeJuri });

  if (profileErr) {
    const { error: cleanupError } = await admin.auth.admin.deleteUser(newUser.user.id);
    if (cleanupError) {
      console.error('[create-judge] auth cleanup after profile insert failed:', cleanupError.message);
    }
    if (profileErr.code === '23505') {
      if (cleanupError) {
        return NextResponse.json(
          { error: 'Username sudah digunakan, tetapi akun sementara gagal dibersihkan. Hubungi administrator.' },
          { status: 500 },
        );
      }
      return NextResponse.json({ error: 'Username sudah digunakan.' }, { status: 409 });
    }
    console.error('[create-judge] profile insert failed:', profileErr.message);
    return NextResponse.json(
      {
        error: cleanupError
          ? 'Profil gagal disimpan dan akun Auth sementara gagal dibersihkan. Hubungi administrator.'
          : 'Profil akun gagal disimpan.',
      },
      { status: 500 },
    );
  }

  const { error: judgeErr } = await admin
    .from('event_judges')
    .insert({ event_id: eventId, user_id: newUser.user.id, tipe_juri: tipeJuri });

  if (judgeErr) {
    const { error: cleanupError } = await admin.auth.admin.deleteUser(newUser.user.id);
    if (cleanupError) {
      console.error('[create-judge] auth cleanup after assignment failed:', cleanupError.message);
    }
    if (judgeErr.code === '23505') {
      return NextResponse.json(
        {
          error: cleanupError
            ? 'Tipe juri sudah terisi, dan akun sementara gagal dibersihkan. Hubungi administrator.'
            : 'Tipe juri tersebut sudah ditugaskan pada event ini.',
        },
        { status: 409 },
      );
    }
    console.error('[create-judge] event assignment failed:', judgeErr.message);
    return NextResponse.json(
      {
        error: cleanupError
          ? 'Penugasan gagal dan akun sementara gagal dibersihkan. Hubungi administrator.'
          : 'Penugasan juri gagal.',
      },
      { status: 500 },
    );
  }

  return NextResponse.json({ success: true });
}
