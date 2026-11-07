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
