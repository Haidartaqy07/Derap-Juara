// Tipe data sesuai skema database
// Hanya field penting, tidak strict 100% — untuk kemudahan

export type JudgeRole = 'juri1' | 'juri2' | 'juri3';
export type UserRole = 'admin' | JudgeRole;
export type EventScoringTemplate = 'LDWC_2026' | 'LEGACY';
export type ParticipantCategory = 'U15' | 'U19';

export interface Profile {
  id: string;
  username: string;
  role: UserRole;
  created_at: string;
}

export interface Event {
  id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  date: string;
  start_time: string | null;
  end_time: string | null;
  location: string | null;
  active_movement_ids: number[];
  batas_waktu_detik: number;
  status: 'draft' | 'aktif' | 'selesai';
  scoring_template: EventScoringTemplate;
  rubric: import('@/lib/ldwc-rubric').LdwcRubric | null;
  categories: ParticipantCategory[];
  created_by: string | null;
  created_at: string;
}

export interface Peserta {
  id: string;
  event_id: string;
  nama_regu: string;
  nomor_urut: number;
  waktu_tampil_detik: number | null;
  vote_count: number;
  category: ParticipantCategory;
}

export interface SubmissionScore {
  itemId: number;
  value: number;
}

export interface PbbSubmission {
  id: string;
  participant_id: string;
  event_id: string;
  juri_role: 'juri1' | 'juri2';
  pbb_scores: SubmissionScore[];
  danton_scores: SubmissionScore[];
  draft_submitted_at: string | null;
  submitted: boolean;
  submitted_at: string | null;
  updated_at: string;
}

export interface VariasiSubmission {
  id: string;
  participant_id: string;
  event_id: string;
  juri_role: 'juri3';
  scores: SubmissionScore[];
  draft_submitted_at: string | null;
  submitted: boolean;
  submitted_at: string | null;
  updated_at: string;
}

// Struktur indikator Variasi Formasi (fixed, sama untuk semua event)
// Sesuai lembar penilaian
export interface IndikatorVarfor {
  kode: string;
  urutan: number;
  nama: string;
  kategori: 'variasi' | 'formasi' | 'danton';
  group: string;
  max: number;
  levels: Record<string, number>;
}