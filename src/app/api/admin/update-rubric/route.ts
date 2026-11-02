import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { parseLdwcRubric } from '@/lib/ldwc-rubric';

export async function PUT(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();
  if (profileError || profile?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden — admin only' }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Body JSON tidak valid.' }, { status: 400 });
  }
  if (typeof body !== 'object' || body === null) {
    return NextResponse.json({ error: 'Data rubrik tidak valid.' }, { status: 400 });
  }

  const eventId = Reflect.get(body, 'eventId');
  if (typeof eventId !== 'string' || !eventId) {
    return NextResponse.json({ error: 'eventId wajib diisi.' }, { status: 400 });
  }

  let rubric;
  try {
    rubric = parseLdwcRubric(Reflect.get(body, 'rubric'));
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Rubrik tidak valid.' },
      { status: 400 },
    );
  }

  const { error } = await supabase.rpc('save_ldwc_event_rubric', {
    p_event_id: eventId,
    p_rubric: rubric,
  });
  if (error) {
    const status = error.message.includes('RUBRIC_LOCKED') ? 409 : 500;
    return NextResponse.json(
      {
        error:
          status === 409
            ? 'Rubrik terkunci karena juri sudah mulai menyimpan nilai.'
            : error.message,
      },
      { status },
    );
  }

  return NextResponse.json({ success: true });
}
