'use client';

import { getLdwcItems, type LdwcRubric } from '@/lib/ldwc-rubric';
import RubricScoreForm from './rubric-score-form';

type Props = {
  penilaianId: string;
  isLocked: boolean;
  isSubmitted: boolean;
  isDraftSubmitted: boolean;
  onDraftSubmitted: () => void;
  rubric: LdwcRubric;
};

export default function PenilaianVarforForm(props: Props) {
  const items = getLdwcItems(props.rubric);
  return (
    <RubricScoreForm
      {...props}
      table="variasi_submissions"
      levelOrder={props.rubric.levelOrder}
      sections={[
        { title: 'Penilaian Variasi', field: 'scores', items: items.variasi },
        { title: 'Penilaian Formasi', field: 'scores', items: items.formasi },
        { title: 'Danton Variasi & Formasi', field: 'scores', items: items.dantonVarfor },
      ]}
      submissionId={props.penilaianId}
    />
  );
}
