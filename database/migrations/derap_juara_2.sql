-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.users (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  username text NOT NULL UNIQUE,
  password_hash text NOT NULL,
  role text NOT NULL CHECK (role = ANY (ARRAY['admin'::text, 'juri1'::text, 'juri2'::text, 'juri3'::text])),
  event_id text,
  display_name text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT users_pkey PRIMARY KEY (id)
);
CREATE TABLE public.events (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  date date NOT NULL,
  location text NOT NULL,
  active_movement_ids ARRAY DEFAULT '{}'::integer[],
  created_at timestamp with time zone DEFAULT now(),
  batas_waktu_detik integer NOT NULL DEFAULT 420,
  status text NOT NULL DEFAULT 'aktif'::text CHECK (status = ANY (ARRAY['draft'::text, 'aktif'::text, 'selesai'::text])),
  created_by uuid,
  CONSTRAINT events_pkey PRIMARY KEY (id),
  CONSTRAINT events_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id)
);
CREATE TABLE public.participants (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  event_id uuid,
  nama_regu text NOT NULL,
  nomor_urut integer NOT NULL,
  vote_count integer NOT NULL DEFAULT 0 CHECK (vote_count >= 0),
  created_at timestamp with time zone DEFAULT now(),
  waktu_tampil_detik integer,
  CONSTRAINT participants_pkey PRIMARY KEY (id),
  CONSTRAINT participants_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(id)
);
CREATE TABLE public.deductions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  participant_id uuid UNIQUE,
  points numeric NOT NULL DEFAULT 0 CHECK (points >= 0::numeric),
  notes text DEFAULT ''::text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT deductions_pkey PRIMARY KEY (id),
  CONSTRAINT deductions_participant_id_fkey FOREIGN KEY (participant_id) REFERENCES public.participants(id)
);
CREATE TABLE public.pbb_submissions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  participant_id uuid,
  event_id uuid NOT NULL,
  juri_role text NOT NULL CHECK (juri_role = ANY (ARRAY['juri1'::text, 'juri2'::text])),
  pbb_scores jsonb NOT NULL DEFAULT '[]'::jsonb,
  danton_scores jsonb NOT NULL DEFAULT '[]'::jsonb,
  submitted boolean DEFAULT false,
  submitted_at timestamp with time zone,
  notes text DEFAULT ''::text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT pbb_submissions_pkey PRIMARY KEY (id),
  CONSTRAINT pbb_submissions_participant_id_fkey FOREIGN KEY (participant_id) REFERENCES public.participants(id),
  CONSTRAINT pbb_submissions_participant_event_fkey FOREIGN KEY (participant_id) REFERENCES public.participants(id),
  CONSTRAINT pbb_submissions_participant_event_fkey FOREIGN KEY (event_id) REFERENCES public.participants(event_id)
);
CREATE TABLE public.variasi_submissions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  participant_id uuid,
  event_id uuid NOT NULL,
  juri_role text NOT NULL CHECK (juri_role = ANY (ARRAY['juri1'::text, 'juri2'::text, 'juri3'::text])),
  scores jsonb NOT NULL DEFAULT '[]'::jsonb,
  submitted boolean DEFAULT false,
  submitted_at timestamp with time zone,
  notes text DEFAULT ''::text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT variasi_submissions_pkey PRIMARY KEY (id),
  CONSTRAINT variasi_submissions_participant_id_fkey FOREIGN KEY (participant_id) REFERENCES public.participants(id),
  CONSTRAINT variasi_submissions_participant_event_fkey FOREIGN KEY (participant_id) REFERENCES public.participants(id),
  CONSTRAINT variasi_submissions_participant_event_fkey FOREIGN KEY (event_id) REFERENCES public.participants(event_id)
);
CREATE TABLE public.profiles (
  id uuid NOT NULL,
  username text NOT NULL UNIQUE,
  role text NOT NULL CHECK (role = ANY (ARRAY['admin'::text, 'juri1'::text, 'juri2'::text, 'juri3'::text])),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT profiles_pkey PRIMARY KEY (id),
  CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id)
);
CREATE TABLE public.event_judges (
  event_id uuid NOT NULL,
  user_id uuid NOT NULL,
  tipe_juri text NOT NULL CHECK (tipe_juri = ANY (ARRAY['juri1'::text, 'juri2'::text, 'juri3'::text])),
  CONSTRAINT event_judges_pkey PRIMARY KEY (event_id, user_id),
  CONSTRAINT event_judges_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(id),
  CONSTRAINT event_judges_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.indikator_pbb (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL,
  urutan integer NOT NULL,
  nama_gerakan text NOT NULL,
  kategori text NOT NULL CHECK (kategori = ANY (ARRAY['pbb'::text, 'danton_pbb'::text])),
  is_gerakan_jalan boolean NOT NULL DEFAULT false,
  nilai_kosong integer NOT NULL DEFAULT 0,
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