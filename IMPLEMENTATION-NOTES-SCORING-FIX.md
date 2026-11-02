# Catatan Implementasi: Perbaikan Penilaian SIMPASKIB (LDWC 2026)

Versi: **3**
Status: **Siap dikerjakan. Satu hal diblokir: bobot dan aturan ranking nilai akhir LDWC (§3).**

Berkas pendamping (letakkan di repository, mis. `docs/data/`):

| Berkas | Fungsi |
|---|---|
| `ldwc2026-rubric.json` | Rubrik LDWC lengkap (nama item, nilai maksimum, 9 level nilai per item). Dibangkitkan dari `Lembar_Penilaian_LDWC.xlsx`. **Sumber data untuk `pbbData.ts` / `variasiData.ts`. Jangan ketik ulang manual.** |
| `lobb2026-fixture.json` | 20 regu LOBB dengan nilai mentah dan nilai akhir resmi. **Hanya untuk menguji mesin hitung, bukan untuk rubrik atau bobot LDWC.** |

---

## 1. Keputusan yang sudah final

1. **Rubrik dan susunan penilaian mengikuti file LDWC** (sudah dikonfirmasi pemilik lomba): 26 gerakan PBB, Danton PBB, Variasi, Formasi, Danton Variasi & Formasi, dan Kostum.
2. **Rumus lama aplikasi salah dan harus diganti** (alasan di §2). Kerangka rumus yang benar:

```
kontribusi_k = raw_k / max_k × poin_k
NilaiAkhir   = Σ kontribusi_k − Pengurangan
```

   `max_k` diambil dari rubrik (tetap), bukan dari "gerakan aktif event". `poin_k` adalah bobot komponen dalam poin (diisi dari aturan panitia).
3. **LOBB tidak lagi dipakai sebagai rubrik.** Konfigurasi dan fixture LOBB hanya dipertahankan sebagai bahan uji, karena itu satu-satunya rumus yang terbukti cocok dengan hasil resmi.

## 2. Mengapa rumus lama salah (ringkas)

Temuan berasal dari formula asli Excel LOBB, dicocokkan 1:1 dengan PDF pemenang (20 dari 20 regu SMP cocok).

| Aspek | Aplikasi saat ini | Yang benar |
|---|---|---|
| Penggabungan komponen | Rata-rata sama rata `(PBB% + Danton% + Variasi%) / 3` | Jumlah tertimbang dengan bobot berbeda per komponen |
| Normalisasi | `raw / max_gerakan_aktif × 100` | `raw / max_tetap × poin` (max dari rubrik) |
| Variasi | 24 item dijumlah jadi satu (`MAX_VARIASI_SCORE = 1100`) | 18 item = Variasi Formasi (maks 1000). 6 item Danton dipisah sebagai Danpas (maks 100) |
| Danton / Danpas | Hanya Danton dari submission PBB | Dua Danpas: saat PBB dan saat Variasi & Formasi |
| Pengurangan | Tidak ada (hanya `notes` teks) | Angka poin, dikurangkan langsung dari total |
| Voting | Tidak ada | LOBB memakai proporsi suara × 50 poin untuk Juara Umum. Untuk LDWC, pemilik memutuskan voting adalah penghargaan terpisah dan tidak memengaruhi nilai lomba |
| Output | Satu "Nilai Akhir" | Satu atau lebih ranking, sesuai aturan panitia |
| Juri belum lengkap | Rata-rata dari juri yang sudah submit | Tunggu semua juri yang ditetapkan (lihat §6, F3) |

Angka 1100 di `SCORING.md` sama dengan 1000 (Variasi + Formasi) + 100 (Danton Variasi). Tiga bug terbesar: rata-rata `/3`, Danton Variasi tercampur di Variasi, dan pembagi "max gerakan aktif".

---

## 3. Yang diblokir: aturan nilai akhir LDWC

File LDWC berhenti di subtotal dan nilai maksimum. Tidak ada bobot, jenis ranking, atau penalti. **Jangan menebak atau meminjam bobot LOBB (65/25/5/5 dan 60/30/5/5).** Pemilik lomba menetapkan voting sebagai penghargaan terpisah yang tidak masuk nilai LDWC; jangan memakai rumus voting LOBB pada hasil LDWC. Hal lain yang perlu dikonfirmasi:

1. Ranking apa saja yang dipakai (mis. Juara Umum, Juara Utama, kategori "Terbaik"), dan apakah U15 dan U19 dirangking terpisah?
2. Bobot tiap komponen: PBB, Variasi, Formasi, Danton PBB, Danton Variasi, Kostum. Apakah Variasi dan Formasi digabung jadi satu komponen /1000 atau dibobot terpisah?
3. Apakah Kostum masuk nilai akhir atau hanya penghargaan terpisah?
4. Apakah ada penalti (pengurangan)? Voting publik tidak memengaruhi nilai LDWC.
5. Jumlah juri per komponen (PBB dan Danton PBB: dua juri dirata-rata seperti LOBB? Variasi/Formasi? Kostum?).
6. Nilai "MINIMAL" Danton Variasi item 1-3 di lembar tertulis 1 (item 4-5 bernilai 2, item 6 bernilai 1). Apakah benar?

**Perilaku aplikasi selama bobot belum ada** (wajib diimplementasikan, lihat F5):

- Konfigurasi LDWC memakai `points: null` untuk setiap komponen.
- `ResultsTab` menampilkan status submission dan subtotal tiap komponen (nilai mentah). Ranking nilai akhir **tidak dihitung**; tampilkan pesan "Bobot nilai akhir LDWC belum dikonfigurasi".
- Begitu semua `points` terisi, ranking otomatis aktif tanpa perubahan kode lain.

---

## 4. Rubrik LDWC (sumber: `ldwc2026-rubric.json`)

### 4.1 Komponen dan nilai maksimum

| Komponen | Kunci | Item | `itemId` | Maks | Lokasi data |
|---|---|---|---|---|---|
| PBB (per juri) | `pbb` | 26 | 1-26 | 1000 | `pbb_submissions.pbb_scores` |
| Danton PBB (per juri) | `dantonPbb` | 6 | 1-6 | 100 | `pbb_submissions.danton_scores` |
| Variasi | `variasi` | 8 | 1-8 | 400 | `variasi_submissions.scores` |
| Formasi | `formasi` | 10 | 9-18 | 600 | `variasi_submissions.scores` |
| Danton Variasi & Formasi | `dantonVarfor` | 6 | 19-24 | 100 | `variasi_submissions.scores` |
| Kostum | `kostum` | 10 | 1-10 | 100 | `kostum_submissions.scores` (baru) |

`variasi` + `formasi` = 1000 (disebut **Variasi Formasi** di LOBB). Pemisahan `itemId` 1-18 dan 19-24 inilah yang memperbaiki bug "24 item jadi satu".

### 4.2 Skala nilai

Sembilan level: `KOSONG, MINIMAL, K1, K2, C1, C2, B1, B2, SB`. Nilai yang disimpan adalah angka, bukan label.

| Rubrik | Rumus 9 nilai (M = nilai maksimum item) |
|---|---|
| PBB | `[0, M-27, M-21, M-18, M-14, M-11, M-7, M-4, M]` |
| Variasi & Formasi | `[0, M-35, M-30, M-25, M-20, M-15, M-10, M-5, M]` |
| Danton PBB item 1, 5, 6 (maks 16) | `[0, 1, 3, 5, 7, 9, 11, 13, 16]` |
| Danton PBB item 2, 3 (maks 17) | `[0, 1, 4, 6, 8, 10, 12, 14, 17]` |
| Danton PBB item 4 (maks 18) | `[0, 2, 5, 7, 9, 11, 13, 15, 18]` |
| Danton Variasi item 4, 5 (maks 18) | `[0, 2, 5, 7, 9, 11, 13, 15, 18]` |
| Danton Variasi item 6 (maks 16) | `[0, 1, 3, 5, 7, 9, 11, 13, 16]` |
| Danton Variasi item 1-3 (maks 16) | **3 level saja:** `KOSONG=0, MINIMAL=1, SB=16` |
| Kostum (semua item, maks 10) | `[0, 2, 3, 4, 6, 7, 8, 9, 10]` |

Rumus di tabel hanya ringkasan. **Yang dipakai kode adalah nilai di JSON.** Contoh PBB maks 38: `[0, 11, 17, 20, 24, 27, 31, 34, 38]`.

Item 19-21 (Danton Variasi 1-3) hanya punya tiga level. Komponen `ScoreRow` harus merender hanya level yang ada di `levels`, bukan memaksa sembilan tombol. Nilai MINIMAL di aplikasi lama adalah 2 (`[0, 2, 16]`), di LDWC 1; pakai nilai dari JSON dan tandai `TODO` sampai pertanyaan 6 di §3 terjawab.

### 4.3 PBB: maksimum per gerakan

| No | Gerakan | Maks | No | Gerakan | Maks |
|---|---|---|---|---|---|
| 1 | Langkah Tegap Maju | 38 | 14 | Haluan Kanan Maju | 50 |
| 2 | Belok Kiri | 40 | 15 | Tiga Langkah Ke Kanan | 40 |
| 3 | Hormat Kanan | 38 | 16 | Parade Istirahat Di Tempat | 30 |
| 4 | Dua Kali Belok Kiri | 40 | 17 | Parade Periksa Kerapian | 40 |
| 5 | Langkah Perlahan | 38 | 18 | Hormat | 30 |
| 6 | Langkah Biasa | 38 | 19 | Hadap Kanan | 30 |
| 7 | Tiap-tiap Banjar Dua Kali Belok Kanan | 40 | 20 | Lencang Depan | 30 |
| 8 | Lari | 38 | 21 | Hitung | 30 |
| 9 | Dua Kali Belok Kanan (L) | 40 | 22 | Tiga Langkah Ke Belakang | 40 |
| 10 | Balik Kanan Lari Maju (L) | 40 | 23 | Hadap Serong Kanan Jalan Di Tempat | 30 |
| 11 | Balik Kanan Henti (L) | 40 | 24 | Balik Kanan Henti | 30 |
| 12 | Melintang Kanan | 50 | 25 | Bubar | 50 |
| 13 | Balik Kanan Maju | 40 | 26 | Bersaf Kumpul | 50 |

### 4.4 Komponen lain (nama dan maks)

- **Danton PBB:** Sikap Badan 16, Volume Suara 17, Artikulasi/Intonasi Suara 17, Penguasaan Materi 18, Penguasaan Pasukan 16, Penguasaan Lapangan 16.
- **Variasi:** Opening 55, Kualitas Gerakan 48, Ragam Gerak Statis & Dinamis 48, Unsur PBB 48, Konsep Tema/Kreativitas/Korelasi dengan Gerakan 50, Jelajah Lapangan 46, Nilai Etika & Estetika 50, Ending Variasi 55.
- **Formasi:** Buka (Proses Membuka 55, Keindahan Pola/Alur/Kualitas Gerakan 65); Bentuk (Detail Bentuk Akhir Formasi 60, Selebrasi Tema 100); Tutup (Proses Menutup 55, Keindahan Pola/Alur/Kualitas Gerakan 65); Tambahan (Unsur PBB 50, Konsep Tema & Kreativitas 50, Etika & Estetika Penampilan 50, Ending Celebration 50).
- **Danton Variasi & Formasi:** Aba-Aba Variasi 16, Aba-Aba Buka Formasi 16, Aba-Aba Tutup Formasi 16, Artikulasi & Intonasi 18, Penampilan & Penghayatan 18, Sinergi dengan Pasukan 16 (di lembar tertulis "Sinegritas").
- **Kostum (masing-masing 10):** Kreativitas/Keunikan, Body Fit, Variasi & Keserasian Topi, Kenyamanan & Keserasian Kostum, Perpaduan Warna, Peletakan Aksesoris Atribut/Non Atribut, Keserasian Pemilihan Aksesoris Terhadap Kostum, Kelayakan Aksesoris Atribut/Non Atribut, Kelayakan Kopel/Sabuk/Ikat Pinggang, Kepantasan/Kesopanan (Etika).

### 4.5 Cacat pada lembar LDWC (konfirmasi ke panitia, tidak menghalangi implementasi)

- Semua sheet berjudul "LEMBAR PENILAIAN VARIASI FORMASI", termasuk sheet PBB dan Kostum. Heading sheet KOSTUM hasil salin: "PENILAIAN DANTON SAAT VARIASI & FORMASI".
- Sheet VARFOR sel `A29` berisi angka `60` pada baris tempat heading "TUTUP FORMASI" seharusnya berada.
- Subtotal Danton Variasi dan Kostum tidak punya formula.
- Salah ketik: "Sinegritas", "Peletekan Aksesoris" (judul sheet PBB juga memakai "Aba-aba Peringatan" sebagai header kolom gerakan).

---

## 5. Perubahan database

Jalankan di Supabase SQL Editor **setelah mencadangkan data**. Nama constraint bisa berbeda; cek dulu dengan:

```sql
SELECT conname, conrelid::regclass FROM pg_constraint
WHERE conrelid IN ('users'::regclass, 'participants'::regclass, 'variasi_submissions'::regclass);
```

```sql
-- 5.1 Role juri keempat (Kostum). Nama role final menunggu pertanyaan 5 di §3; 'juri4' adalah usulan.
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check
  CHECK (role IN ('admin', 'juri1', 'juri2', 'juri3', 'juri4'));

-- 5.2 Event: template penilaian dan kategori usia
ALTER TABLE events
  ADD COLUMN IF NOT EXISTS scoring_template TEXT NOT NULL DEFAULT 'LDWC_2026',
  ADD COLUMN IF NOT EXISTS categories TEXT[] NOT NULL DEFAULT '{}';

-- 5.3 Peserta: kategori, penalti, voting
ALTER TABLE participants
  ADD COLUMN IF NOT EXISTS category TEXT,
  ADD COLUMN IF NOT EXISTS deduction_points NUMERIC NOT NULL DEFAULT 0 CHECK (deduction_points >= 0),
  ADD COLUMN IF NOT EXISTS vote_count INTEGER NOT NULL DEFAULT 0 CHECK (vote_count >= 0);

-- 5.4 Submission Kostum
CREATE TABLE IF NOT EXISTS kostum_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_id UUID NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  juri_role TEXT NOT NULL CHECK (juri_role IN ('juri4')),
  scores JSONB NOT NULL DEFAULT '[]',
  submitted BOOLEAN NOT NULL DEFAULT FALSE,
  submitted_at TIMESTAMPTZ,
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (participant_id, juri_role)
);
ALTER TABLE kostum_submissions ENABLE ROW LEVEL SECURITY;
-- Ikuti pola policy tabel lain agar konsisten. Policy terbuka bukan konfigurasi produksi (lihat §8).
CREATE POLICY "kostum_all" ON kostum_submissions FOR ALL USING (true);
```

Catatan desain:

- **Event yang sudah ada:** `DEFAULT 'LDWC_2026'` ikut berlaku untuk event lama. Jika di database masih ada event nyata berskala LOBB, isi `scoring_template = 'LEGACY'` dan jangan ubah datanya. Jika hanya data uji, kosongkan saja.
- **Nomor urut dan kategori:** unique `(event_id, nomor_urut)` di `participants` hanya benar jika U15 dan U19 berbagi satu urutan. Jika nomor urut dipisah per kategori, ganti menjadi `(event_id, category, nomor_urut)`.
- **Voting:** simpan `vote_count` mentah. Hitung bagian suara saat kalkulasi, jangan simpan pecahan statis. Dipakai hanya jika aturan panitia memuat voting.
- **Pemisahan Danton Variasi** tanpa migrasi: tetap satu array `scores`; `itemId` 1-18 = Variasi Formasi, 19-24 = Danton Variasi (§4.1).
- **Bug upsert Variasi:** kode memakai `onConflict: 'participant_id'`, padahal unique key schema `(participant_id, juri_role)`. Ubah menjadi `'participant_id,juri_role'` dan buat `getVariasiSubmission` memfilter `juri_role`.

---

## 6. Instruksi implementasi (urutan wajib)

Aturan untuk semua fase (termasuk untuk agent seperti Copilot):

- **Jangan mengisi bobot LDWC.** `points` tetap `null` sampai §3 dijawab.
- **Jangan menulis ulang nilai rubrik dengan tangan.** Impor dari `ldwc2026-rubric.json` atau hasil generate-nya.
- Pertahankan API publik komponen dan tipe yang ada kecuali disebut di bawah. Jangan menambah service-role key atau secret ke frontend.
- Setiap fase ditutup dengan `pnpm run build` tanpa error dan, mulai F1, `pnpm test` hijau.

### F0. Persiapan

1. Salin `ldwc2026-rubric.json` ke `src/app/data/ldwc2026/rubric.json` dan `lobb2026-fixture.json` ke `src/app/lib/__tests__/fixtures/lobb2026.json`.
2. Pasang Vitest: `pnpm add -D vitest`, lalu tambah script `"test": "vitest run"` di `package.json`.
3. Cadangkan database (export tabel) sebelum migrasi F2.

**Selesai jika:** `pnpm run build` dan `pnpm test` (tanpa test dulu) berjalan.

### F1. Mesin hitung murni (`src/app/lib/scoring.ts`)

Buat modul tanpa akses Supabase dan tanpa React. Kerangka:

```ts
export type JuriRole = 'juri1' | 'juri2' | 'juri3' | 'juri4';
export interface ScoreEntry { itemId: number; value: number }

export interface ComponentConfig {
  key: string;                 // mis. 'pbb', 'danpas'
  label: string;
  sources: SourceKey[];        // bisa gabungan, mis. ['dantonPbb', 'dantonVarfor']
  max: number;                 // dari rubrik: 1000 / 100 / 200 / 1 ...
  points: number | null;       // null = belum ditentukan panitia
}
export type SourceKey = 'pbb' | 'dantonPbb' | 'variasiFormasi' | 'dantonVarfor' | 'kostum' | 'voting';

export interface RankingConfig {
  key: string;
  label: string;
  components: ComponentConfig[];
  useDeduction: boolean;
  rankByCategory: boolean;
}

export const isConfigured = (cfg: RankingConfig) =>
  cfg.components.every(c => c.points !== null);

/** Menjumlahkan nilai item pada rentang itemId tertentu. */
export const sumItems = (scores: ScoreEntry[], ids: number[]) =>
  scores.filter(s => ids.includes(s.itemId)).reduce((a, s) => a + s.value, 0);

/** Rata-rata total dari beberapa submission juri (null jika ada juri yang belum submit). */
export function averageTotals(totals: Array<number | null>): number | null {
  if (totals.length === 0 || totals.some(t => t === null)) return null;
  return (totals as number[]).reduce((a, b) => a + b, 0) / totals.length;
}

/** Menggabungkan nilai mentah menjadi nilai akhir. Murni dan mudah diuji. */
export function combine(
  cfg: RankingConfig,
  raw: Record<string, number>,
  deduction = 0,
): number | null {
  if (!isConfigured(cfg)) return null;
  const sum = cfg.components.reduce(
    (acc, c) => acc + (raw[c.key] / c.max) * (c.points as number), 0);
  return sum - (cfg.useDeduction ? deduction : 0);
}
```

Tambahkan juga:

- `computeRaw(participantId, data)` yang mengembalikan nilai mentah per komponen (`pbb`, `dantonPbb`, `variasiFormasi` = `sumItems(scores, 1..18)`, `dantonVarfor` = `sumItems(scores, 19..24)`, `kostum`, `voteShare`, `deduction`) dan `complete: boolean`.
- Aturan juri: komponen yang dinilai dua juri (PBB, Danton PBB) memakai `averageTotals`. Nilai akhir **hanya dihitung jika semua juri yang ditetapkan sudah submit**; jika belum, `complete = false` dan UI menampilkan "Belum Lengkap". (Perilaku lama, memakai rata-rata dari juri yang sudah submit, menghasilkan nilai sementara yang menyesatkan.)
- Jumlah juri per komponen dibaca dari konfigurasi, bukan di-hardcode (menunggu pertanyaan 5 di §3).
- `voteShare = vote_count_regu / Σ vote_count (event atau kategori yang sama)`, 0 jika total suara 0.

Konfigurasi:

```ts
// src/app/data/ldwc2026/ranking.ts — bobot sengaja null
export const LDWC_2026_RANKINGS: RankingConfig[] = [
  {
    key: 'ldwc-nilai-akhir', label: 'Nilai Akhir LDWC (belum ditentukan)',
    useDeduction: false, rankByCategory: false,
    components: [
      { key: 'pbb',          label: 'PBB',                 sources: ['pbb'],          max: 1000, points: null },
      { key: 'variasi',      label: 'Variasi',             sources: ['variasi'],      max: 400,  points: null },
      { key: 'formasi',      label: 'Formasi',             sources: ['formasi'],      max: 600,  points: null },
      { key: 'dantonPbb',    label: 'Danton PBB',          sources: ['dantonPbb'],    max: 100,  points: null },
      { key: 'dantonVarfor', label: 'Danton Variasi',      sources: ['dantonVarfor'], max: 100,  points: null },
      { key: 'kostum',       label: 'Kostum',              sources: ['kostum'],       max: 100,  points: null },
    ],
  },
];
```

(`SourceKey` perlu menyertakan `'variasi'` dan `'formasi'` bila Variasi dan Formasi dibobot terpisah; jika panitia menetapkan satu komponen "Variasi Formasi" /1000, ganti dengan satu komponen `variasiFormasi`.)

Konfigurasi LOBB **hanya untuk tes** (`src/app/lib/__tests__/lobbTestConfig.ts`, jangan diimpor dari UI):

```ts
export const LOBB_UMUM: RankingConfig = {
  key: 'lobb-umum', label: 'LOBB Juara Umum (TES)', useDeduction: true, rankByCategory: false,
  components: [
    { key: 'pbb',            label: 'PBB',            sources: ['pbb'],                          max: 1000, points: 600 },
    { key: 'variasiFormasi', label: 'Variasi Formasi', sources: ['variasiFormasi'],               max: 1000, points: 300 },
    { key: 'danpas',         label: 'Danpas',         sources: ['dantonPbb', 'dantonVarfor'],     max: 200,  points: 50 },
    { key: 'voting',         label: 'Voting',         sources: ['voting'],                        max: 1,    points: 50 },
  ],
};
export const LOBB_UTAMA: RankingConfig = {
  key: 'lobb-utama', label: 'LOBB Juara Utama (TES)', useDeduction: true, rankByCategory: false,
  components: [
    { key: 'pbb',          label: 'PBB',        sources: ['pbb'],            max: 1000, points: 650 },
    { key: 'variasiFormasi', label: 'Variasi Formasi', sources: ['variasiFormasi'], max: 1000, points: 250 },
    { key: 'dantonPbb',    label: 'Danpas PBB', sources: ['dantonPbb'],      max: 100,  points: 50 },
    { key: 'dantonVarfor', label: 'Danpas Variasi', sources: ['dantonVarfor'], max: 100, points: 50 },
  ],
};
```

Tes (`scoring.test.ts`):

```ts
import fixture from './fixtures/lobb2026.json';
import { combine } from '../scoring';
import { LOBB_UMUM, LOBB_UTAMA } from './lobbTestConfig';

describe('mesin hitung (fixture LOBB)', () => {
  it.each(fixture.regu)('regu $nomorUrut $nama', ({ raw, expected }) => {
    const umum = combine(LOBB_UMUM, {
      pbb: raw.pbb, variasiFormasi: raw.variasiFormasi,
      danpas: raw.danpasPbb + raw.danpasVarfor, voting: raw.voting,
    }, raw.pengurangan);
    const utama = combine(LOBB_UTAMA, {
      pbb: raw.pbb, variasiFormasi: raw.variasiFormasi,
      dantonPbb: raw.danpasPbb, dantonVarfor: raw.danpasVarfor,
    }, raw.pengurangan);
    expect(umum).toBeCloseTo(expected.juaraUmum, 2);
    expect(utama).toBeCloseTo(expected.juaraUtama, 2);
  });
});
```

Tambahkan tes rubrik: total `pbb=1000`, `dantonPbb=100`, `variasi=400`, `formasi=600`, `dantonVarfor=100`, `kostum=100`; setiap item punya `levels.SB === max`; item 19-21 punya tepat 3 level, lainnya 9 level.

**Selesai jika:** semua tes hijau. Tiga regu yang kena penalti harus lolos: nomor 4 (SMPN 33 Banjarmasin: 45.01 dan 88.925), nomor 8 (3.85 dan 41.4), nomor 13 (139.275 dan 170.775).

### F2. Migrasi database

Jalankan SQL §5.1-5.4 dan perbaiki `onConflict` Variasi (§5, catatan terakhir). Perbarui `supabase-schema.sql` di repository agar sama dengan hasil migrasi.

**Selesai jika:** tabel dan kolom baru ada, dan satu peserta dapat menyimpan draf Variasi dua kali tanpa duplikat baris.

### F3. Data rubrik dan tipe

1. Ganti isi `src/app/data/pbbData.ts` dan `variasiData.ts` agar dibangkitkan dari `rubric.json`: `PBB_ITEMS` (26), `DANTON_ITEMS` (6), `VARIASI_ITEMS` dengan `itemId` 1-24 (Variasi 1-8, Formasi 9-18, Danton Variasi 19-24), dan `KOSTUM_ITEMS` (10).
2. Hapus `MAX_VARIASI_SCORE = 1100`. Ganti dengan `MAX_VARIASI_FORMASI = 1000` dan `MAX_DANTON_VARFOR = 100`, masing-masing dihitung dari rubrik.
3. `activeMovementIds`: tetap boleh menentukan gerakan PBB yang tampil di form juri, **tetapi tidak dipakai sebagai pembagi nilai akhir**. Hapus fallback `1000` di `ResultsTab`.
4. Perbarui `src/app/types.ts`: `deductionPoints`, `voteCount`, `category` pada `Participant`; `scoringTemplate`, `categories` pada `Event`; `KostumSubmission`; tipe `RankingConfig` dan hasilnya.
5. Perbarui `ScoreRow` agar merender hanya level yang tersedia pada item (3 atau 9 level).

**Selesai jika:** halaman PBB dan Variasi menampilkan item LDWC dengan nilai sesuai JSON, dan total maksimum yang tampil di halaman Variasi tidak lagi 1100.

### F4. Context dan alur data (`src/app/context/AppContext.tsx`)

1. Mapping kolom baru (`category`, `deduction_points`, `vote_count`, `scoring_template`, `categories`) snake_case ke camelCase.
2. State, load, draf, submit, dan reset untuk `kostum_submissions` (ikuti pola Variasi).
3. Fungsi admin untuk mengubah `deduction_points` dan `vote_count` peserta.
4. Perbaiki `onConflict` Variasi (F2) dan buat pembacaan Variasi memfilter `participantId` + `juriRole`.
5. Setelah setiap submit atau reset, muat ulang data terkait.

**Selesai jika:** admin dapat menyimpan penalti dan voting, dan juri dapat menyimpan lalu submit Kostum tanpa memengaruhi submission lain.

### F5. UI

| File | Perubahan |
|---|---|
| `src/app/components/admin/AdminDashboard.tsx` (`ResultsTab`) | Hapus seluruh perhitungan persen dan rata-rata `/3`. Pakai `computeRaw` dan `combine`. Tampilkan status per komponen (Belum/Draf/Submit) dan subtotal mentah. Jika `isConfigured(cfg)` false, tampilkan "Bobot nilai akhir LDWC belum dikonfigurasi" dan **jangan** menampilkan ranking. Jika true, tampilkan ranking, dipisah per kategori jika `rankByCategory` |
| Form peserta admin | Tambah pemilih kategori (U15/U19) dari `events.categories` |
| Panel admin (baru) | Input penalti (angka poin) dan voting (jumlah suara) per regu, hanya bila ranking aktif memakainya |
| `src/app/components/juri/KostumScoringPage.tsx` (baru) | 10 item, pola sama dengan `VariasiScoringPage.tsx`; draf, submit, read-only setelah submit |
| `src/app/App.tsx` dan dashboard juri | View `kostum` dan routing role `juri4` |
| Form pembuatan akun admin | Tambah role `juri4` ("Juri Kostum") |

**Selesai jika:** dengan bobot `null`, ResultsTab menampilkan pesan dan subtotal tanpa ranking; dengan bobot uji sementara di lokal, ranking muncul dan urutannya masuk akal.

### F6. Verifikasi menyeluruh

1. Buat satu event uji dengan 2 regu, isi PBB (juri1 dan juri2), Variasi/Formasi/Danton Variasi (juri3), dan Kostum (juri4). Pastikan tiap subtotal sama dengan penjumlahan manual dan tidak ada nilai di luar level rubrik.
2. Pastikan satu juri yang belum submit membuat komponen terkait berstatus "Belum Lengkap".
3. Pastikan nilai maksimum yang tampil: PBB 1000, Variasi 400, Formasi 600, Danton PBB 100, Danton Variasi 100, Kostum 100.
4. `pnpm test` dan `pnpm run build` hijau.

### F7. Setelah bobot LDWC tersedia

1. Isi `points` di `LDWC_2026_RANKINGS` (dan `useDeduction`, `rankByCategory`, komponen voting bila ada). Tidak ada perubahan lain di kode.
2. Tambahkan fixture LDWC dari rekap resmi (jika ada), dan tes baru yang membandingkan hasil mesin dengan rekap itu.
3. Isi daftar kategori "Terbaik" (jika dipakai) sebagai ranking nilai mentah per komponen.

### F8. Dokumentasi

Revisi `SCORING.md`, `DATABASE.md`, `ARCHITECTURE.md`, `USER-FLOWS.md`, `README.md`, dan `init.md` agar sesuai: rumus baru, tabel Kostum, role `juri4`, kategori usia, penalti dan voting. Hapus pernyataan "rata-rata `/3`", "24 item Variasi = 1100", dan "script test tidak ada".

---

## 7. Risiko dan hal yang perlu dijaga

- **Pembulatan:** nilai di PDF resmi dibulatkan dua desimal, jadi bandingkan hasil hitung dengan toleransi 0.01, bukan kesamaan persis.
- **Ranking sementara menyesatkan:** nilai akhir hanya dihitung bila semua juri yang ditetapkan sudah submit.
- **Komponen terpisah vs digabung:** keputusan Variasi dan Formasi (pertanyaan 2) mengubah konfigurasi, bukan mesin hitung.
- **Data lama:** jangan ubah submission event nyata berskala LOBB; beri `scoring_template = 'LEGACY'`.

## 8. Keamanan (tidak berubah, perlu diingat)

Autentikasi masih membandingkan password sebagai teks biasa, user aktif disimpan di `localStorage`, dan RLS `USING (true)` mengizinkan semua operasi. Dengan penalti dan voting, siapa pun yang memegang anon key bisa mengubah nilai akhir. Untuk penyelenggaraan nyata: hash password, ganti ke Supabase Auth, dan batasi tulis penalti/voting ke role admin lewat RLS.

## 9. Referensi

- `Lembar_Penilaian_LDWC.xlsx` (sheet `PBB U15 & U-19`, `VARFOR`, `KOSTUM`), sumber rubrik.
- `Lembar_Penilaian_LOBB_ANASHERA_PART_III_2026.xlsx` (sheet `Nomor Urut 1`-`20`, `Rekap Akhir`), sumber formula pembobotan dan fixture uji.
- `Pemenang_LOBB_ANASHERA_PART_III_2026_Tingkat_SMP_Sederajat.pdf` dan `..._Tingkat_SMA_Sederajat.pdf`, hasil resmi untuk validasi silang.
- `docs/SCORING.md`, `docs/ARCHITECTURE.md`, `docs/DATABASE.md`, `docs/USER-FLOWS.md`, `init.md`, `README.md` (dokumentasi lama, direvisi di F8).
