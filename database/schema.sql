-- ============================================================================
-- SISTEM PENILAIAN LOMBA PASKIBRA
-- Database Schema untuk Supabase (PostgreSQL)
-- ============================================================================
-- Jalankan seluruh file ini di Supabase SQL Editor sekali saja
-- ============================================================================

-- Bersihkan jika ada (HATI-HATI: hanya untuk fresh install)
DROP TABLE IF EXISTS public.nilai_detail_varfor CASCADE;
DROP TABLE IF EXISTS public.nilai_detail_pbb CASCADE;
DROP TABLE IF EXISTS public.penilaian_varfor CASCADE;
DROP TABLE IF EXISTS public.penilaian_pbb CASCADE;
DROP TABLE IF EXISTS public.voting CASCADE;
DROP TABLE IF EXISTS public.peserta CASCADE;
DROP TABLE IF EXISTS public.indikator_pbb CASCADE;
DROP TABLE IF EXISTS public.event_judges CASCADE;
DROP TABLE IF EXISTS public.events CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;

-- ============================================================================
-- TABEL: profiles
-- Menyimpan info user (extends auth.users dari Supabase Auth)
-- ============================================================================
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'juri1', 'juri2', 'juri3')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- TABEL: events
-- Setiap lomba adalah 1 event
-- ============================================================================
CREATE TABLE public.events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nama_event TEXT NOT NULL,
  tanggal DATE NOT NULL,
  batas_waktu_detik INTEGER NOT NULL DEFAULT 420, -- 7 menit default
  status TEXT NOT NULL DEFAULT 'aktif' CHECK (status IN ('draft', 'aktif', 'selesai')),
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- TABEL: event_judges
-- Penugasan juri ke event tertentu
-- ============================================================================
CREATE TABLE public.event_judges (
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  tipe_juri TEXT NOT NULL CHECK (tipe_juri IN ('juri1', 'juri2', 'juri3')),
  PRIMARY KEY (event_id, user_id),
  UNIQUE (event_id, tipe_juri) -- 1 event hanya boleh 1 juri per tipe
);

-- ============================================================================
-- TABEL: peserta
-- Regu yang ikut lomba
-- ============================================================================
CREATE TABLE public.peserta (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  nama_regu TEXT NOT NULL,
  nomor_urut INTEGER NOT NULL,
  waktu_tampil_detik INTEGER, -- diisi admin setelah tampil, untuk tie-breaker Danton
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (event_id, nomor_urut)
);

-- ============================================================================
-- TABEL: indikator_pbb
-- 26 gerakan PBB + 6 komandan pasukan untuk setiap event
-- ============================================================================
CREATE TABLE public.indikator_pbb (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  urutan INTEGER NOT NULL,
  nama_gerakan TEXT NOT NULL,
  kategori TEXT NOT NULL CHECK (kategori IN ('pbb', 'danton_pbb')),
  is_gerakan_jalan BOOLEAN DEFAULT FALSE, -- untuk tie-breaker PBB
  -- Nilai untuk tombol cepat (sesuai lembar penilaian)
  nilai_kosong INTEGER DEFAULT 0,
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

-- ============================================================================
-- TABEL: penilaian_pbb
-- Master record penilaian PBB per juri per peserta
-- ============================================================================
CREATE TABLE public.penilaian_pbb (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  peserta_id UUID NOT NULL REFERENCES public.peserta(id) ON DELETE CASCADE,
  juri_id UUID NOT NULL REFERENCES public.profiles(id),
  tipe_juri TEXT NOT NULL CHECK (tipe_juri IN ('juri1', 'juri2')),
  is_submitted BOOLEAN DEFAULT FALSE,
  is_locked BOOLEAN DEFAULT FALSE,
  submitted_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (peserta_id, tipe_juri) -- 1 peserta hanya 1 penilaian dari juri1, 1 dari juri2
);

-- ============================================================================
-- TABEL: nilai_detail_pbb
-- Detail nilai per indikator
-- ============================================================================
CREATE TABLE public.nilai_detail_pbb (
  penilaian_id UUID NOT NULL REFERENCES public.penilaian_pbb(id) ON DELETE CASCADE,
  indikator_id UUID NOT NULL REFERENCES public.indikator_pbb(id) ON DELETE CASCADE,
  nilai INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (penilaian_id, indikator_id)
);

-- ============================================================================
-- TABEL: penilaian_varfor
-- Master record penilaian Variasi Formasi per peserta (hanya juri3)
-- ============================================================================
CREATE TABLE public.penilaian_varfor (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  peserta_id UUID NOT NULL REFERENCES public.peserta(id) ON DELETE CASCADE,
  juri_id UUID NOT NULL REFERENCES public.profiles(id),
  is_submitted BOOLEAN DEFAULT FALSE,
  is_locked BOOLEAN DEFAULT FALSE,
  submitted_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (peserta_id) -- 1 peserta hanya 1 penilaian VarFor
);

-- ============================================================================
-- TABEL: nilai_detail_varfor
-- Detail nilai per indikator Variasi Formasi (24 indikator fixed)
-- Pakai kode_indikator karena indikator VarFor sama untuk semua event
-- ============================================================================
CREATE TABLE public.nilai_detail_varfor (
  penilaian_id UUID NOT NULL REFERENCES public.penilaian_varfor(id) ON DELETE CASCADE,
  kode_indikator TEXT NOT NULL, -- 'V1' (Opening), 'V2' (Kualitas Gerakan), ..., 'D1'-'D6' (Danton)
  nilai INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (penilaian_id, kode_indikator)
);

-- ============================================================================
-- TABEL: voting
-- Voting Instagram diinput admin
-- ============================================================================
CREATE TABLE public.voting (
  peserta_id UUID PRIMARY KEY REFERENCES public.peserta(id) ON DELETE CASCADE,
  voting_pasukan_favorit INTEGER DEFAULT 0
);

-- ============================================================================
-- INDEXES untuk performa query
-- ============================================================================
CREATE INDEX idx_peserta_event ON public.peserta(event_id);
CREATE INDEX idx_indikator_event ON public.indikator_pbb(event_id);
CREATE INDEX idx_penilaian_pbb_peserta ON public.penilaian_pbb(peserta_id);
CREATE INDEX idx_penilaian_varfor_peserta ON public.penilaian_varfor(peserta_id);
CREATE INDEX idx_event_judges_event ON public.event_judges(event_id);

-- ============================================================================
-- VIEW: rekap_nilai_peserta
-- View utama untuk perhitungan nilai akhir dan peringkat
-- Real-time recompute setiap ada update di tabel detail
-- ============================================================================
CREATE OR REPLACE VIEW public.rekap_nilai_peserta AS
WITH
-- Total PBB per juri (kategori 'pbb', indikator 1-26)
total_pbb_per_juri AS (
  SELECT
    p.id AS peserta_id,
    pp.tipe_juri,
    pp.is_submitted,
    COALESCE(SUM(CASE WHEN ip.kategori = 'pbb' THEN nd.nilai ELSE 0 END), 0) AS total_pbb,
    COALESCE(SUM(CASE WHEN ip.kategori = 'danton_pbb' THEN nd.nilai ELSE 0 END), 0) AS total_danton_pbb,
    COALESCE(SUM(CASE WHEN ip.kategori = 'pbb' AND ip.is_gerakan_jalan THEN nd.nilai ELSE 0 END), 0) AS total_gerakan_jalan
  FROM public.peserta p
  LEFT JOIN public.penilaian_pbb pp ON pp.peserta_id = p.id
  LEFT JOIN public.nilai_detail_pbb nd ON nd.penilaian_id = pp.id
  LEFT JOIN public.indikator_pbb ip ON ip.id = nd.indikator_id
  GROUP BY p.id, pp.tipe_juri, pp.is_submitted
),
-- Gabungan PBB Juri1 + Juri2
pbb_gabungan AS (
  SELECT
    peserta_id,
    SUM(CASE WHEN tipe_juri = 'juri1' AND is_submitted THEN total_pbb ELSE 0 END) AS pbb_juri1,
    SUM(CASE WHEN tipe_juri = 'juri2' AND is_submitted THEN total_pbb ELSE 0 END) AS pbb_juri2,
    SUM(CASE WHEN tipe_juri = 'juri1' AND is_submitted THEN total_danton_pbb ELSE 0 END) AS danton_juri1,
    SUM(CASE WHEN tipe_juri = 'juri2' AND is_submitted THEN total_danton_pbb ELSE 0 END) AS danton_juri2,
    SUM(CASE WHEN tipe_juri = 'juri1' AND is_submitted THEN total_gerakan_jalan ELSE 0 END) AS jalan_juri1,
    SUM(CASE WHEN tipe_juri = 'juri2' AND is_submitted THEN total_gerakan_jalan ELSE 0 END) AS jalan_juri2,
    BOOL_OR(CASE WHEN tipe_juri = 'juri1' THEN is_submitted ELSE FALSE END) AS juri1_submitted,
    BOOL_OR(CASE WHEN tipe_juri = 'juri2' THEN is_submitted ELSE FALSE END) AS juri2_submitted
  FROM total_pbb_per_juri
  GROUP BY peserta_id
),
-- Total VarFor & Danton VarFor (juri3)
varfor_total AS (
  SELECT
    p.id AS peserta_id,
    pv.is_submitted AS varfor_submitted,
    -- Indikator V1-V18 = Variasi Formasi inti
    COALESCE(SUM(CASE WHEN nd.kode_indikator LIKE 'V%' THEN nd.nilai ELSE 0 END), 0) AS total_varfor,
    -- Indikator D1-D6 = Danton VarFor
    COALESCE(SUM(CASE WHEN nd.kode_indikator LIKE 'D%' THEN nd.nilai ELSE 0 END), 0) AS total_danton_varfor,
    -- Untuk tie-breaker Juara VarFor: total nilai khusus FORMASI (V9-V18)
    COALESCE(SUM(CASE WHEN nd.kode_indikator IN ('V9','V10','V11','V12','V13','V14','V15','V16','V17','V18') THEN nd.nilai ELSE 0 END), 0) AS total_formasi_only
  FROM public.peserta p
  LEFT JOIN public.penilaian_varfor pv ON pv.peserta_id = p.id
  LEFT JOIN public.nilai_detail_varfor nd ON nd.penilaian_id = pv.id
  GROUP BY p.id, pv.is_submitted
),
-- Voting maksimal untuk normalisasi
voting_max AS (
  SELECT
    p.event_id,
    NULLIF(MAX(COALESCE(v.voting_pasukan_favorit, 0)), 0) AS max_voting
  FROM public.peserta p
  LEFT JOIN public.voting v ON v.peserta_id = p.id
  GROUP BY p.event_id
)
SELECT
  p.id AS peserta_id,
  p.event_id,
  p.nama_regu,
  p.nomor_urut,
  p.waktu_tampil_detik,
  -- Status submit
  COALESCE(pg.juri1_submitted, FALSE) AS juri1_submitted,
  COALESCE(pg.juri2_submitted, FALSE) AS juri2_submitted,
  COALESCE(vt.varfor_submitted, FALSE) AS juri3_submitted,
  -- Nilai mentah
  COALESCE(pg.pbb_juri1, 0) + COALESCE(pg.pbb_juri2, 0) AS nilai_pbb_total,
  COALESCE(pg.danton_juri1, 0) + COALESCE(pg.danton_juri2, 0) AS nilai_danton_pbb_total,
  COALESCE(vt.total_varfor, 0) AS nilai_varfor_total,
  COALESCE(vt.total_danton_varfor, 0) AS nilai_danton_varfor_total,
  COALESCE(pg.jalan_juri1, 0) + COALESCE(pg.jalan_juri2, 0) AS nilai_gerakan_jalan,
  COALESCE(vt.total_formasi_only, 0) AS nilai_formasi_only,
  COALESCE(v.voting_pasukan_favorit, 0) AS voting,
  -- Konversi persentase (skala 0-100)
  -- Maks PBB = 2000 (1000 dari juri1 + 1000 dari juri2)
  -- Maks Danton PBB = 200 (100 + 100)
  -- Maks VarFor = 916 (jumlah max indikator V1-V18)
  -- Maks Danton VarFor = 102 (jumlah max indikator D1-D6)
  ROUND(((COALESCE(pg.pbb_juri1, 0) + COALESCE(pg.pbb_juri2, 0))::NUMERIC / 2000.0) * 100, 2) AS persen_pbb,
  ROUND(((COALESCE(pg.danton_juri1, 0) + COALESCE(pg.danton_juri2, 0))::NUMERIC / 200.0) * 100, 2) AS persen_danton_pbb,
  ROUND((COALESCE(vt.total_varfor, 0)::NUMERIC / 916.0) * 100, 2) AS persen_varfor,
  ROUND((COALESCE(vt.total_danton_varfor, 0)::NUMERIC / 102.0) * 100, 2) AS persen_danton_varfor,
  ROUND(
    CASE
      WHEN vm.max_voting IS NULL OR vm.max_voting = 0 THEN 0
      ELSE (COALESCE(v.voting_pasukan_favorit, 0)::NUMERIC / vm.max_voting::NUMERIC) * 100
    END, 2
  ) AS persen_voting,
  -- SKOR JUARA UMUM: PBB 60% + VarFor 30% + Danton (rata2) 5% + Voting 5%
  ROUND(
    (((COALESCE(pg.pbb_juri1, 0) + COALESCE(pg.pbb_juri2, 0))::NUMERIC / 2000.0) * 100 * 0.60) +
    ((COALESCE(vt.total_varfor, 0)::NUMERIC / 916.0) * 100 * 0.30) +
    (((
      ((COALESCE(pg.danton_juri1, 0) + COALESCE(pg.danton_juri2, 0))::NUMERIC / 200.0) * 100 +
      (COALESCE(vt.total_danton_varfor, 0)::NUMERIC / 102.0) * 100
    ) / 2.0) * 0.05) +
    (CASE
      WHEN vm.max_voting IS NULL OR vm.max_voting = 0 THEN 0
      ELSE (COALESCE(v.voting_pasukan_favorit, 0)::NUMERIC / vm.max_voting::NUMERIC) * 100
    END * 0.05)
  , 2) AS skor_juara_umum,
  -- SKOR JUARA UTAMA-TERAKHIR: PBB 65% + VarFor 25% + Danton PBB 5% + Danton VarFor 5%
  ROUND(
    (((COALESCE(pg.pbb_juri1, 0) + COALESCE(pg.pbb_juri2, 0))::NUMERIC / 2000.0) * 100 * 0.65) +
    ((COALESCE(vt.total_varfor, 0)::NUMERIC / 916.0) * 100 * 0.25) +
    (((COALESCE(pg.danton_juri1, 0) + COALESCE(pg.danton_juri2, 0))::NUMERIC / 200.0) * 100 * 0.05) +
    ((COALESCE(vt.total_danton_varfor, 0)::NUMERIC / 102.0) * 100 * 0.05)
  , 2) AS skor_juara_utama
FROM public.peserta p
LEFT JOIN pbb_gabungan pg ON pg.peserta_id = p.id
LEFT JOIN varfor_total vt ON vt.peserta_id = p.id
LEFT JOIN public.voting v ON v.peserta_id = p.id
LEFT JOIN voting_max vm ON vm.event_id = p.event_id;

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_judges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.peserta ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.indikator_pbb ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.penilaian_pbb ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nilai_detail_pbb ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.penilaian_varfor ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nilai_detail_varfor ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.voting ENABLE ROW LEVEL SECURITY;

-- Helper function: cek apakah user adalah admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- Helper function: ambil role user saat ini
CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS TEXT AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- Profiles: semua bisa baca, hanya admin bisa modify
CREATE POLICY "profiles_select_all" ON public.profiles FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "profiles_admin_all" ON public.profiles FOR ALL USING (public.is_admin());

-- Events: semua login bisa baca, hanya admin bisa modify
CREATE POLICY "events_select_all" ON public.events FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "events_admin_all" ON public.events FOR ALL USING (public.is_admin());

-- Event judges: semua login bisa baca, hanya admin bisa modify
CREATE POLICY "event_judges_select_all" ON public.event_judges FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "event_judges_admin_all" ON public.event_judges FOR ALL USING (public.is_admin());

-- Peserta: semua login bisa baca, hanya admin bisa modify
CREATE POLICY "peserta_select_all" ON public.peserta FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "peserta_admin_all" ON public.peserta FOR ALL USING (public.is_admin());

-- Indikator PBB: semua login bisa baca, hanya admin bisa modify
CREATE POLICY "indikator_select_all" ON public.indikator_pbb FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "indikator_admin_all" ON public.indikator_pbb FOR ALL USING (public.is_admin());

-- Penilaian PBB: juri bisa baca/edit penilaian sendiri yang belum locked, admin bisa semua
CREATE POLICY "penilaian_pbb_select" ON public.penilaian_pbb FOR SELECT
  USING (auth.uid() IS NOT NULL);
CREATE POLICY "penilaian_pbb_insert" ON public.penilaian_pbb FOR INSERT
  WITH CHECK (
    public.is_admin() OR (
      juri_id = auth.uid()
      AND public.current_user_role() = tipe_juri
    )
  );
CREATE POLICY "penilaian_pbb_update" ON public.penilaian_pbb FOR UPDATE
  USING (
    public.is_admin() OR (
      juri_id = auth.uid()
      AND public.current_user_role() = tipe_juri
      AND is_locked = FALSE
    )
  );
CREATE POLICY "penilaian_pbb_delete_admin" ON public.penilaian_pbb FOR DELETE USING (public.is_admin());

-- Nilai detail PBB: ikuti penilaian induk
CREATE POLICY "nilai_pbb_select" ON public.nilai_detail_pbb FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "nilai_pbb_modify" ON public.nilai_detail_pbb FOR ALL
  USING (
    public.is_admin() OR EXISTS (
      SELECT 1 FROM public.penilaian_pbb pp
      WHERE pp.id = penilaian_id
        AND pp.juri_id = auth.uid()
        AND pp.is_locked = FALSE
    )
  );

-- Penilaian VarFor: hanya juri3
CREATE POLICY "penilaian_varfor_select" ON public.penilaian_varfor FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "penilaian_varfor_insert" ON public.penilaian_varfor FOR INSERT
  WITH CHECK (
    public.is_admin() OR (
      juri_id = auth.uid()
      AND public.current_user_role() = 'juri3'
    )
  );
CREATE POLICY "penilaian_varfor_update" ON public.penilaian_varfor FOR UPDATE
  USING (
    public.is_admin() OR (
      juri_id = auth.uid()
      AND public.current_user_role() = 'juri3'
      AND is_locked = FALSE
    )
  );
CREATE POLICY "penilaian_varfor_delete_admin" ON public.penilaian_varfor FOR DELETE USING (public.is_admin());

-- Nilai detail VarFor: ikuti penilaian induk
CREATE POLICY "nilai_varfor_select" ON public.nilai_detail_varfor FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "nilai_varfor_modify" ON public.nilai_detail_varfor FOR ALL
  USING (
    public.is_admin() OR EXISTS (
      SELECT 1 FROM public.penilaian_varfor pv
      WHERE pv.id = penilaian_id
        AND pv.juri_id = auth.uid()
        AND pv.is_locked = FALSE
    )
  );

-- Voting: semua login bisa baca, hanya admin bisa modify
CREATE POLICY "voting_select" ON public.voting FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "voting_admin_all" ON public.voting FOR ALL USING (public.is_admin());

-- ============================================================================
-- REALTIME (untuk live update peringkat di admin dashboard)
-- ============================================================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.penilaian_pbb;
ALTER PUBLICATION supabase_realtime ADD TABLE public.penilaian_varfor;
ALTER PUBLICATION supabase_realtime ADD TABLE public.nilai_detail_pbb;
ALTER PUBLICATION supabase_realtime ADD TABLE public.nilai_detail_varfor;
ALTER PUBLICATION supabase_realtime ADD TABLE public.voting;
ALTER PUBLICATION supabase_realtime ADD TABLE public.peserta;

-- ============================================================================
-- FUNCTION: seed_indikator_pbb_default
-- Otomatis isi 26 indikator PBB + 6 indikator Danton saat event dibuat
-- ============================================================================
CREATE OR REPLACE FUNCTION public.seed_indikator_pbb_default(p_event_id UUID)
RETURNS VOID AS $$
BEGIN
  -- 26 indikator PBB (sesuai lembar penilaian)
  INSERT INTO public.indikator_pbb (event_id, urutan, nama_gerakan, kategori, is_gerakan_jalan,
    nilai_kosong, nilai_minimal, nilai_k1, nilai_k2, nilai_c1, nilai_c2, nilai_b1, nilai_b2, nilai_sb)
  VALUES
    (p_event_id, 1, 'Lari', 'pbb', TRUE, 0, 20, 23, 26, 29, 32, 35, 38, 41),
    (p_event_id, 2, 'Dua Kali Belok Kanan', 'pbb', FALSE, 0, 23, 26, 29, 32, 35, 38, 41, 44),
    (p_event_id, 3, 'Langkah Biasa', 'pbb', TRUE, 0, 19, 22, 25, 28, 31, 34, 37, 40),
    (p_event_id, 4, 'Tiap-Tiap Banjar Dua Kali Belok Kiri', 'pbb', FALSE, 0, 21, 24, 27, 30, 33, 36, 39, 42),
    (p_event_id, 5, 'Langkah Perlahan', 'pbb', TRUE, 0, 19, 22, 25, 28, 31, 34, 37, 40),
    (p_event_id, 6, 'Hormat Kanan', 'pbb', FALSE, 0, 24, 27, 30, 33, 36, 39, 42, 45),
    (p_event_id, 7, 'Dua Kali Belok Kanan', 'pbb', FALSE, 0, 25, 28, 31, 34, 37, 40, 43, 46),
    (p_event_id, 8, 'Belok Kanan', 'pbb', FALSE, 0, 23, 26, 29, 32, 35, 38, 41, 44),
    (p_event_id, 9, 'Melintang Kiri', 'pbb', FALSE, 0, 23, 26, 29, 32, 35, 38, 41, 44),
    (p_event_id, 10, 'Hadap Kanan Maju', 'pbb', TRUE, 0, 17, 20, 23, 26, 29, 32, 35, 38),
    (p_event_id, 11, 'Dua Kali Belok Kanan', 'pbb', FALSE, 0, 23, 26, 29, 32, 35, 38, 41, 44),
    (p_event_id, 12, 'Hadap Kiri Maju', 'pbb', TRUE, 0, 17, 20, 23, 26, 29, 32, 35, 38),
    (p_event_id, 13, '3 Langkah Ke Depan', 'pbb', TRUE, 0, 15, 18, 21, 24, 27, 30, 33, 36),
    (p_event_id, 14, '3 Langkah Ke Kiri', 'pbb', TRUE, 0, 15, 18, 21, 24, 27, 30, 33, 36),
    (p_event_id, 15, 'Hadap Serong Kanan', 'pbb', FALSE, 0, 13, 16, 19, 22, 25, 28, 31, 34),
    (p_event_id, 16, 'Parade Istirahat Di Tempat', 'pbb', FALSE, 0, 14, 17, 20, 23, 26, 29, 32, 35),
    (p_event_id, 17, 'Parade Periksa Kerapian', 'pbb', FALSE, 0, 17, 20, 23, 26, 29, 32, 35, 38),
    (p_event_id, 18, '3 Langkah Ke Belakang', 'pbb', TRUE, 0, 15, 18, 21, 24, 27, 30, 33, 36),
    (p_event_id, 19, 'Hadap Serong Kanan Jalan Di Tempat', 'pbb', TRUE, 0, 14, 17, 20, 23, 26, 29, 32, 35),
    (p_event_id, 20, 'Lencang Depan', 'pbb', FALSE, 0, 12, 15, 18, 21, 24, 27, 30, 33),
    (p_event_id, 21, 'Hadap Kiri', 'pbb', FALSE, 0, 13, 16, 19, 22, 25, 28, 31, 34),
    (p_event_id, 22, 'Lencang Kanan', 'pbb', FALSE, 0, 12, 15, 18, 21, 24, 27, 30, 33),
    (p_event_id, 23, 'Hormat', 'pbb', FALSE, 0, 12, 15, 18, 21, 24, 27, 30, 33),
    (p_event_id, 24, 'Hitung', 'pbb', FALSE, 0, 12, 15, 18, 21, 24, 27, 30, 33),
    (p_event_id, 25, 'Bubar', 'pbb', FALSE, 0, 18, 21, 24, 27, 30, 33, 36, 39),
    (p_event_id, 26, 'Berkumpul', 'pbb', FALSE, 0, 18, 21, 24, 27, 30, 33, 36, 39);

  -- 6 indikator Komandan Pasukan (Danton PBB)
  INSERT INTO public.indikator_pbb (event_id, urutan, nama_gerakan, kategori, is_gerakan_jalan,
    nilai_kosong, nilai_minimal, nilai_k1, nilai_k2, nilai_c1, nilai_c2, nilai_b1, nilai_b2, nilai_sb)
  VALUES
    (p_event_id, 1, 'Sikap Badan', 'danton_pbb', FALSE, 0, 2, 4, 6, 8, 10, 12, 14, 16),
    (p_event_id, 2, 'Volume Suara', 'danton_pbb', FALSE, 0, 3, 5, 7, 9, 11, 13, 15, 17),
    (p_event_id, 3, 'Artikulasi/Intonasi Suara', 'danton_pbb', FALSE, 0, 3, 5, 7, 9, 11, 13, 15, 17),
    (p_event_id, 4, 'Penguasaan Materi', 'danton_pbb', FALSE, 0, 4, 6, 8, 10, 12, 14, 16, 18),
    (p_event_id, 5, 'Penguasaan Pasukan', 'danton_pbb', FALSE, 0, 2, 4, 6, 8, 10, 12, 14, 16),
    (p_event_id, 6, 'Penguasaan Lapangan', 'danton_pbb', FALSE, 0, 2, 4, 6, 8, 10, 12, 14, 16);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- TRIGGER: auto-seed indikator saat event dibuat
-- ============================================================================
CREATE OR REPLACE FUNCTION public.trigger_seed_indikator()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM public.seed_indikator_pbb_default(NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_event_created
AFTER INSERT ON public.events
FOR EACH ROW EXECUTE FUNCTION public.trigger_seed_indikator();

-- ============================================================================
-- SELESAI
-- ============================================================================
-- Setelah jalankan ini, lanjut ke langkah 5 di README:
-- Buat user admin lewat Authentication → Users di dashboard Supabase
-- ============================================================================
