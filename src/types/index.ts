// Tipe data sesuai skema database
// Hanya field penting, tidak strict 100% — untuk kemudahan

export type UserRole = 'admin' | 'juri1' | 'juri2' | 'juri3';

export interface Profile {
  id: string;
  username: string;
  role: UserRole;
  created_at: string;
}

export interface Event {
  id: string;
  name: string;
  date: string;
  location: string | null;
  active_movement_ids: number[];
  batas_waktu_detik: number;
  status: 'draft' | 'aktif' | 'selesai';
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
}

export interface IndikatorPbb {
  id: string;
  event_id: string;
  urutan: number;
  nama_gerakan: string;
  kategori: 'pbb' | 'danton_pbb';
  is_gerakan_jalan: boolean;
  nilai_kosong: number;
  nilai_minimal: number;
  nilai_k1: number;
  nilai_k2: number;
  nilai_c1: number;
  nilai_c2: number;
  nilai_b1: number;
  nilai_b2: number;
  nilai_sb: number;
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
  submitted: boolean;
  submitted_at: string | null;
  updated_at: string;
}

export interface RekapNilaiPeserta {
  peserta_id: string;
  event_id: string;
  nama_regu: string;
  nomor_urut: number;
  waktu_tampil_detik: number | null;
  juri1_submitted: boolean;
  juri2_submitted: boolean;
  juri3_submitted: boolean;
  nilai_pbb_total: number;
  nilai_danton_pbb_total: number;
  nilai_varfor_total: number;
  nilai_danton_varfor_total: number;
  nilai_gerakan_jalan: number;
  nilai_formasi_only: number;
  voting: number;
  voting_raw: number;
  persen_pbb: number;
  persen_danton_pbb: number;
  persen_varfor: number;
  persen_danton_varfor: number;
  persen_voting: number;
  skor_juara_umum: number | null;
  skor_juara_utama: number | null;
  // Field penalti (skala poin)
  penalti_waktu_poin: number;
  penalti_manual_poin: number;
  total_penalti_poin: number;
  skor_juara_utama_bersih: number | null;
}

// Struktur indikator Variasi Formasi (fixed, sama untuk semua event)
// Sesuai lembar penilaian
export interface IndikatorVarfor {
  kode: string;
  urutan: number;
  nama: string;
  kategori: 'variasi' | 'formasi' | 'danton';
  group: string; // 'Opening', 'Isi Variasi', dll
  nilai_kosong: number;
  nilai_minimal: number;
  nilai_k1: number;
  nilai_k2: number;
  nilai_c1: number;
  nilai_c2: number;
  nilai_b1: number;
  nilai_b2: number;
  nilai_sb: number;
}