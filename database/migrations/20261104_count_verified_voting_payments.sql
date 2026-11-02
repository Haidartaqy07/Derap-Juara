ALTER TABLE public.voting_payments
  ADD COLUMN IF NOT EXISTS votes_counted_at TIMESTAMPTZ;

CREATE OR REPLACE FUNCTION public.count_verified_voting_payment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    NEW.votes_counted_at := NULL;
  ELSIF OLD.status = 'paid' AND NEW.status <> 'paid' THEN
    RAISE EXCEPTION 'A verified voting payment cannot leave paid status';
  END IF;

  IF NEW.status = 'paid' AND NEW.votes_counted_at IS NULL THEN
    NEW.paid_at := COALESCE(NEW.paid_at, NOW());

    UPDATE public.participants
    SET vote_count = COALESCE(vote_count, 0) + NEW.quantity
    WHERE id = NEW.participant_id
      AND event_id = NEW.event_id;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Participant does not belong to the payment event';
    END IF;

    NEW.votes_counted_at := NOW();
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.count_verified_voting_payment() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS count_verified_voting_payment ON public.voting_payments;
CREATE TRIGGER count_verified_voting_payment
  BEFORE INSERT OR UPDATE OF status ON public.voting_payments
  FOR EACH ROW
  EXECUTE FUNCTION public.count_verified_voting_payment();

UPDATE public.voting_payments
SET status = 'paid'
WHERE status = 'paid'
  AND votes_counted_at IS NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'participants'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.participants;
  END IF;
END;
$$;
