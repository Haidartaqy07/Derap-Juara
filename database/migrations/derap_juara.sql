-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.profiles (
  id uuid NOT NULL,
  username text NOT NULL,
  role text NOT NULL CHECK (role = ANY (ARRAY['admin'::text, 'juri1'::text, 'juri2'::text, 'juri3'::text])),
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT profiles_pkey PRIMARY KEY (id),
  CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id)
);
CREATE TABLE public.events (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  nama_event text NOT NULL,
  tanggal date NOT NULL,
  batas_waktu_detik integer NOT NULL DEFAULT 420,
  status text NOT NULL DEFAULT 'aktif'::text CHECK (status = ANY (ARRAY['draft'::text, 'aktif'::text, 'selesai'::text])),
  created_by uuid,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT events_pkey PRIMARY KEY (id),
  CONSTRAINT events_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id)
);
CREATE TABLE public.event_judges (
  event_id uuid NOT NULL,
  user_id uuid NOT NULL,
  tipe_juri text NOT NULL CHECK (tipe_juri = ANY (ARRAY['juri1'::text, 'juri2'::text, 'juri3'::text])),
  CONSTRAINT event_judges_pkey PRIMARY KEY (event_id, user_id),
  CONSTRAINT event_judges_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(id),
  CONSTRAINT event_judges_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.peserta (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL,
  nama_regu text NOT NULL,
  nomor_urut integer,
  waktu_tampil_detik integer,
  created_at timestamp with time zone DEFAULT now(),
  penalti_manual_poin numeric NOT NULL DEFAULT 0 CHECK (penalti_manual_poin >= 0::numeric),
  CONSTRAINT peserta_pkey PRIMARY KEY (id),
  CONSTRAINT peserta_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(id)
);
CREATE TABLE public.indikator_pbb (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL,
  urutan integer NOT NULL,
  nama_gerakan text NOT NULL,
  kategori text NOT NULL CHECK (kategori = ANY (ARRAY['pbb'::text, 'danton_pbb'::text])),
  is_gerakan_jalan boolean DEFAULT false,
  nilai_kosong integer DEFAULT 0,
  nilai_minimal integer NOT NULL,
  nilai_k1 integer NOT NULL,
  nilai_k2 integer NOT NULL,
  nilai_c1 integer NOT NULL,
  nilai_c2 integer NOT NULL,
  nilai_b1 integer NOT NULL,
  nilai_b2 integer NOT NULL,
  nilai_sb integer NOT NULL,
  CONSTRAINT indikator_pbb_pkey PRIMARY KEY (id),
  CONSTRAINT indikator_pbb_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(id)
);
CREATE TABLE public.penilaian_pbb (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  peserta_id uuid NOT NULL,
  juri_id uuid NOT NULL,
  tipe_juri text NOT NULL CHECK (tipe_juri = ANY (ARRAY['juri1'::text, 'juri2'::text])),
  is_submitted boolean DEFAULT false,
  is_locked boolean DEFAULT false,
  submitted_at timestamp with time zone,
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT penilaian_pbb_pkey PRIMARY KEY (id),
  CONSTRAINT penilaian_pbb_peserta_id_fkey FOREIGN KEY (peserta_id) REFERENCES public.peserta(id),
  CONSTRAINT penilaian_pbb_juri_id_fkey FOREIGN KEY (juri_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.nilai_detail_pbb (
  penilaian_id uuid NOT NULL,
  indikator_id uuid NOT NULL,
  nilai integer NOT NULL DEFAULT 0,
  CONSTRAINT nilai_detail_pbb_pkey PRIMARY KEY (penilaian_id, indikator_id),
  CONSTRAINT nilai_detail_pbb_penilaian_id_fkey FOREIGN KEY (penilaian_id) REFERENCES public.penilaian_pbb(id),
  CONSTRAINT nilai_detail_pbb_indikator_id_fkey FOREIGN KEY (indikator_id) REFERENCES public.indikator_pbb(id)
);
CREATE TABLE public.penilaian_varfor (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  peserta_id uuid NOT NULL UNIQUE,
  juri_id uuid NOT NULL,
  is_submitted boolean DEFAULT false,
  is_locked boolean DEFAULT false,
  submitted_at timestamp with time zone,
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT penilaian_varfor_pkey PRIMARY KEY (id),
  CONSTRAINT penilaian_varfor_peserta_id_fkey FOREIGN KEY (peserta_id) REFERENCES public.peserta(id),
  CONSTRAINT penilaian_varfor_juri_id_fkey FOREIGN KEY (juri_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.nilai_detail_varfor (
  penilaian_id uuid NOT NULL,
  kode_indikator text NOT NULL,
  nilai integer NOT NULL DEFAULT 0,
  CONSTRAINT nilai_detail_varfor_pkey PRIMARY KEY (penilaian_id, kode_indikator),
  CONSTRAINT nilai_detail_varfor_penilaian_id_fkey FOREIGN KEY (penilaian_id) REFERENCES public.penilaian_varfor(id)
);
CREATE TABLE public.voting (
  peserta_id uuid NOT NULL,
  voting_pasukan_favorit integer DEFAULT 0,
  CONSTRAINT voting_pkey PRIMARY KEY (peserta_id),
  CONSTRAINT voting_peserta_id_fkey FOREIGN KEY (peserta_id) REFERENCES public.peserta(id)
);