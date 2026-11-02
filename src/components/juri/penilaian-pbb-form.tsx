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

export default function PenilaianPbbForm(props: Props) {
  const items = getLdwcItems(props.rubric);
  return (
    <RubricScoreForm
      {...props}
      table="pbb_submissions"
      levelOrder={props.rubric.levelOrder}
      sections={[
        { title: 'Penilaian Gerakan PBB', field: 'pbb_scores', items: items.pbb },
        { title: 'Penilaian Danton PBB', field: 'danton_scores', items: items.dantonPbb },
      ]}
      submissionId={props.penilaianId}
    />
  );
}
