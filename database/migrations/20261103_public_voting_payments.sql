CREATE TABLE IF NOT EXISTS public.voting_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  participant_id UUID NOT NULL REFERENCES public.participants(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  amount INTEGER NOT NULL CHECK (amount > 0),
  provider TEXT NOT NULL,
  provider_reference TEXT UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'paid', 'expired', 'failed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  paid_at TIMESTAMPTZ,
  CONSTRAINT voting_payments_paid_at_consistency
    CHECK ((status = 'paid') = (paid_at IS NOT NULL))
);

CREATE INDEX IF NOT EXISTS idx_voting_payments_public_history
  ON public.voting_payments (paid_at DESC)
  WHERE status = 'paid';

ALTER TABLE public.voting_payments ENABLE ROW LEVEL SECURITY;
