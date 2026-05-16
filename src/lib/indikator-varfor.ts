import { IndikatorVarfor } from '@/types';

// 24 indikator Variasi Formasi sesuai lembar penilaian
// V1-V18 = inti (Variasi + Formasi)
// D1-D6 = Danton Variasi-Formasi (terpisah, untuk skor Danton VarFor)
export const INDIKATOR_VARFOR: IndikatorVarfor[] = [
  // OPENING VARIASI
  { kode: 'V1', urutan: 1, nama: 'Opening', kategori: 'variasi', group: 'Opening', nilai_kosong: 0, nilai_minimal: 10, nilai_k1: 25, nilai_k2: 30, nilai_c1: 35, nilai_c2: 40, nilai_b1: 45, nilai_b2: 50, nilai_sb: 60 },
  // ISI VARIASI
  { kode: 'V2', urutan: 2, nama: 'Kualitas Gerakan', kategori: 'variasi', group: 'Isi Variasi', nilai_kosong: 0, nilai_minimal: 5, nilai_k1: 20, nilai_k2: 25, nilai_c1: 30, nilai_c2: 35, nilai_b1: 40, nilai_b2: 45, nilai_sb: 55 },
  { kode: 'V3', urutan: 3, nama: 'Ragam Gerak Statis & Dinamis', kategori: 'variasi', group: 'Isi Variasi', nilai_kosong: 0, nilai_minimal: 5, nilai_k1: 20, nilai_k2: 25, nilai_c1: 30, nilai_c2: 35, nilai_b1: 40, nilai_b2: 45, nilai_sb: 55 },
  { kode: 'V4', urutan: 4, nama: 'Unsur PBB', kategori: 'variasi', group: 'Isi Variasi', nilai_kosong: 0, nilai_minimal: 5, nilai_k1: 15, nilai_k2: 20, nilai_c1: 25, nilai_c2: 30, nilai_b1: 35, nilai_b2: 40, nilai_sb: 50 },
  { kode: 'V5', urutan: 5, nama: 'Konsep Tema, Kreativitas, & Korelasi', kategori: 'variasi', group: 'Isi Variasi', nilai_kosong: 0, nilai_minimal: 5, nilai_k1: 20, nilai_k2: 25, nilai_c1: 30, nilai_c2: 35, nilai_b1: 40, nilai_b2: 45, nilai_sb: 55 },
  { kode: 'V6', urutan: 6, nama: 'Jelajah Lapangan', kategori: 'variasi', group: 'Isi Variasi', nilai_kosong: 0, nilai_minimal: 5, nilai_k1: 15, nilai_k2: 20, nilai_c1: 25, nilai_c2: 30, nilai_b1: 35, nilai_b2: 40, nilai_sb: 50 },
  { kode: 'V7', urutan: 7, nama: 'Nilai Etika & Estetika', kategori: 'variasi', group: 'Isi Variasi', nilai_kosong: 0, nilai_minimal: 5, nilai_k1: 20, nilai_k2: 25, nilai_c1: 30, nilai_c2: 35, nilai_b1: 40, nilai_b2: 45, nilai_sb: 55 },
  { kode: 'V8', urutan: 8, nama: 'Ending Variasi', kategori: 'variasi', group: 'Isi Variasi', nilai_kosong: 0, nilai_minimal: 10, nilai_k1: 25, nilai_k2: 30, nilai_c1: 35, nilai_c2: 40, nilai_b1: 45, nilai_b2: 50, nilai_sb: 60 },
  // BUKA FORMASI
  { kode: 'V9', urutan: 9, nama: 'Proses Membuka', kategori: 'formasi', group: 'Buka Formasi', nilai_kosong: 0, nilai_minimal: 5, nilai_k1: 20, nilai_k2: 25, nilai_c1: 30, nilai_c2: 35, nilai_b1: 40, nilai_b2: 45, nilai_sb: 56 },
  { kode: 'V10', urutan: 10, nama: 'Keindahan Pola, Alur & Kualitas', kategori: 'formasi', group: 'Buka Formasi', nilai_kosong: 0, nilai_minimal: 5, nilai_k1: 20, nilai_k2: 25, nilai_c1: 30, nilai_c2: 35, nilai_b1: 40, nilai_b2: 45, nilai_sb: 56 },
  // BENTUK FORMASI
  { kode: 'V11', urutan: 11, nama: 'Detail Bentuk Akhir Formasi', kategori: 'formasi', group: 'Bentuk Formasi', nilai_kosong: 0, nilai_minimal: 10, nilai_k1: 25, nilai_k2: 30, nilai_c1: 35, nilai_c2: 40, nilai_b1: 45, nilai_b2: 50, nilai_sb: 61 },
  { kode: 'V12', urutan: 12, nama: 'Selebrasi Tema', kategori: 'formasi', group: 'Bentuk Formasi', nilai_kosong: 0, nilai_minimal: 10, nilai_k1: 25, nilai_k2: 30, nilai_c1: 35, nilai_c2: 40, nilai_b1: 45, nilai_b2: 50, nilai_sb: 61 },
  // TUTUP FORMASI
  { kode: 'V13', urutan: 13, nama: 'Proses Menutup', kategori: 'formasi', group: 'Tutup Formasi', nilai_kosong: 0, nilai_minimal: 5, nilai_k1: 20, nilai_k2: 25, nilai_c1: 30, nilai_c2: 35, nilai_b1: 40, nilai_b2: 45, nilai_sb: 56 },
  { kode: 'V14', urutan: 14, nama: 'Keindahan Pola, Alur & Kualitas', kategori: 'formasi', group: 'Tutup Formasi', nilai_kosong: 0, nilai_minimal: 5, nilai_k1: 20, nilai_k2: 25, nilai_c1: 30, nilai_c2: 35, nilai_b1: 40, nilai_b2: 45, nilai_sb: 56 },
  // PENILAIAN TAMBAHAN FORMASI
  { kode: 'V15', urutan: 15, nama: 'Unsur PBB', kategori: 'formasi', group: 'Tambahan Formasi', nilai_kosong: 0, nilai_minimal: 5, nilai_k1: 15, nilai_k2: 20, nilai_c1: 25, nilai_c2: 30, nilai_b1: 35, nilai_b2: 40, nilai_sb: 51 },
  { kode: 'V16', urutan: 16, nama: 'Konsep Tema, & Kreatifitas', kategori: 'formasi', group: 'Tambahan Formasi', nilai_kosong: 0, nilai_minimal: 5, nilai_k1: 20, nilai_k2: 25, nilai_c1: 30, nilai_c2: 35, nilai_b1: 40, nilai_b2: 45, nilai_sb: 56 },
  { kode: 'V17', urutan: 17, nama: 'Etika & Estetika Penampilan', kategori: 'formasi', group: 'Tambahan Formasi', nilai_kosong: 0, nilai_minimal: 5, nilai_k1: 15, nilai_k2: 20, nilai_c1: 25, nilai_c2: 30, nilai_b1: 35, nilai_b2: 40, nilai_sb: 51 },
  { kode: 'V18', urutan: 18, nama: 'Ending Celebration', kategori: 'formasi', group: 'Tambahan Formasi', nilai_kosong: 0, nilai_minimal: 5, nilai_k1: 20, nilai_k2: 25, nilai_c1: 30, nilai_c2: 35, nilai_b1: 40, nilai_b2: 45, nilai_sb: 56 },
  // DANTON SAAT VARIASI & FORMASI (terpisah dari skor VarFor)
  // Indikator D1-D3 hanya punya 3 level nilai (kosong, minimal, sb)
  { kode: 'D1', urutan: 19, nama: 'Aba-Aba Variasi', kategori: 'danton', group: 'Danton VarFor', nilai_kosong: 0, nilai_minimal: 2, nilai_k1: 2, nilai_k2: 2, nilai_c1: 16, nilai_c2: 16, nilai_b1: 16, nilai_b2: 16, nilai_sb: 16 },
  { kode: 'D2', urutan: 20, nama: 'Aba-Aba Buka Formasi', kategori: 'danton', group: 'Danton VarFor', nilai_kosong: 0, nilai_minimal: 2, nilai_k1: 2, nilai_k2: 2, nilai_c1: 16, nilai_c2: 16, nilai_b1: 16, nilai_b2: 16, nilai_sb: 16 },
  { kode: 'D3', urutan: 21, nama: 'Aba-Aba Tutup Formasi', kategori: 'danton', group: 'Danton VarFor', nilai_kosong: 0, nilai_minimal: 2, nilai_k1: 2, nilai_k2: 2, nilai_c1: 16, nilai_c2: 16, nilai_b1: 16, nilai_b2: 16, nilai_sb: 16 },
  { kode: 'D4', urutan: 22, nama: 'Artikulasi & Intonasi', kategori: 'danton', group: 'Danton VarFor', nilai_kosong: 0, nilai_minimal: 4, nilai_k1: 6, nilai_k2: 8, nilai_c1: 10, nilai_c2: 12, nilai_b1: 14, nilai_b2: 16, nilai_sb: 18 },
  { kode: 'D5', urutan: 23, nama: 'Penampilan & Penghayatan', kategori: 'danton', group: 'Danton VarFor', nilai_kosong: 0, nilai_minimal: 4, nilai_k1: 6, nilai_k2: 8, nilai_c1: 10, nilai_c2: 12, nilai_b1: 14, nilai_b2: 16, nilai_sb: 18 },
  { kode: 'D6', urutan: 24, nama: 'Sinergitan Dengan Pasukan', kategori: 'danton', group: 'Danton VarFor', nilai_kosong: 0, nilai_minimal: 2, nilai_k1: 4, nilai_k2: 6, nilai_c1: 8, nilai_c2: 10, nilai_b1: 12, nilai_b2: 14, nilai_sb: 16 },
];

// Helper: ambil indikator per kategori
export const INDIKATOR_VARIASI_FORMASI = INDIKATOR_VARFOR.filter((i) => i.kategori !== 'danton');
export const INDIKATOR_DANTON_VARFOR = INDIKATOR_VARFOR.filter((i) => i.kategori === 'danton');

// Label kolom nilai (tombol cepat)
export const LABEL_NILAI = [
  { key: 'nilai_kosong', label: 'Kosong', color: 'gray' },
  { key: 'nilai_minimal', label: 'Min', color: 'gray' },
  { key: 'nilai_k1', label: 'K1', color: 'red' },
  { key: 'nilai_k2', label: 'K2', color: 'red' },
  { key: 'nilai_c1', label: 'C1', color: 'amber' },
  { key: 'nilai_c2', label: 'C2', color: 'amber' },
  { key: 'nilai_b1', label: 'B1', color: 'blue' },
  { key: 'nilai_b2', label: 'B2', color: 'blue' },
  { key: 'nilai_sb', label: 'SB', color: 'green' },
] as const;
