ALTER TABLE public.pbb_submissions
  ADD COLUMN IF NOT EXISTS draft_submitted_at TIMESTAMPTZ;

ALTER TABLE public.variasi_submissions
  ADD COLUMN IF NOT EXISTS draft_submitted_at TIMESTAMPTZ;

CREATE OR REPLACE FUNCTION public.guard_submission_finalization()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND NOT public.is_admin() THEN
    IF TG_OP = 'INSERT' THEN
      IF NEW.submitted IS DISTINCT FROM FALSE OR NEW.submitted_at IS NOT NULL THEN
        RAISE EXCEPTION 'Hanya admin yang dapat memfinalkan penilaian.'
          USING ERRCODE = '42501';
      END IF;
    ELSIF NEW.submitted IS DISTINCT FROM OLD.submitted
       OR NEW.submitted_at IS DISTINCT FROM OLD.submitted_at THEN
      RAISE EXCEPTION 'Hanya admin yang dapat memfinalkan penilaian.'
        USING ERRCODE = '42501';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS guard_pbb_submission_finalization ON public.pbb_submissions;
CREATE TRIGGER guard_pbb_submission_finalization
  BEFORE INSERT OR UPDATE ON public.pbb_submissions
  FOR EACH ROW
  EXECUTE FUNCTION public.guard_submission_finalization();

DROP TRIGGER IF EXISTS guard_variasi_submission_finalization ON public.variasi_submissions;
CREATE TRIGGER guard_variasi_submission_finalization
  BEFORE INSERT OR UPDATE ON public.variasi_submissions
  FOR EACH ROW
  EXECUTE FUNCTION public.guard_submission_finalization();
