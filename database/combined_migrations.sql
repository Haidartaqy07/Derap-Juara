-- Derap Juara: ordered database migration bundle.
-- Generated from database/migrations/*.sql in filename order. Keep source migrations authoritative.
--
-- IMPORTANT:
-- 1. This bundle targets the existing participants-based Supabase schema; it does not
--    initialize a blank database. Back up the database before applying.
-- 2. Run only on a database where none of these migrations have been applied. If migrations
--    were already applied individually, run only the missing migration files instead.
-- 3. database/schema.sql is intentionally excluded: it is a legacy incompatible schema and
--    starts by dropping tables with CASCADE. Never run it on this app's active database.
-- 4. Configure SUPABASE_SERVICE_ROLE_KEY in the app server for poster uploads. A payment
--    provider/webhook is not included or enabled by this SQL bundle.

-- ============================================================================
-- SOURCE: database/migrations/20261029_lobb_scoring_fix.sql
-- ============================================================================

-- Scoring migration for the existing English-named Supabase schema:
-- participants, pbb_submissions, variasi_submissions, and deductions.
-- Safe to rerun. Does not create, drop, or rewrite application tables.

DO $$
DECLARE
  missing_objects TEXT[];
  missing_columns TEXT[];
BEGIN
  SELECT array_agg(required.object_name)
  INTO missing_objects
  FROM (VALUES
    ('public.events'),
    ('public.participants'),
    ('public.pbb_submissions'),
    ('public.variasi_submissions'),
    ('public.deductions')
  ) AS required(object_name)
  WHERE to_regclass(required.object_name) IS NULL;

  IF missing_objects IS NOT NULL THEN
    RAISE EXCEPTION
      'Scoring migration prerequisites missing: %. This migration expects the existing participants-based schema and does not install the application schema.',
      array_to_string(missing_objects, ', ');
  END IF;

  SELECT array_agg(format('%s.%s', required.table_name, required.column_name))
  INTO missing_columns
  FROM (VALUES
    ('events', 'id'),
    ('events', 'name'),
    ('events', 'date'),
    ('participants', 'id'),
    ('participants', 'event_id'),
    ('participants', 'nama_regu'),
    ('participants', 'nomor_urut'),
    ('participants', 'vote_count'),
    ('pbb_submissions', 'id'),
    ('pbb_submissions', 'event_id'),
    ('pbb_submissions', 'participant_id'),
    ('pbb_submissions', 'juri_role'),
    ('pbb_submissions', 'pbb_scores'),
    ('pbb_submissions', 'danton_scores'),
    ('pbb_submissions', 'submitted'),
    ('pbb_submissions', 'submitted_at'),
    ('pbb_submissions', 'updated_at'),
    ('variasi_submissions', 'id'),
    ('variasi_submissions', 'event_id'),
    ('variasi_submissions', 'participant_id'),
    ('variasi_submissions', 'juri_role'),
    ('variasi_submissions', 'scores'),
    ('variasi_submissions', 'submitted'),
    ('variasi_submissions', 'submitted_at'),
    ('variasi_submissions', 'updated_at'),
    ('deductions', 'participant_id'),
    ('deductions', 'points')
  ) AS required(table_name, column_name)
  WHERE NOT EXISTS (
    SELECT 1
    FROM information_schema.columns actual
    WHERE actual.table_schema = 'public'
      AND actual.table_name = required.table_name
      AND actual.column_name = required.column_name
  );

  IF missing_columns IS NOT NULL THEN
    RAISE EXCEPTION
      'Scoring migration prerequisites missing columns: %.',
      array_to_string(missing_columns, ', ');
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.participants WHERE vote_count < 0
  ) OR EXISTS (
    SELECT 1 FROM public.deductions WHERE points < 0
  ) THEN
    RAISE EXCEPTION
      'Invalid scoring data: vote_count and deduction points must be non-negative.';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.pbb_submissions
    GROUP BY participant_id, juri_role
    HAVING COUNT(*) > 1
  ) OR EXISTS (
    SELECT 1 FROM public.variasi_submissions
    GROUP BY participant_id, juri_role
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION
      'Duplicate submissions exist for a participant and judge role. Resolve duplicates before applying this migration.';
  END IF;
END;
$$;

ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS batas_waktu_detik INTEGER NOT NULL DEFAULT 420,
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'aktif'
    CHECK (status IN ('draft', 'aktif', 'selesai')),
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id);

ALTER TABLE public.participants
  ADD COLUMN IF NOT EXISTS waktu_tampil_detik INTEGER;

CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'juri1', 'juri2', 'juri3')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.event_judges (
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  tipe_juri TEXT NOT NULL CHECK (tipe_juri IN ('juri1', 'juri2', 'juri3')),
  PRIMARY KEY (event_id, user_id),
  UNIQUE (event_id, tipe_juri)
);

CREATE TABLE IF NOT EXISTS public.indikator_pbb (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  urutan INTEGER NOT NULL,
  nama_gerakan TEXT NOT NULL,
  kategori TEXT NOT NULL CHECK (kategori IN ('pbb', 'danton_pbb')),
  is_gerakan_jalan BOOLEAN NOT NULL DEFAULT FALSE,
  nilai_kosong INTEGER NOT NULL DEFAULT 0,
  nilai_minimal INTEGER NOT NULL,
  nilai_k1 INTEGER NOT NULL,
  nilai_k2 INTEGER NOT NULL,
  nilai_c1 INTEGER NOT NULL,
  nilai_c2 INTEGER NOT NULL,
  nilai_b1 INTEGER NOT NULL,
  nilai_b2 INTEGER NOT NULL,
  nilai_sb INTEGER NOT NULL,
  UNIQUE (event_id, urutan, kategori)
);

CREATE INDEX IF NOT EXISTS idx_indikator_pbb_event
  ON public.indikator_pbb(event_id, kategori, urutan);

CREATE UNIQUE INDEX IF NOT EXISTS idx_pbb_submissions_participant_juri
  ON public.pbb_submissions(participant_id, juri_role);

CREATE UNIQUE INDEX IF NOT EXISTS idx_variasi_submissions_participant_juri
  ON public.variasi_submissions(participant_id, juri_role);

CREATE OR REPLACE FUNCTION public.seed_indikator_pbb_default(p_event_id UUID)
RETURNS VOID
LANGUAGE SQL
AS $seed$
  INSERT INTO public.indikator_pbb (
    event_id, urutan, nama_gerakan, kategori, is_gerakan_jalan,
    nilai_kosong, nilai_minimal, nilai_k1, nilai_k2, nilai_c1, nilai_c2, nilai_b1, nilai_b2, nilai_sb
  )
  SELECT p_event_id, item.urutan, item.nama, item.kategori, item.is_gerakan_jalan,
    0, item.minimal, item.k1, item.k2, item.c1, item.c2, item.b1, item.b2, item.sb
  FROM (VALUES
    (1, 'Lari', 'pbb', TRUE, 20, 23, 26, 29, 32, 35, 38, 41),
    (2, 'Dua Kali Belok Kanan', 'pbb', FALSE, 23, 26, 29, 32, 35, 38, 41, 44),
    (3, 'Langkah Biasa', 'pbb', TRUE, 19, 22, 25, 28, 31, 34, 37, 40),
    (4, 'Tiap-Tiap Banjar Dua Kali Belok Kiri', 'pbb', FALSE, 21, 24, 27, 30, 33, 36, 39, 42),
    (5, 'Langkah Perlahan', 'pbb', TRUE, 19, 22, 25, 28, 31, 34, 37, 40),
    (6, 'Hormat Kanan', 'pbb', FALSE, 24, 27, 30, 33, 36, 39, 42, 45),
    (7, 'Dua Kali Belok Kanan', 'pbb', FALSE, 25, 28, 31, 34, 37, 40, 43, 46),
    (8, 'Belok Kanan', 'pbb', FALSE, 23, 26, 29, 32, 35, 38, 41, 44),
    (9, 'Melintang Kiri', 'pbb', FALSE, 23, 26, 29, 32, 35, 38, 41, 44),
    (10, 'Hadap Kanan Maju', 'pbb', TRUE, 17, 20, 23, 26, 29, 32, 35, 38),
    (11, 'Dua Kali Belok Kanan', 'pbb', FALSE, 23, 26, 29, 32, 35, 38, 41, 44),
    (12, 'Hadap Kiri Maju', 'pbb', TRUE, 17, 20, 23, 26, 29, 32, 35, 38),
    (13, '3 Langkah Ke Depan', 'pbb', TRUE, 15, 18, 21, 24, 27, 30, 33, 36),
    (14, '3 Langkah Ke Kiri', 'pbb', TRUE, 15, 18, 21, 24, 27, 30, 33, 36),
    (15, 'Hadap Serong Kanan', 'pbb', FALSE, 13, 16, 19, 22, 25, 28, 31, 34),
    (16, 'Parade Istirahat Di Tempat', 'pbb', FALSE, 14, 17, 20, 23, 26, 29, 32, 35),
    (17, 'Parade Periksa Kerapian', 'pbb', FALSE, 17, 20, 23, 26, 29, 32, 35, 38),
    (18, '3 Langkah Ke Belakang', 'pbb', TRUE, 15, 18, 21, 24, 27, 30, 33, 36),
    (19, 'Hadap Serong Kanan Jalan Di Tempat', 'pbb', TRUE, 14, 17, 20, 23, 26, 29, 32, 35),
    (20, 'Lencang Depan', 'pbb', FALSE, 12, 15, 18, 21, 24, 27, 30, 33),
    (21, 'Hadap Kiri', 'pbb', FALSE, 13, 16, 19, 22, 25, 28, 31, 34),
    (22, 'Lencang Kanan', 'pbb', FALSE, 12, 15, 18, 21, 24, 27, 30, 33),
    (23, 'Hormat', 'pbb', FALSE, 12, 15, 18, 21, 24, 27, 30, 33),
    (24, 'Hitung', 'pbb', FALSE, 12, 15, 18, 21, 24, 27, 30, 33),
    (25, 'Bubar', 'pbb', FALSE, 18, 21, 24, 27, 30, 33, 36, 39),
    (26, 'Berkumpul', 'pbb', FALSE, 18, 21, 24, 27, 30, 33, 36, 39)
  ) AS item(urutan, nama, kategori, is_gerakan_jalan, minimal, k1, k2, c1, c2, b1, b2, sb)
  WHERE NOT EXISTS (
    SELECT 1 FROM public.indikator_pbb existing
    WHERE existing.event_id = p_event_id AND existing.kategori = 'pbb'
  );

  INSERT INTO public.indikator_pbb (
    event_id, urutan, nama_gerakan, kategori, is_gerakan_jalan,
    nilai_kosong, nilai_minimal, nilai_k1, nilai_k2, nilai_c1, nilai_c2, nilai_b1, nilai_b2, nilai_sb
  )
  SELECT p_event_id, item.urutan, item.nama, 'danton_pbb', FALSE,
    0, item.minimal, item.k1, item.k2, item.c1, item.c2, item.b1, item.b2, item.sb
  FROM (VALUES
    (1, 'Sikap Badan', 2, 4, 6, 8, 10, 12, 14, 16),
    (2, 'Volume Suara', 3, 5, 7, 9, 11, 13, 15, 17),
    (3, 'Artikulasi/Intonasi Suara', 3, 5, 7, 9, 11, 13, 15, 17),
    (4, 'Penguasaan Materi', 4, 6, 8, 10, 12, 14, 16, 18),
    (5, 'Penguasaan Pasukan', 2, 4, 6, 8, 10, 12, 14, 16),
    (6, 'Penguasaan Lapangan', 2, 4, 6, 8, 10, 12, 14, 16)
  ) AS item(urutan, nama, minimal, k1, k2, c1, c2, b1, b2, sb)
  WHERE NOT EXISTS (
    SELECT 1 FROM public.indikator_pbb existing
    WHERE existing.event_id = p_event_id AND existing.kategori = 'danton_pbb'
  );
$seed$;

SELECT public.seed_indikator_pbb_default(id)
FROM public.events;

CREATE OR REPLACE FUNCTION public.trigger_seed_indikator_pbb()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  PERFORM public.seed_indikator_pbb_default(NEW.id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_event_created_seed_indikator_pbb ON public.events;
CREATE TRIGGER on_event_created_seed_indikator_pbb
AFTER INSERT ON public.events
FOR EACH ROW EXECUTE FUNCTION public.trigger_seed_indikator_pbb();

CREATE OR REPLACE FUNCTION public.reorder_indikator_pbb(
  p_event_id UUID,
  p_kategori TEXT,
  p_ordered_ids UUID[]
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
BEGIN
  IF p_kategori NOT IN ('pbb', 'danton_pbb') THEN
    RAISE EXCEPTION 'Kategori indikator tidak valid.';
  END IF;

  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Hanya admin yang dapat mengubah urutan indikator.';
  END IF;

  UPDATE public.indikator_pbb
  SET urutan = -array_position(p_ordered_ids, id)
  WHERE event_id = p_event_id
    AND kategori = p_kategori
    AND id = ANY(p_ordered_ids);

  UPDATE public.indikator_pbb
  SET urutan = -urutan
  WHERE event_id = p_event_id AND kategori = p_kategori AND urutan < 0;
END;
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
$$;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_judges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.indikator_pbb ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deductions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pbb_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.variasi_submissions ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'profiles' AND policyname = 'profiles_select_authenticated') THEN
    CREATE POLICY profiles_select_authenticated ON public.profiles
      FOR SELECT USING (auth.uid() IS NOT NULL);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'profiles' AND policyname = 'profiles_admin_manage') THEN
    CREATE POLICY profiles_admin_manage ON public.profiles
      FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'event_judges' AND policyname = 'event_judges_select_authenticated') THEN
    CREATE POLICY event_judges_select_authenticated ON public.event_judges
      FOR SELECT USING (auth.uid() IS NOT NULL);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'event_judges' AND policyname = 'event_judges_admin_manage') THEN
    CREATE POLICY event_judges_admin_manage ON public.event_judges
      FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'indikator_pbb' AND policyname = 'indikator_pbb_select_authenticated') THEN
    CREATE POLICY indikator_pbb_select_authenticated ON public.indikator_pbb
      FOR SELECT USING (auth.uid() IS NOT NULL);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'indikator_pbb' AND policyname = 'indikator_pbb_admin_manage') THEN
    CREATE POLICY indikator_pbb_admin_manage ON public.indikator_pbb
      FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'events' AND policyname = 'events_select_authenticated') THEN
    CREATE POLICY events_select_authenticated ON public.events
      FOR SELECT USING (auth.uid() IS NOT NULL);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'events' AND policyname = 'events_admin_manage') THEN
    CREATE POLICY events_admin_manage ON public.events
      FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'participants' AND policyname = 'participants_select_authenticated') THEN
    CREATE POLICY participants_select_authenticated ON public.participants
      FOR SELECT USING (auth.uid() IS NOT NULL);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'participants' AND policyname = 'participants_admin_manage') THEN
    CREATE POLICY participants_admin_manage ON public.participants
      FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'pbb_submissions' AND policyname = 'pbb_submissions_select_authenticated') THEN
    CREATE POLICY pbb_submissions_select_authenticated ON public.pbb_submissions
      FOR SELECT USING (auth.uid() IS NOT NULL);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'pbb_submissions' AND policyname = 'pbb_submissions_judge_insert') THEN
    CREATE POLICY pbb_submissions_judge_insert ON public.pbb_submissions
      FOR INSERT WITH CHECK (
        public.is_admin() OR EXISTS (
          SELECT 1 FROM public.profiles
          WHERE id = auth.uid() AND role = juri_role
        )
      );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'pbb_submissions' AND policyname = 'pbb_submissions_judge_update') THEN
    CREATE POLICY pbb_submissions_judge_update ON public.pbb_submissions
      FOR UPDATE USING (
        public.is_admin() OR (
          submitted = FALSE AND EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = juri_role
          )
        )
      ) WITH CHECK (
        public.is_admin() OR EXISTS (
          SELECT 1 FROM public.profiles
          WHERE id = auth.uid() AND role = juri_role
        )
      );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'variasi_submissions' AND policyname = 'variasi_submissions_select_authenticated') THEN
    CREATE POLICY variasi_submissions_select_authenticated ON public.variasi_submissions
      FOR SELECT USING (auth.uid() IS NOT NULL);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'variasi_submissions' AND policyname = 'variasi_submissions_judge_insert') THEN
    CREATE POLICY variasi_submissions_judge_insert ON public.variasi_submissions
      FOR INSERT WITH CHECK (
        public.is_admin() OR (
          juri_role = 'juri3' AND EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'juri3'
          )
        )
      );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'variasi_submissions' AND policyname = 'variasi_submissions_judge_update') THEN
    CREATE POLICY variasi_submissions_judge_update ON public.variasi_submissions
      FOR UPDATE USING (
        public.is_admin() OR (
          submitted = FALSE AND juri_role = 'juri3' AND EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'juri3'
          )
        )
      ) WITH CHECK (
        public.is_admin() OR (
          juri_role = 'juri3' AND EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'juri3'
          )
        )
      );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'deductions' AND policyname = 'deductions_select_authenticated') THEN
    CREATE POLICY deductions_select_authenticated ON public.deductions
      FOR SELECT USING (auth.uid() IS NOT NULL);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'deductions' AND policyname = 'deductions_admin_manage') THEN
    CREATE POLICY deductions_admin_manage ON public.deductions
      FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());
  END IF;
END;
$$;

DROP POLICY IF EXISTS pbb_submissions_judge_insert ON public.pbb_submissions;
DROP POLICY IF EXISTS pbb_submissions_judge_update ON public.pbb_submissions;
CREATE POLICY pbb_submissions_judge_insert ON public.pbb_submissions
  FOR INSERT WITH CHECK (
    public.is_admin() OR EXISTS (
      SELECT 1
      FROM public.profiles profile
      JOIN public.event_judges assignment
        ON assignment.user_id = profile.id
       AND assignment.tipe_juri = profile.role
      JOIN public.participants participant
        ON participant.event_id = assignment.event_id
      WHERE profile.id = auth.uid()
        AND profile.role = pbb_submissions.juri_role
        AND participant.id = pbb_submissions.participant_id
        AND participant.event_id = pbb_submissions.event_id
    )
  );
CREATE POLICY pbb_submissions_judge_update ON public.pbb_submissions
  FOR UPDATE USING (
    public.is_admin() OR (
      submitted = FALSE AND EXISTS (
        SELECT 1
        FROM public.profiles profile
        JOIN public.event_judges assignment
          ON assignment.user_id = profile.id
         AND assignment.tipe_juri = profile.role
        JOIN public.participants participant
          ON participant.event_id = assignment.event_id
        WHERE profile.id = auth.uid()
          AND profile.role = pbb_submissions.juri_role
          AND participant.id = pbb_submissions.participant_id
          AND participant.event_id = pbb_submissions.event_id
      )
    )
  ) WITH CHECK (
    public.is_admin() OR EXISTS (
      SELECT 1
      FROM public.profiles profile
      JOIN public.event_judges assignment
        ON assignment.user_id = profile.id
       AND assignment.tipe_juri = profile.role
      JOIN public.participants participant
        ON participant.event_id = assignment.event_id
      WHERE profile.id = auth.uid()
        AND profile.role = pbb_submissions.juri_role
        AND participant.id = pbb_submissions.participant_id
        AND participant.event_id = pbb_submissions.event_id
    )
  );

DROP POLICY IF EXISTS variasi_submissions_judge_insert ON public.variasi_submissions;
DROP POLICY IF EXISTS variasi_submissions_judge_update ON public.variasi_submissions;
CREATE POLICY variasi_submissions_judge_insert ON public.variasi_submissions
  FOR INSERT WITH CHECK (
    public.is_admin() OR (
      variasi_submissions.juri_role = 'juri3' AND EXISTS (
        SELECT 1
        FROM public.profiles profile
        JOIN public.event_judges assignment
          ON assignment.user_id = profile.id
         AND assignment.tipe_juri = profile.role
        JOIN public.participants participant
          ON participant.event_id = assignment.event_id
        WHERE profile.id = auth.uid()
          AND profile.role = 'juri3'
          AND assignment.tipe_juri = 'juri3'
          AND participant.id = variasi_submissions.participant_id
          AND participant.event_id = variasi_submissions.event_id
      )
    )
  );
CREATE POLICY variasi_submissions_judge_update ON public.variasi_submissions
  FOR UPDATE USING (
    public.is_admin() OR (
      submitted = FALSE
      AND variasi_submissions.juri_role = 'juri3'
      AND EXISTS (
        SELECT 1
        FROM public.profiles profile
        JOIN public.event_judges assignment
          ON assignment.user_id = profile.id
         AND assignment.tipe_juri = profile.role
        JOIN public.participants participant
          ON participant.event_id = assignment.event_id
        WHERE profile.id = auth.uid()
          AND profile.role = 'juri3'
          AND assignment.tipe_juri = 'juri3'
          AND participant.id = variasi_submissions.participant_id
          AND participant.event_id = variasi_submissions.event_id
      )
    )
  ) WITH CHECK (
    public.is_admin() OR (
      variasi_submissions.juri_role = 'juri3' AND EXISTS (
        SELECT 1
        FROM public.profiles profile
        JOIN public.event_judges assignment
          ON assignment.user_id = profile.id
         AND assignment.tipe_juri = profile.role
        JOIN public.participants participant
          ON participant.event_id = assignment.event_id
        WHERE profile.id = auth.uid()
          AND profile.role = 'juri3'
          AND assignment.tipe_juri = 'juri3'
          AND participant.id = variasi_submissions.participant_id
          AND participant.event_id = variasi_submissions.event_id
      )
    )
  );

CREATE OR REPLACE FUNCTION public.set_participant_deduction(
  p_participant_id UUID,
  p_points NUMERIC
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Hanya admin yang dapat mengubah pengurangan.';
  END IF;
  IF p_points IS NULL OR p_points < 0 THEN
    RAISE EXCEPTION 'Pengurangan harus berupa angka non-negatif.';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.participants WHERE id = p_participant_id) THEN
    RAISE EXCEPTION 'Peserta tidak ditemukan.';
  END IF;

  DELETE FROM public.deductions WHERE participant_id = p_participant_id;
  IF p_points > 0 THEN
    INSERT INTO public.deductions (participant_id, points)
    VALUES (p_participant_id, p_points);
  END IF;
END;
$$;

CREATE OR REPLACE VIEW public.rekap_nilai_peserta AS
WITH pbb_latest AS (
  SELECT DISTINCT ON (participant_id, juri_role)
    id, participant_id, juri_role, pbb_scores, danton_scores, submitted
  FROM public.pbb_submissions
  ORDER BY participant_id, juri_role, updated_at DESC NULLS LAST, id DESC
),
pbb_per_juri AS (
  SELECT
    s.participant_id,
    s.juri_role,
    BOOL_OR(COALESCE(s.submitted, FALSE)) AS is_submitted,
    SUM(CASE WHEN s.submitted THEN COALESCE(pbb_score.total_pbb, 0) ELSE 0 END) AS total_pbb,
    SUM(CASE WHEN s.submitted THEN COALESCE(danton_score.total_danton_pbb, 0) ELSE 0 END)
      AS total_danton_pbb
  FROM pbb_latest s
  LEFT JOIN LATERAL (
    SELECT SUM(
      CASE
        WHEN (score.item ->> 'itemId') ~ '^[0-9]+$'
          AND (score.item ->> 'itemId')::INTEGER BETWEEN 1 AND 26
          AND (score.item ->> 'value') ~ '^-?[0-9]+([.][0-9]+)?$'
        THEN (score.item ->> 'value')::NUMERIC
        ELSE 0
      END
    ) AS total_pbb
    FROM jsonb_array_elements(
      CASE
        WHEN jsonb_typeof(s.pbb_scores) = 'array' THEN s.pbb_scores
        ELSE '[]'::JSONB
      END
    ) AS score(item)
  ) AS pbb_score ON TRUE
  LEFT JOIN LATERAL (
    SELECT SUM(
      CASE
        WHEN (score.item ->> 'itemId') ~ '^[0-9]+$'
          AND (score.item ->> 'itemId')::INTEGER BETWEEN 1 AND 6
          AND (score.item ->> 'value') ~ '^-?[0-9]+([.][0-9]+)?$'
        THEN (score.item ->> 'value')::NUMERIC
        ELSE 0
      END
    ) AS total_danton_pbb
    FROM jsonb_array_elements(
      CASE
        WHEN jsonb_typeof(s.danton_scores) = 'array' THEN s.danton_scores
        ELSE '[]'::JSONB
      END
    ) AS score(item)
  ) AS danton_score ON TRUE
  WHERE s.submitted = TRUE
  GROUP BY s.participant_id, s.juri_role
),
pbb_gabungan AS (
  SELECT
    participant_id,
    COALESCE(SUM(total_pbb) FILTER (
      WHERE juri_role = 'juri1' AND is_submitted
    ), 0) AS pbb_juri1,
    COALESCE(SUM(total_pbb) FILTER (
      WHERE juri_role = 'juri2' AND is_submitted
    ), 0) AS pbb_juri2,
    COALESCE(SUM(total_danton_pbb) FILTER (
      WHERE juri_role = 'juri1' AND is_submitted
    ), 0) AS danton_juri1,
    COALESCE(SUM(total_danton_pbb) FILTER (
      WHERE juri_role = 'juri2' AND is_submitted
    ), 0) AS danton_juri2,
    COALESCE(BOOL_OR(is_submitted) FILTER (WHERE juri_role = 'juri1'), FALSE)
      AS juri1_submitted,
    COALESCE(BOOL_OR(is_submitted) FILTER (WHERE juri_role = 'juri2'), FALSE)
      AS juri2_submitted
  FROM pbb_per_juri
  GROUP BY participant_id
),
varfor_latest AS (
  SELECT DISTINCT ON (participant_id, juri_role)
    id, participant_id, juri_role, scores, submitted
  FROM public.variasi_submissions
  ORDER BY participant_id, juri_role, updated_at DESC NULLS LAST, id DESC
),
varfor_per_peserta AS (
  SELECT
    s.participant_id,
    BOOL_OR(COALESCE(s.submitted, FALSE)) AS is_submitted,
    SUM(
      CASE
        WHEN (score.item ->> 'itemId') ~ '^[0-9]+$'
          AND (score.item ->> 'itemId')::INTEGER BETWEEN 1 AND 18
          AND (score.item ->> 'value') ~ '^-?[0-9]+([.][0-9]+)?$'
        THEN (score.item ->> 'value')::NUMERIC
        ELSE 0
      END
    ) AS total_varfor,
    SUM(
      CASE
        WHEN (score.item ->> 'itemId') ~ '^[0-9]+$'
          AND (score.item ->> 'itemId')::INTEGER BETWEEN 9 AND 18
          AND (score.item ->> 'value') ~ '^-?[0-9]+([.][0-9]+)?$'
        THEN (score.item ->> 'value')::NUMERIC
        ELSE 0
      END
    ) AS total_formasi_only,
    SUM(
      CASE
        WHEN (score.item ->> 'itemId') ~ '^[0-9]+$'
          AND (score.item ->> 'itemId')::INTEGER BETWEEN 19 AND 24
          AND (score.item ->> 'value') ~ '^-?[0-9]+([.][0-9]+)?$'
        THEN (score.item ->> 'value')::NUMERIC
        ELSE 0
      END
    ) AS total_danton_varfor
  FROM varfor_latest s
  LEFT JOIN LATERAL jsonb_array_elements(
    CASE
      WHEN jsonb_typeof(s.scores) = 'array' THEN s.scores
      ELSE '[]'::JSONB
    END
  ) AS score(item) ON TRUE
  WHERE s.juri_role = 'juri3' AND s.submitted = TRUE
  GROUP BY s.participant_id
),
deduction_per_peserta AS (
  SELECT
    participant_id,
    COALESCE(SUM(points), 0) AS total_deduction
  FROM public.deductions
  GROUP BY participant_id
),
voting_per_event AS (
  SELECT
    event_id,
    NULLIF(SUM(COALESCE(vote_count, 0)), 0) AS total_votes
  FROM public.participants
  GROUP BY event_id
)
SELECT
  p.id AS peserta_id,
  p.event_id,
  p.nama_regu,
  p.nomor_urut,
  NULL::INTEGER AS waktu_tampil_detik,
  COALESCE(pg.juri1_submitted, FALSE) AS juri1_submitted,
  COALESCE(pg.juri2_submitted, FALSE) AS juri2_submitted,
  COALESCE(vf.is_submitted, FALSE) AS juri3_submitted,
  COALESCE(pg.pbb_juri1, 0) + COALESCE(pg.pbb_juri2, 0) AS nilai_pbb_total,
  COALESCE(pg.danton_juri1, 0) + COALESCE(pg.danton_juri2, 0) AS nilai_danton_pbb_total,
  COALESCE(vf.total_varfor, 0) AS nilai_varfor_total,
  COALESCE(vf.total_danton_varfor, 0) AS nilai_danton_varfor_total,
  -- The existing schema has no marker identifying which PBB item is a marching movement.
  0::NUMERIC AS nilai_gerakan_jalan,
  COALESCE(vf.total_formasi_only, 0) AS nilai_formasi_only,
  COALESCE(p.vote_count, 0) AS voting,
  ROUND(
    (COALESCE(pg.pbb_juri1, 0) + COALESCE(pg.pbb_juri2, 0)) / 20.0,
    2
  ) AS persen_pbb,
  ROUND(
    (COALESCE(pg.danton_juri1, 0) + COALESCE(pg.danton_juri2, 0)) / 2.0,
    2
  ) AS persen_danton_pbb,
  ROUND(COALESCE(vf.total_varfor, 0) / 10.0, 2) AS persen_varfor,
  ROUND(COALESCE(vf.total_danton_varfor, 0), 2) AS persen_danton_varfor,
  ROUND(
    CASE
      WHEN ve.total_votes IS NULL THEN 0
      ELSE COALESCE(p.vote_count, 0)::NUMERIC / ve.total_votes * 100
    END,
    2
  ) AS persen_voting,
  CASE
    WHEN COALESCE(pg.juri1_submitted, FALSE)
      AND COALESCE(pg.juri2_submitted, FALSE)
      AND COALESCE(vf.is_submitted, FALSE)
    THEN ROUND(
      ((COALESCE(pg.pbb_juri1, 0) + COALESCE(pg.pbb_juri2, 0)) / 2.0) * 0.60
      + COALESCE(vf.total_varfor, 0) * 0.30
      + (
        (COALESCE(pg.danton_juri1, 0) + COALESCE(pg.danton_juri2, 0)) / 2.0
        + COALESCE(vf.total_danton_varfor, 0)
      ) / 4.0
      + CASE
        WHEN ve.total_votes IS NULL THEN 0
        ELSE COALESCE(p.vote_count, 0)::NUMERIC / ve.total_votes * 50
      END
      - COALESCE(dp.total_deduction, 0),
      2
    )
    ELSE NULL
  END AS skor_juara_umum,
  CASE
    WHEN COALESCE(pg.juri1_submitted, FALSE)
      AND COALESCE(pg.juri2_submitted, FALSE)
      AND COALESCE(vf.is_submitted, FALSE)
    THEN ROUND(
      ((COALESCE(pg.pbb_juri1, 0) + COALESCE(pg.pbb_juri2, 0)) / 2.0) * 0.65
      + COALESCE(vf.total_varfor, 0) * 0.25
      + (COALESCE(pg.danton_juri1, 0) + COALESCE(pg.danton_juri2, 0)) / 4.0
      + COALESCE(vf.total_danton_varfor, 0) / 2.0,
      3
    )
    ELSE NULL
  END AS skor_juara_utama,
  CASE
    WHEN COALESCE(pg.juri1_submitted, FALSE)
      AND COALESCE(pg.juri2_submitted, FALSE)
      AND COALESCE(vf.is_submitted, FALSE)
    THEN ROUND(
      ((COALESCE(pg.pbb_juri1, 0) + COALESCE(pg.pbb_juri2, 0)) / 2.0) * 0.65
      + COALESCE(vf.total_varfor, 0) * 0.25
      + (COALESCE(pg.danton_juri1, 0) + COALESCE(pg.danton_juri2, 0)) / 4.0
      + COALESCE(vf.total_danton_varfor, 0) / 2.0
      - COALESCE(dp.total_deduction, 0),
      3
    )
    ELSE NULL
  END AS skor_juara_utama_bersih,
  CASE
    WHEN ve.total_votes IS NULL THEN 0
    ELSE COALESCE(p.vote_count, 0)::NUMERIC / ve.total_votes
  END AS voting_raw,
  0::NUMERIC AS penalti_waktu_poin,
  COALESCE(dp.total_deduction, 0) AS penalti_manual_poin,
  COALESCE(dp.total_deduction, 0) AS total_penalti_poin
FROM public.participants p
LEFT JOIN pbb_gabungan pg ON pg.participant_id = p.id
LEFT JOIN varfor_per_peserta vf ON vf.participant_id = p.id
LEFT JOIN deduction_per_peserta dp ON dp.participant_id = p.id
LEFT JOIN voting_per_event ve ON ve.event_id = p.event_id;

-- ============================================================================
-- SOURCE: database/migrations/20261102_ldwc_2026_rubric.sql
-- ============================================================================

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

-- ============================================================================
-- SOURCE: database/migrations/20261102_ldwc_dynamic_rubric.sql
-- ============================================================================

-- Store per-event rubric snapshots so future edits do not affect past events.
ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS rubric JSONB;

CREATE OR REPLACE FUNCTION public.validate_ldwc_submission_scores()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  event_template TEXT;
  event_rubric JSONB;
  component_key TEXT;
  score JSONB;
BEGIN
  SELECT scoring_template, rubric
    INTO event_template, event_rubric
    FROM public.events
   WHERE id = NEW.event_id
   FOR SHARE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Event penilaian tidak ditemukan.' USING ERRCODE = 'P0002';
  END IF;
  IF event_template <> 'LDWC_2026' THEN
    RETURN NEW;
  END IF;
  IF event_rubric IS NULL THEN
    RAISE EXCEPTION 'Rubrik event belum dikonfigurasi.' USING ERRCODE = '22023';
  END IF;

  IF TG_TABLE_NAME = 'pbb_submissions' THEN
    FOREACH component_key IN ARRAY ARRAY['pbb', 'dantonPbb']
    LOOP
      IF component_key = 'pbb' THEN
        IF jsonb_typeof(NEW.pbb_scores) <> 'array' THEN
          RAISE EXCEPTION 'Format skor PBB tidak valid.' USING ERRCODE = '22023';
        END IF;
        FOR score IN SELECT jsonb_array_elements(NEW.pbb_scores)
        LOOP
          IF NOT EXISTS (
            SELECT 1
              FROM jsonb_array_elements(event_rubric->'components'->component_key) item
              CROSS JOIN LATERAL jsonb_each(item->'levels') level
             WHERE item->>'itemId' = score->>'itemId'
               AND level.value = score->'value'
          ) THEN
            RAISE EXCEPTION 'Nilai PBB tidak sesuai rubrik event.' USING ERRCODE = '22023';
          END IF;
        END LOOP;
      ELSE
        IF jsonb_typeof(NEW.danton_scores) <> 'array' THEN
          RAISE EXCEPTION 'Format skor Danton PBB tidak valid.' USING ERRCODE = '22023';
        END IF;
        FOR score IN SELECT jsonb_array_elements(NEW.danton_scores)
        LOOP
          IF NOT EXISTS (
            SELECT 1
              FROM jsonb_array_elements(event_rubric->'components'->component_key) item
              CROSS JOIN LATERAL jsonb_each(item->'levels') level
             WHERE item->>'itemId' = score->>'itemId'
               AND level.value = score->'value'
          ) THEN
            RAISE EXCEPTION 'Nilai Danton PBB tidak sesuai rubrik event.' USING ERRCODE = '22023';
          END IF;
        END LOOP;
      END IF;
    END LOOP;
  ELSIF TG_TABLE_NAME = 'variasi_submissions' THEN
    IF jsonb_typeof(NEW.scores) <> 'array' THEN
      RAISE EXCEPTION 'Format skor Variasi/Formasi tidak valid.' USING ERRCODE = '22023';
    END IF;
    FOR score IN SELECT jsonb_array_elements(NEW.scores)
    LOOP
      IF NOT EXISTS (
        SELECT 1
          FROM unnest(ARRAY['variasi', 'formasi', 'dantonVarfor']) component(name)
          CROSS JOIN LATERAL jsonb_array_elements(event_rubric->'components'->component.name) item
          CROSS JOIN LATERAL jsonb_each(item->'levels') level
         WHERE item->>'itemId' = score->>'itemId'
           AND level.value = score->'value'
      ) THEN
        RAISE EXCEPTION 'Nilai Variasi/Formasi tidak sesuai rubrik event.' USING ERRCODE = '22023';
      END IF;
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validate_ldwc_pbb_submission_scores ON public.pbb_submissions;
CREATE TRIGGER validate_ldwc_pbb_submission_scores
BEFORE INSERT OR UPDATE OF pbb_scores, danton_scores, event_id
ON public.pbb_submissions
FOR EACH ROW EXECUTE FUNCTION public.validate_ldwc_submission_scores();

DROP TRIGGER IF EXISTS validate_ldwc_variasi_submission_scores ON public.variasi_submissions;
CREATE TRIGGER validate_ldwc_variasi_submission_scores
BEFORE INSERT OR UPDATE OF scores, event_id
ON public.variasi_submissions
FOR EACH ROW EXECUTE FUNCTION public.validate_ldwc_submission_scores();

REVOKE ALL ON FUNCTION public.validate_ldwc_submission_scores() FROM PUBLIC;

CREATE OR REPLACE FUNCTION public.save_ldwc_event_rubric(
  p_event_id UUID,
  p_rubric JSONB
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  event_template TEXT;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Admin only' USING ERRCODE = '42501';
  END IF;

  SELECT scoring_template
    INTO event_template
    FROM public.events
   WHERE id = p_event_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Event tidak ditemukan.' USING ERRCODE = 'P0002';
  END IF;
  IF event_template <> 'LDWC_2026' THEN
    RAISE EXCEPTION 'Rubrik hanya dapat diubah pada event LDWC 2026.' USING ERRCODE = '22023';
  END IF;

  IF EXISTS (
    SELECT 1
      FROM public.pbb_submissions
     WHERE event_id = p_event_id
       AND (
         submitted
         OR CASE
              WHEN jsonb_typeof(pbb_scores) = 'array' THEN jsonb_array_length(pbb_scores) > 0
              ELSE pbb_scores IS NOT NULL
            END
         OR CASE
              WHEN jsonb_typeof(danton_scores) = 'array' THEN jsonb_array_length(danton_scores) > 0
              ELSE danton_scores IS NOT NULL
            END
       )
  ) OR EXISTS (
    SELECT 1
      FROM public.variasi_submissions
     WHERE event_id = p_event_id
       AND (
         submitted
         OR CASE
              WHEN jsonb_typeof(scores) = 'array' THEN jsonb_array_length(scores) > 0
              ELSE scores IS NOT NULL
            END
       )
  ) THEN
    RAISE EXCEPTION 'RUBRIC_LOCKED' USING ERRCODE = 'P0001';
  END IF;

  UPDATE public.events
     SET rubric = p_rubric
   WHERE id = p_event_id;
END;
$$;

REVOKE ALL ON FUNCTION public.save_ldwc_event_rubric(UUID, JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.save_ldwc_event_rubric(UUID, JSONB) TO authenticated;

-- Snapshot the current baseline for existing LDWC events before future defaults change.
UPDATE public.events
   SET rubric = $ldwc_rubric_data${
  "event": "LDWC 2026 - Keagungan Nusantara",
  "source": "Lembar_Penilaian_LDWC.xlsx",
  "levelOrder": [
    "KOSONG",
    "MINIMAL",
    "K1",
    "K2",
    "C1",
    "C2",
    "B1",
    "B2",
    "SB"
  ],
  "note": "Dibangkitkan otomatis dari lembar penilaian. Jangan ketik ulang manual. Item 19-24 = Danton Variasi & Formasi (nomor 1-6 di lembar).",
  "components": {
    "pbb": [
      {
        "itemId": 1,
        "name": "Langkah Tegap Maju",
        "max": 38,
        "levels": {
          "KOSONG": 0,
          "MINIMAL": 11,
          "K1": 17,
          "K2": 20,
          "C1": 24,
          "C2": 27,
          "B1": 31,
          "B2": 34,
          "SB": 38
        }
      },
      {
        "itemId": 2,
        "name": "Belok Kiri",
        "max": 40,
        "levels": {
          "KOSONG": 0,
          "MINIMAL": 13,
          "K1": 19,
          "K2": 22,
          "C1": 26,
          "C2": 29,
          "B1": 33,
          "B2": 36,
          "SB": 40
        }
      },
      {
        "itemId": 3,
        "name": "Hormat Kanan",
        "max": 38,
        "levels": {
          "KOSONG": 0,
          "MINIMAL": 11,
          "K1": 17,
          "K2": 20,
          "C1": 24,
          "C2": 27,
          "B1": 31,
          "B2": 34,
          "SB": 38
        }
      },
      {
        "itemId": 4,
        "name": "Dua Kali Belok Kiri",
        "max": 40,
        "levels": {
          "KOSONG": 0,
          "MINIMAL": 13,
          "K1": 19,
          "K2": 22,
          "C1": 26,
          "C2": 29,
          "B1": 33,
          "B2": 36,
          "SB": 40
        }
      },
      {
        "itemId": 5,
        "name": "Langkah Perlahan",
        "max": 38,
        "levels": {
          "KOSONG": 0,
          "MINIMAL": 11,
          "K1": 17,
          "K2": 20,
          "C1": 24,
          "C2": 27,
          "B1": 31,
          "B2": 34,
          "SB": 38
        }
      },
      {
        "itemId": 6,
        "name": "Langkah Biasa",
        "max": 38,
        "levels": {
          "KOSONG": 0,
          "MINIMAL": 11,
          "K1": 17,
          "K2": 20,
          "C1": 24,
          "C2": 27,
          "B1": 31,
          "B2": 34,
          "SB": 38
        }
      },
      {
        "itemId": 7,
        "name": "Tiap-tiap Banjar Dua Kali Belok Kanan",
        "max": 40,
        "levels": {
          "KOSONG": 0,
          "MINIMAL": 13,
          "K1": 19,
          "K2": 22,
          "C1": 26,
          "C2": 29,
          "B1": 33,
          "B2": 36,
          "SB": 40
        }
      },
      {
        "itemId": 8,
        "name": "Lari",
        "max": 38,
        "levels": {
          "KOSONG": 0,
          "MINIMAL": 11,
          "K1": 17,
          "K2": 20,
          "C1": 24,
          "C2": 27,
          "B1": 31,
          "B2": 34,
          "SB": 38
        }
      },
      {
        "itemId": 9,
        "name": "Dua Kali Belok Kanan (L)",
        "max": 40,
        "levels": {
          "KOSONG": 0,
          "MINIMAL": 13,
          "K1": 19,
          "K2": 22,
          "C1": 26,
          "C2": 29,
          "B1": 33,
          "B2": 36,
          "SB": 40
        }
      },
      {
        "itemId": 10,
        "name": "Balik Kanan Lari Maju (L)",
        "max": 40,
        "levels": {
          "KOSONG": 0,
          "MINIMAL": 13,
          "K1": 19,
          "K2": 22,
          "C1": 26,
          "C2": 29,
          "B1": 33,
          "B2": 36,
          "SB": 40
        }
      },
      {
        "itemId": 11,
        "name": "Balik Kanan Henti (L)",
        "max": 40,
        "levels": {
          "KOSONG": 0,
          "MINIMAL": 13,
          "K1": 19,
          "K2": 22,
          "C1": 26,
          "C2": 29,
          "B1": 33,
          "B2": 36,
          "SB": 40
        }
      },
      {
        "itemId": 12,
        "name": "Melintang Kanan",
        "max": 50,
        "levels": {
          "KOSONG": 0,
          "MINIMAL": 23,
          "K1": 29,
          "K2": 32,
          "C1": 36,
          "C2": 39,
          "B1": 43,
          "B2": 46,
          "SB": 50
        }
      },
      {
        "itemId": 13,
        "name": "Balik Kanan Maju",
        "max": 40,
        "levels": {
          "KOSONG": 0,
          "MINIMAL": 13,
          "K1": 19,
          "K2": 22,
          "C1": 26,
          "C2": 29,
          "B1": 33,
          "B2": 36,
          "SB": 40
        }
      },
      {
        "itemId": 14,
        "name": "Haluan Kanan Maju",
        "max": 50,
        "levels": {
          "KOSONG": 0,
          "MINIMAL": 23,
          "K1": 29,
          "K2": 32,
          "C1": 36,
          "C2": 39,
          "B1": 43,
          "B2": 46,
          "SB": 50
        }
      },
      {
        "itemId": 15,
        "name": "Tiga Langkah Ke Kanan",
        "max": 40,
        "levels": {
          "KOSONG": 0,
          "MINIMAL": 13,
          "K1": 19,
          "K2": 22,
          "C1": 26,
          "C2": 29,
          "B1": 33,
          "B2": 36,
          "SB": 40
        }
      },
      {
        "itemId": 16,
        "name": "Parade Istirahat Di Tempat",
        "max": 30,
        "levels": {
          "KOSONG": 0,
          "MINIMAL": 3,
          "K1": 9,
          "K2": 12,
          "C1": 16,
          "C2": 19,
          "B1": 23,
          "B2": 26,
          "SB": 30
        }
      },
      {
        "itemId": 17,
        "name": "Parade Periksa Kerapian",
        "max": 40,
        "levels": {
          "KOSONG": 0,
          "MINIMAL": 13,
          "K1": 19,
          "K2": 22,
          "C1": 26,
          "C2": 29,
          "B1": 33,
          "B2": 36,
          "SB": 40
        }
      },
      {
        "itemId": 18,
        "name": "Hormat",
        "max": 30,
        "levels": {
          "KOSONG": 0,
          "MINIMAL": 3,
          "K1": 9,
          "K2": 12,
          "C1": 16,
          "C2": 19,
          "B1": 23,
          "B2": 26,
          "SB": 30
        }
      },
      {
        "itemId": 19,
        "name": "Hadap Kanan",
        "max": 30,
        "levels": {
          "KOSONG": 0,
          "MINIMAL": 3,
          "K1": 9,
          "K2": 12,
          "C1": 16,
          "C2": 19,
          "B1": 23,
          "B2": 26,
          "SB": 30
        }
      },
      {
        "itemId": 20,
        "name": "Lencang Depan",
        "max": 30,
        "levels": {
          "KOSONG": 0,
          "MINIMAL": 3,
          "K1": 9,
          "K2": 12,
          "C1": 16,
          "C2": 19,
          "B1": 23,
          "B2": 26,
          "SB": 30
        }
      },
      {
        "itemId": 21,
        "name": "Hitung",
        "max": 30,
        "levels": {
          "KOSONG": 0,
          "MINIMAL": 3,
          "K1": 9,
          "K2": 12,
          "C1": 16,
          "C2": 19,
          "B1": 23,
          "B2": 26,
          "SB": 30
        }
      },
      {
        "itemId": 22,
        "name": "Tiga Langkah Ke Belakang",
        "max": 40,
        "levels": {
          "KOSONG": 0,
          "MINIMAL": 13,
          "K1": 19,
          "K2": 22,
          "C1": 26,
          "C2": 29,
          "B1": 33,
          "B2": 36,
          "SB": 40
        }
      },
      {
        "itemId": 23,
        "name": "Hadap Serong Kanan Jalan Di Tempat",
        "max": 30,
        "levels": {
          "KOSONG": 0,
          "MINIMAL": 3,
          "K1": 9,
          "K2": 12,
          "C1": 16,
          "C2": 19,
          "B1": 23,
          "B2": 26,
          "SB": 30
        }
      },
      {
        "itemId": 24,
        "name": "Balik Kanan Henti",
        "max": 30,
        "levels": {
          "KOSONG": 0,
          "MINIMAL": 3,
          "K1": 9,
          "K2": 12,
          "C1": 16,
          "C2": 19,
          "B1": 23,
          "B2": 26,
          "SB": 30
        }
      },
      {
        "itemId": 25,
        "name": "Bubar",
        "max": 50,
        "levels": {
          "KOSONG": 0,
          "MINIMAL": 23,
          "K1": 29,
          "K2": 32,
          "C1": 36,
          "C2": 39,
          "B1": 43,
          "B2": 46,
          "SB": 50
        }
      },
      {
        "itemId": 26,
        "name": "Bersaf Kumpul",
        "max": 50,
        "levels": {
          "KOSONG": 0,
          "MINIMAL": 23,
          "K1": 29,
          "K2": 32,
          "C1": 36,
          "C2": 39,
          "B1": 43,
          "B2": 46,
          "SB": 50
        }
      }
    ],
    "dantonPbb": [
      {
        "itemId": 1,
        "name": "Sikap Badan",
        "max": 16,
        "levels": {
          "KOSONG": 0,
          "MINIMAL": 1,
          "K1": 3,
          "K2": 5,
          "C1": 7,
          "C2": 9,
          "B1": 11,
          "B2": 13,
          "SB": 16
        }
      },
      {
        "itemId": 2,
        "name": "Volume Suara",
        "max": 17,
        "levels": {
          "KOSONG": 0,
          "MINIMAL": 1,
          "K1": 4,
          "K2": 6,
          "C1": 8,
          "C2": 10,
          "B1": 12,
          "B2": 14,
          "SB": 17
        }
      },
      {
        "itemId": 3,
        "name": "Artikulasi/Intonasi Suara",
        "max": 17,
        "levels": {
          "KOSONG": 0,
          "MINIMAL": 1,
          "K1": 4,
          "K2": 6,
          "C1": 8,
          "C2": 10,
          "B1": 12,
          "B2": 14,
          "SB": 17
        }
      },
      {
        "itemId": 4,
        "name": "Penguasaan Materi",
        "max": 18,
        "levels": {
          "KOSONG": 0,
          "MINIMAL": 2,
          "K1": 5,
          "K2": 7,
          "C1": 9,
          "C2": 11,
          "B1": 13,
          "B2": 15,
          "SB": 18
        }
      },
      {
        "itemId": 5,
        "name": "Penguasaan Pasukan",
        "max": 16,
        "levels": {
          "KOSONG": 0,
          "MINIMAL": 1,
          "K1": 3,
          "K2": 5,
          "C1": 7,
          "C2": 9,
          "B1": 11,
          "B2": 13,
          "SB": 16
        }
      },
      {
        "itemId": 6,
        "name": "Penguasaan Lapangan",
        "max": 16,
        "levels": {
          "KOSONG": 0,
          "MINIMAL": 1,
          "K1": 3,
          "K2": 5,
          "C1": 7,
          "C2": 9,
          "B1": 11,
          "B2": 13,
          "SB": 16
        }
      }
    ],
    "variasi": [
      {
        "itemId": 1,
        "name": "Opening",
        "max": 55,
        "levels": {
          "KOSONG": 0,
          "MINIMAL": 20,
          "K1": 25,
          "K2": 30,
          "C1": 35,
          "C2": 40,
          "B1": 45,
          "B2": 50,
          "SB": 55
        },
        "section": "VARIASI"
      },
      {
        "itemId": 2,
        "name": "Kualitas Gerakan",
        "max": 48,
        "levels": {
          "KOSONG": 0,
          "MINIMAL": 13,
          "K1": 18,
          "K2": 23,
          "C1": 28,
          "C2": 33,
          "B1": 38,
          "B2": 43,
          "SB": 48
        },
        "section": "ISI VARIASI"
      },
      {
        "itemId": 3,
        "name": "Ragam Gerak Statis & Dinamis",
        "max": 48,
        "levels": {
          "KOSONG": 0,
          "MINIMAL": 13,
          "K1": 18,
          "K2": 23,
          "C1": 28,
          "C2": 33,
          "B1": 38,
          "B2": 43,
          "SB": 48
        },
        "section": "ISI VARIASI"
      },
      {
        "itemId": 4,
        "name": "Unsur PBB",
        "max": 48,
        "levels": {
          "KOSONG": 0,
          "MINIMAL": 13,
          "K1": 18,
          "K2": 23,
          "C1": 28,
          "C2": 33,
          "B1": 38,
          "B2": 43,
          "SB": 48
        },
        "section": "ISI VARIASI"
      },
      {
        "itemId": 5,
        "name": "Konsep Tema, Kreativitas, & Korelasi dengan Gerakan",
        "max": 50,
        "levels": {
          "KOSONG": 0,
          "MINIMAL": 15,
          "K1": 20,
          "K2": 25,
          "C1": 30,
          "C2": 35,
          "B1": 40,
          "B2": 45,
          "SB": 50
        },
        "section": "ISI VARIASI"
      },
      {
        "itemId": 6,
        "name": "Jelajah Lapangan",
        "max": 46,
        "levels": {
          "KOSONG": 0,
          "MINIMAL": 11,
          "K1": 16,
          "K2": 21,
          "C1": 26,
          "C2": 31,
          "B1": 36,
          "B2": 41,
          "SB": 46
        },
        "section": "ISI VARIASI"
      },
      {
        "itemId": 7,
        "name": "Nilai Etika & Estetika",
        "max": 50,
        "levels": {
          "KOSONG": 0,
          "MINIMAL": 15,
          "K1": 20,
          "K2": 25,
          "C1": 30,
          "C2": 35,
          "B1": 40,
          "B2": 45,
          "SB": 50
        },
        "section": "ISI VARIASI"
      },
      {
        "itemId": 8,
        "name": "Ending Variasi",
        "max": 55,
        "levels": {
          "KOSONG": 0,
          "MINIMAL": 20,
          "K1": 25,
          "K2": 30,
          "C1": 35,
          "C2": 40,
          "B1": 45,
          "B2": 50,
          "SB": 55
        },
        "section": "ISI VARIASI"
      }
    ],
    "formasi": [
      {
        "itemId": 9,
        "name": "Proses Membuka",
        "max": 55,
        "levels": {
          "KOSONG": 0,
          "MINIMAL": 20,
          "K1": 25,
          "K2": 30,
          "C1": 35,
          "C2": 40,
          "B1": 45,
          "B2": 50,
          "SB": 55
        },
        "section": "BUKA FORMASI"
      },
      {
        "itemId": 10,
        "name": "Keindahan Pola, Alur, & Kualitas Gerakan",
        "max": 65,
        "levels": {
          "KOSONG": 0,
          "MINIMAL": 30,
          "K1": 35,
          "K2": 40,
          "C1": 45,
          "C2": 50,
          "B1": 55,
          "B2": 60,
          "SB": 65
        },
        "section": "BUKA FORMASI"
      },
      {
        "itemId": 11,
        "name": "Detail Bentuk Akhir Formasi",
        "max": 60,
        "levels": {
          "KOSONG": 0,
          "MINIMAL": 25,
          "K1": 30,
          "K2": 35,
          "C1": 40,
          "C2": 45,
          "B1": 50,
          "B2": 55,
          "SB": 60
        },
        "section": "BENTUK FORMASI"
      },
      {
        "itemId": 12,
        "name": "Selebrasi Tema",
        "max": 100,
        "levels": {
          "KOSONG": 0,
          "MINIMAL": 65,
          "K1": 70,
          "K2": 75,
          "C1": 80,
          "C2": 85,
          "B1": 90,
          "B2": 95,
          "SB": 100
        },
        "section": "BENTUK FORMASI"
      },
      {
        "itemId": 13,
        "name": "Proses Menutup",
        "max": 55,
        "levels": {
          "KOSONG": 0,
          "MINIMAL": 20,
          "K1": 25,
          "K2": 30,
          "C1": 35,
          "C2": 40,
          "B1": 45,
          "B2": 50,
          "SB": 55
        },
        "section": "TUTUP FORMASI"
      },
      {
        "itemId": 14,
        "name": "Keindahan Pola, Alur, & Kualitas Gerakan",
        "max": 65,
        "levels": {
          "KOSONG": 0,
          "MINIMAL": 30,
          "K1": 35,
          "K2": 40,
          "C1": 45,
          "C2": 50,
          "B1": 55,
          "B2": 60,
          "SB": 65
        },
        "section": "TUTUP FORMASI"
      },
      {
        "itemId": 15,
        "name": "Unsur PBB",
        "max": 50,
        "levels": {
          "KOSONG": 0,
          "MINIMAL": 15,
          "K1": 20,
          "K2": 25,
          "C1": 30,
          "C2": 35,
          "B1": 40,
          "B2": 45,
          "SB": 50
        },
        "section": "PENILAIAN TAMBAHAN FORMASI"
      },
      {
        "itemId": 16,
        "name": "Konsep Tema & Kreativitas",
        "max": 50,
        "levels": {
          "KOSONG": 0,
          "MINIMAL": 15,
          "K1": 20,
          "K2": 25,
          "C1": 30,
          "C2": 35,
          "B1": 40,
          "B2": 45,
          "SB": 50
        },
        "section": "PENILAIAN TAMBAHAN FORMASI"
      },
      {
        "itemId": 17,
        "name": "Etika & Estetika Penampilan",
        "max": 50,
        "levels": {
          "KOSONG": 0,
          "MINIMAL": 15,
          "K1": 20,
          "K2": 25,
          "C1": 30,
          "C2": 35,
          "B1": 40,
          "B2": 45,
          "SB": 50
        },
        "section": "PENILAIAN TAMBAHAN FORMASI"
      },
      {
        "itemId": 18,
        "name": "Ending Celebration",
        "max": 50,
        "levels": {
          "KOSONG": 0,
          "MINIMAL": 15,
          "K1": 20,
          "K2": 25,
          "C1": 30,
          "C2": 35,
          "B1": 40,
          "B2": 45,
          "SB": 50
        },
        "section": "PENILAIAN TAMBAHAN FORMASI"
      }
    ],
    "dantonVarfor": [
      {
        "itemId": 22,
        "name": "Artikulasi & Intonasi",
        "max": 18,
        "levels": {
          "KOSONG": 0,
          "MINIMAL": 2,
          "K1": 5,
          "K2": 7,
          "C1": 9,
          "C2": 11,
          "B1": 13,
          "B2": 15,
          "SB": 18
        }
      },
      {
        "itemId": 23,
        "name": "Penampilan & Penghayatan",
        "max": 18,
        "levels": {
          "KOSONG": 0,
          "MINIMAL": 2,
          "K1": 5,
          "K2": 7,
          "C1": 9,
          "C2": 11,
          "B1": 13,
          "B2": 15,
          "SB": 18
        }
      },
      {
        "itemId": 24,
        "name": "Sinergi Dengan Pasukan",
        "max": 16,
        "levels": {
          "KOSONG": 0,
          "MINIMAL": 1,
          "K1": 3,
          "K2": 5,
          "C1": 7,
          "C2": 9,
          "B1": 11,
          "B2": 13,
          "SB": 16
        },
        "sourceName": "Sinegritas Dengan Pasukan"
      }
    ]
  },
  "totals": {
    "pbb": 1000,
    "dantonPbb": 100,
    "variasi": 400,
    "formasi": 600,
    "dantonVarfor": 52
  }
}$ldwc_rubric_data$::JSONB
 WHERE scoring_template = 'LDWC_2026'
   AND rubric IS NULL;

-- ============================================================================
-- SOURCE: database/migrations/20261103_public_event_details.sql
-- ============================================================================

ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS description TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS image_url TEXT,
  ADD COLUMN IF NOT EXISTS start_time TIME,
  ADD COLUMN IF NOT EXISTS end_time TIME;

-- ============================================================================
-- SOURCE: database/migrations/20261103_public_voting_payments.sql
-- ============================================================================

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

-- ============================================================================
-- SOURCE: database/migrations/20261104_count_verified_voting_payments.sql
-- ============================================================================

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

-- ============================================================================
-- SOURCE: database/migrations/20261105_event_posters_storage.sql
-- ============================================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'event-posters',
  'event-posters',
  TRUE,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE
SET public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'Public can view event posters'
  ) THEN
    CREATE POLICY "Public can view event posters"
      ON storage.objects FOR SELECT
      TO anon, authenticated
      USING (bucket_id = 'event-posters');
  END IF;
END;
$$;

-- ============================================================================
-- SOURCE: database/migrations/20261106_jury_draft_review.sql
-- ============================================================================

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

-- ============================================================================
-- SOURCE: database/migrations/20261107_championship_announcements.sql
-- ============================================================================

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

-- ============================================================================
-- SOURCE: database/migrations/20261108_remove_unused_varfor_items.sql
-- ============================================================================

-- Remove the discontinued Danton Variasi/Formasi indicators from existing LDWC events.
-- Stored scores are cleaned before rubric snapshots so the submission validation trigger
-- still accepts the removal of these now-obsolete score entries.

UPDATE public.variasi_submissions AS submission
SET scores = (
  SELECT COALESCE(jsonb_agg(item.score ORDER BY item.ordinality), '[]'::jsonb)
  FROM jsonb_array_elements(submission.scores)
    WITH ORDINALITY AS item(score, ordinality)
  WHERE item.score->>'itemId' NOT IN ('19', '20', '21')
)
WHERE submission.event_id IN (
  SELECT event.id
  FROM public.events AS event
  WHERE event.scoring_template = 'LDWC_2026'
    AND event.rubric->'components'->'dantonVarfor' IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM jsonb_array_elements(event.rubric->'components'->'dantonVarfor')
        AS rubric_items(item)
      WHERE rubric_items.item->>'itemId' IN ('19', '20', '21')
    )
)
AND jsonb_typeof(submission.scores) = 'array'
AND EXISTS (
  SELECT 1
  FROM jsonb_array_elements(submission.scores) AS stored_scores(score)
  WHERE stored_scores.score->>'itemId' IN ('19', '20', '21')
);

UPDATE public.events AS event
SET rubric = jsonb_set(
  event.rubric,
  '{components,dantonVarfor}',
  (
    SELECT COALESCE(jsonb_agg(item.value ORDER BY item.ordinality), '[]'::jsonb)
    FROM jsonb_array_elements(event.rubric->'components'->'dantonVarfor')
      WITH ORDINALITY AS item(value, ordinality)
    WHERE item.value->>'itemId' NOT IN ('19', '20', '21')
  ),
  false
)
WHERE event.scoring_template = 'LDWC_2026'
  AND event.rubric->'components'->'dantonVarfor' IS NOT NULL
  AND EXISTS (
    SELECT 1
    FROM jsonb_array_elements(event.rubric->'components'->'dantonVarfor')
      AS rubric_items(item)
    WHERE rubric_items.item->>'itemId' IN ('19', '20', '21')
  );

-- ============================================================================
-- SOURCE: database/migrations/20261109_admin_unlock_finalized_submissions.sql
-- ============================================================================

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

-- ============================================================================
-- SOURCE: database/migrations/20261110_swap_participant_numbers.sql
-- ============================================================================

CREATE OR REPLACE FUNCTION public.set_participant_number(
  p_participant_id UUID,
  p_nomor_urut INTEGER
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  target_event_id UUID;
  old_number INTEGER;
  conflicting_participant_id UUID;
  temporary_number INTEGER;
  rows_affected INTEGER;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Hanya admin yang dapat mengubah nomor urut peserta.'
      USING ERRCODE = '42501';
  END IF;
  IF p_nomor_urut IS NULL OR p_nomor_urut < 1 THEN
    RAISE EXCEPTION 'Nomor urut harus bilangan bulat positif.';
  END IF;

  SELECT participant.event_id
  INTO target_event_id
  FROM public.participants AS participant
  WHERE participant.id = p_participant_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Peserta tidak ditemukan.';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(target_event_id::TEXT, 0));

  SELECT participant.nomor_urut
  INTO old_number
  FROM public.participants AS participant
  WHERE participant.id = p_participant_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Peserta tidak ditemukan.';
  END IF;

  IF old_number = p_nomor_urut THEN
    RETURN;
  END IF;

  SELECT participant.id
  INTO conflicting_participant_id
  FROM public.participants AS participant
  WHERE participant.event_id = target_event_id
    AND participant.nomor_urut = p_nomor_urut
    AND participant.id <> p_participant_id
  FOR UPDATE;

  IF conflicting_participant_id IS NULL THEN
    UPDATE public.participants
    SET nomor_urut = p_nomor_urut
    WHERE id = p_participant_id;
    GET DIAGNOSTICS rows_affected = ROW_COUNT;
    IF rows_affected = 0 THEN
      RAISE EXCEPTION 'Nomor urut peserta tidak dapat diperbarui.';
    END IF;
    RETURN;
  END IF;

  SELECT COALESCE(MAX(participant.nomor_urut), 0) + 1
  INTO temporary_number
  FROM public.participants AS participant
  WHERE participant.event_id = target_event_id;

  IF temporary_number IS NULL OR temporary_number < 1 THEN
    RAISE EXCEPTION 'Tidak dapat menentukan nomor sementara untuk menukar urutan.';
  END IF;

  UPDATE public.participants
  SET nomor_urut = temporary_number
  WHERE id = conflicting_participant_id;
  GET DIAGNOSTICS rows_affected = ROW_COUNT;
  IF rows_affected = 0 THEN
    RAISE EXCEPTION 'Nomor sementara peserta tidak dapat diperbarui.';
  END IF;

  UPDATE public.participants
  SET nomor_urut = p_nomor_urut
  WHERE id = p_participant_id;
  GET DIAGNOSTICS rows_affected = ROW_COUNT;
  IF rows_affected = 0 THEN
    RAISE EXCEPTION 'Nomor urut peserta tidak dapat diperbarui.';
  END IF;

  UPDATE public.participants
  SET nomor_urut = old_number
  WHERE id = conflicting_participant_id;
  GET DIAGNOSTICS rows_affected = ROW_COUNT;
  IF rows_affected = 0 THEN
    RAISE EXCEPTION 'Nomor urut peserta lain tidak dapat ditukar.';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.set_participant_number(UUID, INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.set_participant_number(UUID, INTEGER) TO authenticated;
