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
