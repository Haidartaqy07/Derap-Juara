-- Replace legacy immutable-submission triggers with an admin-aware guard so
-- administrators can unlock finalized scores without allowing judge edits.

DO $$
DECLARE
  stale_trigger RECORD;
BEGIN
  FOR stale_trigger IN
    SELECT
      trigger_info.tgname,
      schema_info.nspname AS schema_name,
      table_info.relname AS table_name
    FROM pg_trigger AS trigger_info
    JOIN pg_class AS table_info
      ON table_info.oid = trigger_info.tgrelid
    JOIN pg_namespace AS schema_info
      ON schema_info.oid = table_info.relnamespace
    JOIN pg_proc AS trigger_function
      ON trigger_function.oid = trigger_info.tgfoid
    WHERE schema_info.nspname = 'public'
      AND table_info.relname IN ('pbb_submissions', 'variasi_submissions')
      AND NOT trigger_info.tgisinternal
      AND trigger_function.prosrc ILIKE '%records cannot be updated%'
  LOOP
    EXECUTE format(
      'DROP TRIGGER %I ON %I.%I',
      stale_trigger.tgname,
      stale_trigger.schema_name,
      stale_trigger.table_name
    );
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION public.prevent_finalized_submission_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  IF OLD.submitted IS TRUE AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'Submitted % records cannot be updated', TG_TABLE_NAME
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prevent_finalized_pbb_submission_update ON public.pbb_submissions;
CREATE TRIGGER prevent_finalized_pbb_submission_update
  BEFORE UPDATE ON public.pbb_submissions
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_finalized_submission_update();

DROP TRIGGER IF EXISTS prevent_finalized_variasi_submission_update ON public.variasi_submissions;
CREATE TRIGGER prevent_finalized_variasi_submission_update
  BEFORE UPDATE ON public.variasi_submissions
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_finalized_submission_update();
