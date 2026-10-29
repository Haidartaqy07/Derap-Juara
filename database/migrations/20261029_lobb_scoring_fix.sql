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
