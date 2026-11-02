import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { LDWC_DEFAULT_RUBRIC } from '@/lib/ldwc-rubric';

function isPublicImageUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:';
  } catch {
    return false;
  }
}

function isValidTime(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    /^(?:[01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/.test(value)
  );
}

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } },
);

export async function PUT(req: Request) {
  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();
    if (profileError || profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden — admin only' }, { status: 403 });
    }

    const {
      eventId,
      name,
      description,
      image_url,
      location,
      date,
      start_time,
      end_time,
      batas_waktu_detik,
      status,
      scoring_template,
      categories,
    } = await req.json();

    if (
      !eventId ||
      typeof name !== 'string' ||
      !name.trim() ||
      typeof description !== 'string' ||
      description.length > 5000 ||
      (image_url !== null &&
        image_url !== undefined &&
        (typeof image_url !== 'string' || !isPublicImageUrl(image_url))) ||
      typeof location !== 'string' ||
      !location.trim() ||
      !date ||
      (start_time != null && start_time !== '' && !isValidTime(start_time)) ||
      (end_time != null && end_time !== '' && !isValidTime(end_time)) ||
      (start_time && end_time && start_time > end_time)
    ) {
      return NextResponse.json(
        { error: 'eventId, name, location, dan date wajib diisi' },
        { status: 400 },
      );
    }

    const ALLOWED_STATUS = ['draft', 'aktif', 'selesai'];
    if (status && !ALLOWED_STATUS.includes(status)) {
      return NextResponse.json({ error: 'Status tidak valid' }, { status: 400 });
    }
    if (!['LDWC_2026', 'LEGACY'].includes(scoring_template)) {
      return NextResponse.json({ error: 'Template penilaian tidak valid' }, { status: 400 });
    }
    if (
      !Array.isArray(categories) ||
      categories.length === 0 ||
      categories.some((category) => !['U15', 'U19'].includes(category)) ||
      new Set(categories).size !== categories.length
    ) {
      return NextResponse.json({ error: 'Pilih setidaknya satu kategori yang valid.' }, { status: 400 });
    }
    const duration = Number(batas_waktu_detik);
    if (!Number.isInteger(duration) || duration < 60 || duration > 3600) {
      return NextResponse.json({ error: 'Batas waktu harus antara 1 dan 60 menit.' }, { status: 400 });
    }

    const { data: currentEvent, error: eventReadError } = await supabaseAdmin
      .from('events')
      .select('scoring_template, rubric')
      .eq('id', eventId)
      .single();
    if (eventReadError || !currentEvent) {
      return NextResponse.json({ error: eventReadError?.message ?? 'Event tidak ditemukan.' }, { status: 404 });
    }

    if (currentEvent.scoring_template !== scoring_template) {
      const results = await Promise.all([
        supabaseAdmin.from('pbb_submissions').select('submitted, pbb_scores, danton_scores').eq('event_id', eventId),
        supabaseAdmin.from('variasi_submissions').select('submitted, scores').eq('event_id', eventId),
      ]);
      const failedRead = results.find((result) => result.error);
      if (failedRead?.error) {
        return NextResponse.json({ error: failedRead.error.message }, { status: 500 });
      }
      const hasExistingScores = results.some((result) =>
        result.data?.some((submission) => {
          const record = submission as Record<string, unknown>;
          return (
            record.submitted === true ||
            Object.values(record).some((value) => Array.isArray(value) && value.length > 0)
          );
        })
      );
      if (hasExistingScores) {
        return NextResponse.json(
          { error: 'Template tidak dapat diubah karena event sudah memiliki draf atau nilai penilaian.' },
          { status: 409 },
        );
      }
    }

    const { data: participants, error: participantReadError } = await supabaseAdmin
      .from('participants')
      .select('category')
      .eq('event_id', eventId);
    if (participantReadError) {
      return NextResponse.json({ error: participantReadError.message }, { status: 500 });
    }
    if ((participants ?? []).some((participant) => !categories.includes(participant.category))) {
      return NextResponse.json(
        { error: 'Kategori event tidak boleh menghapus kategori yang sudah dipakai peserta.' },
        { status: 409 },
      );
    }

    const { error } = await supabaseAdmin
      .from('events')
      .update({
        name: name.trim(),
        description: description.trim(),
        image_url: image_url?.trim() || null,
        location: location.trim(),
        date,
        start_time: start_time || null,
        end_time: end_time || null,
        batas_waktu_detik: duration,
        scoring_template,
        rubric:
          currentEvent.rubric ??
          (scoring_template === 'LDWC_2026' ? LDWC_DEFAULT_RUBRIC : null),
        categories,
        ...(status ? { status } : {}),
      })
      .eq('id', eventId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}