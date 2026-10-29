import { createClient as createAdminClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { createClient as createServerClient } from '@/lib/supabase/server';

const admin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export async function DELETE(req: Request) {
  const supabase = await createServerClient();
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

  let eventId: string;
  try {
    ({ eventId } = await req.json());
  } catch {
    return NextResponse.json({ error: 'Body JSON tidak valid.' }, { status: 400 });
  }
  if (!eventId) return NextResponse.json({ error: 'eventId wajib diisi' }, { status: 400 });

  const { data: participants, error: participantReadError } = await admin
    .from('participants')
    .select('id')
    .eq('event_id', eventId);
  if (participantReadError) {
    return NextResponse.json({ error: participantReadError.message }, { status: 500 });
  }
  const participantIds = (participants ?? []).map(({ id }) => id);

  const steps: Array<() => PromiseLike<{ error: { message: string } | null }>> = [];
  if (participantIds.length > 0) {
    steps.push(
      () => admin.from('deductions').delete().in('participant_id', participantIds),
      () => admin.from('pbb_submissions').delete().in('participant_id', participantIds),
      () => admin.from('variasi_submissions').delete().in('participant_id', participantIds),
      () => admin.from('participants').delete().in('id', participantIds)
    );
  }
  steps.push(
    () => admin.from('event_judges').delete().eq('event_id', eventId),
    () => admin.from('indikator_pbb').delete().eq('event_id', eventId),
    () => admin.from('events').delete().eq('id', eventId)
  );

  for (const step of steps) {
    const { error } = await step();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
