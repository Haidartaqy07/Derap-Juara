CREATE TABLE IF NOT EXISTS public.event_award_announcements (
  event_id UUID PRIMARY KEY REFERENCES public.events(id) ON DELETE CASCADE,
  awards JSONB NOT NULL CHECK (jsonb_typeof(awards) = 'array'),
  announced_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  announced_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL
);

ALTER TABLE public.event_award_announcements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS event_award_announcements_public_read
  ON public.event_award_announcements;
CREATE POLICY event_award_announcements_public_read
  ON public.event_award_announcements
  FOR SELECT
  TO anon, authenticated
  USING (TRUE);

DROP POLICY IF EXISTS event_award_announcements_admin_manage
  ON public.event_award_announcements;
CREATE POLICY event_award_announcements_admin_manage
  ON public.event_award_announcements
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'event_award_announcements'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.event_award_announcements;
  END IF;
END;
$$;
