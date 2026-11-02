-- LDWC 2026 scoring support for the existing participants-based schema.
-- Existing events and submitted scores are preserved; existing events are marked LEGACY.

DO $$
DECLARE
  missing_objects TEXT[];
BEGIN
  SELECT array_agg(required.object_name)
  INTO missing_objects
  FROM (VALUES
    ('public.events'),
    ('public.participants'),
    ('public.profiles'),
    ('public.event_judges'),
    ('public.pbb_submissions'),
    ('public.variasi_submissions')
  ) AS required(object_name)
  WHERE to_regclass(required.object_name) IS NULL;

  IF missing_objects IS NOT NULL THEN
    RAISE EXCEPTION
      'LDWC migration prerequisites missing: %. Apply the existing participants-based schema migrations first.',
      array_to_string(missing_objects, ', ');
  END IF;
END;
$$;

ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS scoring_template TEXT,
  ADD COLUMN IF NOT EXISTS categories TEXT[] NOT NULL DEFAULT ARRAY['U15', 'U19']::TEXT[];

UPDATE public.events
SET scoring_template = 'LEGACY'
WHERE scoring_template IS NULL;

ALTER TABLE public.events
  ALTER COLUMN scoring_template SET DEFAULT 'LDWC_2026',
  ALTER COLUMN scoring_template SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.events'::regclass
      AND conname = 'events_scoring_template_check'
  ) THEN
    ALTER TABLE public.events
      ADD CONSTRAINT events_scoring_template_check
      CHECK (scoring_template IN ('LDWC_2026', 'LEGACY'));
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.events'::regclass
      AND conname = 'events_categories_check'
  ) THEN
    ALTER TABLE public.events
      ADD CONSTRAINT events_categories_check
      CHECK (
        cardinality(categories) > 0
        AND categories <@ ARRAY['U15', 'U19']::TEXT[]
      );
  END IF;
END;
$$;

ALTER TABLE public.participants
  ADD COLUMN IF NOT EXISTS category TEXT NOT NULL DEFAULT 'U15';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.participants'::regclass
      AND conname = 'participants_category_check'
  ) THEN
    ALTER TABLE public.participants
      ADD CONSTRAINT participants_category_check CHECK (category IN ('U15', 'U19'));
  END IF;
END;
$$;

DO $$
DECLARE
  existing_check RECORD;
BEGIN
  FOR existing_check IN
    SELECT conname
    FROM pg_constraint
    WHERE conrelid = 'public.profiles'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) ILIKE '%role%'
  LOOP
    EXECUTE format('ALTER TABLE public.profiles DROP CONSTRAINT %I', existing_check.conname);
  END LOOP;

  ALTER TABLE public.profiles
    ADD CONSTRAINT profiles_role_check
    CHECK (role IN ('admin', 'juri1', 'juri2', 'juri3'));
END;
$$;

DO $$
DECLARE
  existing_check RECORD;
BEGIN
  FOR existing_check IN
    SELECT conname
    FROM pg_constraint
    WHERE conrelid = 'public.event_judges'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) ILIKE '%tipe_juri%'
  LOOP
    EXECUTE format('ALTER TABLE public.event_judges DROP CONSTRAINT %I', existing_check.conname);
  END LOOP;

  ALTER TABLE public.event_judges
    ADD CONSTRAINT event_judges_tipe_juri_check
    CHECK (tipe_juri IN ('juri1', 'juri2', 'juri3'));
END;
$$;
