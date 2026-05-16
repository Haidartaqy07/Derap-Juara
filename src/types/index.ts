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
  nama_event: string;
  tanggal: string;
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

export interface PenilaianPbb {
  id: string;
  peserta_id: string;
  juri_id: string;
  tipe_juri: 'juri1' | 'juri2';
  is_submitted: boolean;
  is_locked: boolean;
  submitted_at: string | null;
  updated_at: string;
}

export interface PenilaianVarfor {
  id: string;
  peserta_id: string;
  juri_id: string;
  is_submitted: boolean;
  is_locked: boolean;
  submitted_at: string | null;
  updated_at: string;
}

export interface NilaiDetailPbb {
  penilaian_id: string;
  indikator_id: string;
  nilai: number;
}

export interface NilaiDetailVarfor {
  penilaian_id: string;
  kode_indikator: string;
  nilai: number;
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
  persen_pbb: number;
  persen_danton_pbb: number;
  persen_varfor: number;
  persen_danton_varfor: number;
  persen_voting: number;
  skor_juara_umum: number;
  skor_juara_utama: number;
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
