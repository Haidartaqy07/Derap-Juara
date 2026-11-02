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
