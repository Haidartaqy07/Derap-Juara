# Catatan Implementasi: Perbaikan Rumus Penilaian SIMPASKIB

Versi: **2** (menambahkan temuan dari lembar penilaian LDWC 2026)
Status: **Siap diimplementasikan, kecuali bobot final LDWC (lihat §9 Pertanyaan terbuka)**

Sumber temuan:

- `docs/SCORING.md`, `docs/ARCHITECTURE.md`, `docs/DATABASE.md` — rumus dan struktur yang ada di aplikasi saat ini.
- `Lembar_Penilaian_LOBB_ANASHERA_PART_III_2026.xlsx` — formula asli panitia LOBB (dibaca dari cell formula, bukan tebakan), dicocokkan 1:1 dengan PDF Pemenang LOBB (SMP & SMA sederajat).
- `Lembar_Penilaian_LDWC.xlsx` — lembar penilaian kosong Laskar Dwi Warna Competition 2026 "Keagungan Nusantara" (sheet `PBB U15 & U-19`, `VARFOR`, `KOSTUM`). Tidak berisi data regu, rekap, maupun bobot akhir.

---

## 1. Ringkasan masalah

Rumus nilai akhir yang saat ini ada di SIMPASKIB **bukan** rumus yang dipakai panitia. Inilah penyebab hasil di aplikasi tidak sama dengan hasil resmi.

| Aspek | Di aplikasi (saat ini) | Rumus asli panitia (LOBB) |
|---|---|---|
| Cara gabung komponen | Rata-rata sama rata: `(NilaiPBB% + NilaiDanton% + NilaiVariasi%) / 3` | Bobot tidak sama rata, ada **dua** rumus akhir (Juara Utama & Juara Umum) |
| Normalisasi | PBB & Danton dinormalisasi ke `raw / max × 100` memakai "maksimum gerakan aktif event" | Tidak memakai max event. Bobot dikalikan ke nilai mentah, karena skala komponen sudah tetap (1000 / 100) |
| Cakupan 24 item Variasi | Semua 24 item dijumlah jadi satu "Nilai Variasi" (`MAX_VARIASI_SCORE = 1100`) | Hanya **18 item** yang jadi "Variasi Formasi" (maks 1000). 6 item Danton dipisah ke **Danpas** (maks 100) |
| Danton / Danpas | Hanya Danton dari submission PBB, sebagai 1 dari 3 komponen | Ada **dua** Danpas (saat PBB dan saat Variasi & Formasi), dipisah atau digabung tergantung jenis juara |
| Voting penonton | Tidak ada di skema/kode | Ada, bobot 5%, hanya di Juara Umum |
| Pengurangan (penalti) | Tidak ada angka (hanya `notes` teks) | Ada, dikurangkan langsung dari total akhir |
| Output | Satu "Nilai Akhir" | Dua ranking resmi + tiga kategori "Terbaik" dari nilai mentah |

Angka `1100` di `SCORING.md` adalah 1000 (Variasi Formasi) + 100 (Danton Variasi). Template LDWC memperkuat ini: Variasi (400) + Formasi (600) = 1000, dan Danton Variasi (100) berdiri sendiri.

---

## 2. Rumus LOBB (sudah divalidasi)

### 2.1 Komponen mentah (raw)

```
PBB_raw            = rata-rata(TotalJuri1, TotalJuri2) dari 26 item PBB              (maks 1000)
VariasiFormasi_raw = SUM 18 item (Opening, 7 Isi Variasi, 2 Buka, 2 Bentuk,
                     2 Tutup, 4 Tambahan Formasi), 1 juri (juri3)                    (maks 1000)
DanpasPBB_raw      = rata-rata(TotalJuri1, TotalJuri2) dari 6 item Danton saat PBB   (maks 100)
DanpasVarFor_raw   = SUM 6 item "Penilaian Danton saat Variasi & Formasi", 1 juri    (maks 100)
Voting_raw         = proporsi suara pasukan terfavorit, pecahan 0-1                  (input baru)
Pengurangan_raw    = total poin penalti per regu                                     (input baru)
```

### 2.2 Juara Utama

```
NilaiUtama = PBB_raw × 0.65
           + VariasiFormasi_raw × 0.25
           + DanpasPBB_raw / 2          // = DanpasPBB_raw / 100 × 50
           + DanpasVarFor_raw / 2       // = DanpasVarFor_raw / 100 × 50
           − Pengurangan_raw
```

### 2.3 Juara Umum

```
NilaiUmum = PBB_raw × 0.60
          + VariasiFormasi_raw × 0.30
          + (DanpasPBB_raw + DanpasVarFor_raw) / 4    // gabungan, = total / 200 × 50
          + Voting_raw × 50
          − Pengurangan_raw
```

### 2.4 Kategori "Terbaik" (ranking nilai mentah, tanpa bobot)

- PBB Terbaik: `PBB_raw`
- Variasi & Formasi Terbaik: `VariasiFormasi_raw`
- Danpas Terbaik: `DanpasPBB_raw + DanpasVarFor_raw`

### 2.5 Contoh validasi (SMPN 3 Banjarbaru, nomor urut 1)

```
PBB_raw=710.5  VariasiFormasi_raw=535  DanpasPBB_raw=72  DanpasVarFor_raw=78  Voting_raw=0.0046  Pengurangan=0

NilaiUmum  = 426.3 + 160.5 + 37.5 + 0.23 = 624.53    (cocok dengan PDF)
NilaiUtama = 461.825 + 133.75 + 36 + 39  = 670.575   (PDF: 670,58)
```

Kasus penalti (SMPN 33 Banjarmasin, Pengurangan = 500): nilai akhir turun menjadi 45.01 (Umum) dan 88.925 (Utama).

---

## 3. Temuan baru dari lembar LDWC

### 3.1 Struktur dan nilai maksimum (dihitung dari cell)

| Komponen | Item | Maks | Sheet |
|---|---|---|---|
| PBB (per juri) | 26 | 1000 | `PBB U15 & U-19` |
| Danton saat PBB | 6 | 100 | `PBB U15 & U-19` |
| Variasi (Opening + 7 Isi + Ending) | 8 | 400 (`M21`) | `VARFOR` |
| Formasi (Buka + Bentuk + Tutup + Tambahan) | 10 | 600 (`M36`) | `VARFOR` |
| Variasi Formasi total | 18 | 1000 | `VARFOR` |
| Danton saat Variasi & Formasi | 6 | 100 | `VARFOR` |
| **Kostum** (komponen baru) | 10 | 100 | `KOSTUM` |

Skala komponen konsisten dengan LOBB (1000 / 1000 / 100 / 100). Artinya prinsip "nilai mentah dibagi max tetap dari lembar, lalu dikali bobot poin" berlaku untuk kedua event.

### 3.2 Hal yang belum ada di aplikasi

1. **Komponen Kostum**: perlu form penilaian, tabel submission, dan role juri baru.
2. **Kategori usia** (U15 dan U19): `events` dan `participants` belum punya kolom kategori.
3. **Rubrik per event**: item, nama, dan skala nilai LDWC berbeda dari LOBB, jadi tidak boleh menimpa `pbbData.ts` / `variasiData.ts` yang ada.
4. **Skala 3 level pada Danton Variasi item 1-3**: LDWC memakai `[0, 1, 16]`, sedangkan aplikasi (item 19-21) memakai `[0, 2, 16]`. Nilai "MINIMAL" berbeda (1 vs 2) dan harus dicocokkan.

### 3.3 Cacat pada template LDWC (perlu dikonfirmasi ke panitia)

- Semua sheet berjudul "LEMBAR PENILAIAN VARIASI FORMASI", termasuk sheet PBB dan Kostum.
- Heading sheet KOSTUM hasil salin: "PENILAIAN DANTON SAAT VARIASI & FORMASI".
- Angka nyasar `A29 = 60` di sheet `VARFOR` (tidak masuk formula mana pun).
- Subtotal Danton Variasi dan Kostum tidak punya formula.
- Salah ketik "Sinegritas Dengan Pasukan" (seharusnya "Sinergi").

---

## 4. Model umum berbasis konfigurasi

Karena event punya struktur komponen berbeda, jangan hardcode rumus per event. Gunakan satu fungsi agregasi dengan konfigurasi per event.

### 4.1 Rumus umum

```
Total skala event          = 1000 poin
bobot_poin_k               = bobot_k × 1000

kontribusi_k = raw_k / max_k × bobot_poin_k

NilaiAkhir(ranking) = Σ kontribusi_k  −  Pengurangan_raw
```

`max_k` diambil dari lembar penilaian (1000 / 1000 / 100 / 100 / 100), **bukan** dari jumlah gerakan aktif event. Untuk komponen bermaks 1000, rumus ini identik dengan `raw × bobot` (contoh: `PBB_raw / 1000 × 650 = PBB_raw × 0.65`).

### 4.2 Contoh konfigurasi (LOBB Juara Utama)

```ts
export const LOBB_2026_UTAMA: RankingConfig = {
  key: 'juara-utama',
  components: [
    { key: 'pbb',          source: 'pbb',          judges: ['juri1', 'juri2'], aggregate: 'avg', max: 1000, points: 650 },
    { key: 'varfor',       source: 'variasiFormasi', judges: ['juri3'],        aggregate: 'sum', max: 1000, points: 250 },
    { key: 'danpasPbb',    source: 'dantonPbb',    judges: ['juri1', 'juri2'], aggregate: 'avg', max: 100,  points: 50 },
    { key: 'danpasVarfor', source: 'dantonVarfor', judges: ['juri3'],          aggregate: 'sum', max: 100,  points: 50 },
  ],
  deduction: true,
};
```

Juara Umum LOBB memakai komponen gabungan: `danpas = dantonPbb + dantonVarfor` dengan `max: 200, points: 50`, ditambah `voting` dengan `max: 1, points: 50`.

### 4.3 Konfigurasi LDWC

Susunan komponen LDWC sudah jelas (PBB, Variasi Formasi, Danton PBB, Danton Variasi, Kostum), tetapi **bobot poin tiap komponen belum diketahui** (lihat §9). Jangan mengisi dengan bobot LOBB.

```ts
export const LDWC_2026_UMUM: RankingConfig = {
  key: 'umum',
  components: [
    { key: 'pbb',          source: 'pbb',            max: 1000, points: /* TBD */ 0 },
    { key: 'varfor',       source: 'variasiFormasi', max: 1000, points: /* TBD */ 0 },
    { key: 'danpasPbb',    source: 'dantonPbb',      max: 100,  points: /* TBD */ 0 },
    { key: 'danpasVarfor', source: 'dantonVarfor',   max: 100,  points: /* TBD */ 0 },
    { key: 'kostum',       source: 'kostum',         max: 100,  points: /* TBD */ 0 },
  ],
};
```

---

## 5. Data rubrik LDWC (untuk file data baru)

Simpan sebagai file data terpisah per event, mis. `src/app/data/ldwc2026/`, dan jangan menimpa data LOBB.

### 5.1 Pola skala nilai

Level: `KOSONG, MINIMAL, K1, K2, C1, C2, B1, B2, SB` (9 level). Nilai diturunkan dari maksimum `M`:

| Rubrik | Rumus 9 nilai |
|---|---|
| PBB (item bermaks M) | `[0, M-27, M-21, M-18, M-14, M-11, M-7, M-4, M]` |
| Variasi & Formasi (maks M) | `[0, M-35, M-30, M-25, M-20, M-15, M-10, M-5, M]` |
| Danton PBB item 1, 5, 6 (maks 16) | `[0, 1, 3, 5, 7, 9, 11, 13, 16]` |
| Danton PBB item 2, 3 (maks 17) | `[0, 1, 4, 6, 8, 10, 12, 14, 17]` |
| Danton PBB item 4 (maks 18) | `[0, 2, 5, 7, 9, 11, 13, 15, 18]` |
| Danton Variasi item 4, 5 (maks 18) | `[0, 2, 5, 7, 9, 11, 13, 15, 18]` |
| Danton Variasi item 6 (maks 16) | `[0, 1, 3, 5, 7, 9, 11, 13, 16]` |
| Danton Variasi item 1-3 (maks 16) | `[0, 1, 16]` (3 level) |
| Kostum (semua item, maks 10) | `[0, 2, 3, 4, 6, 7, 8, 9, 10]` |

Contoh: PBB maks 38 menghasilkan `[0, 11, 17, 20, 24, 27, 31, 34, 38]`.

### 5.2 PBB (26 item, maks per item)

| No | Item | Maks | No | Item | Maks |
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

Total = 1000.

### 5.3 Danton saat PBB (6 item, total 100)

Sikap Badan 16, Volume Suara 17, Artikulasi/Intonasi Suara 17, Penguasaan Materi 18, Penguasaan Pasukan 16, Penguasaan Lapangan 16.

### 5.4 Variasi (8 item, total 400)

Opening 55, Kualitas Gerakan 48, Ragam Gerak Statis & Dinamis 48, Unsur PBB 48, Konsep Tema Kreativitas & Korelasi dengan Gerakan 50, Jelajah Lapangan 46, Nilai Etika & Estetika 50, Ending Variasi 55.

### 5.5 Formasi (10 item, total 600)

Proses Membuka 55, Keindahan Pola/Alur/Kualitas Gerakan (buka) 65, Detail Bentuk Akhir Formasi 60, Selebrasi Tema 100, Proses Menutup 55, Keindahan Pola/Alur/Kualitas Gerakan (tutup) 65, Unsur PBB 50, Konsep Tema & Kreativitas 50, Etika & Estetika Penampilan 50, Ending Celebration 50.

### 5.6 Danton saat Variasi & Formasi (6 item, total 100)

Aba-Aba Variasi 16, Aba-Aba Buka Formasi 16, Aba-Aba Tutup Formasi 16, Artikulasi & Intonasi 18, Penampilan & Penghayatan 18, Sinergi dengan Pasukan 16.

### 5.7 Kostum (10 item, masing-masing maks 10, total 100)

Kreativitas/Keunikan, Body Fit, Variasi & Keserasian Topi, Kenyamanan & Keserasian Kostum, Perpaduan Warna, Peletakan Aksesoris Atribut/Non Atribut, Keserasian Pemilihan Aksesoris Terhadap Kostum, Kelayakan Aksesoris Atribut/Non Atribut, Kelayakan Kopel/Sabuk/Ikat Pinggang, Kepantasan/Kesopanan (Etika).

---

## 6. Perubahan skema database

Referensi: `docs/DATABASE.md`, `supabase-schema.sql`. Verifikasi nama constraint yang sebenarnya di Supabase sebelum menjalankan `DROP CONSTRAINT`.

```sql
-- 6.1 Role juri baru untuk Kostum (nama role final perlu dikonfirmasi, §9)
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check
  CHECK (role IN ('admin', 'juri1', 'juri2', 'juri3', 'juri4'));

-- 6.2 Event: template penilaian dan daftar kategori usia
ALTER TABLE events
  ADD COLUMN IF NOT EXISTS scoring_template TEXT NOT NULL DEFAULT 'LOBB_2026',
  ADD COLUMN IF NOT EXISTS categories TEXT[] NOT NULL DEFAULT '{}';

-- 6.3 Peserta: kategori, penalti, voting
ALTER TABLE participants
  ADD COLUMN IF NOT EXISTS category TEXT,
  ADD COLUMN IF NOT EXISTS deduction_points NUMERIC NOT NULL DEFAULT 0 CHECK (deduction_points >= 0),
  ADD COLUMN IF NOT EXISTS vote_count INTEGER NOT NULL DEFAULT 0 CHECK (vote_count >= 0);

-- 6.4 Submission Kostum
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
```

Catatan:

- **Kategori dan nomor urut**: unique `(event_id, nomor_urut)` di `participants` hanya benar jika nomor urut U15 dan U19 berbagi satu urutan. Jika dipisah, ubah menjadi `(event_id, category, nomor_urut)`.
- **Voting**: simpan `vote_count` mentah. Hitung `Voting_raw = vote_count / total vote_count regu lain di event/kategori yang sama` saat kalkulasi, bukan menyimpan pecahan statis. Kolom ini hanya dipakai jika ranking event membutuhkan voting.
- **Pemisahan item Danton Variasi** (`variasi_submissions.scores`): pilihan minimal tanpa migrasi data adalah tetap satu array `ScoreEntry[]` dan menentukan kelompok lewat `itemId`. Item 1-18 masuk Variasi Formasi, item 19-24 masuk Danton Variasi. Agregasi memisahkan jumlahnya berdasarkan kelompok ini.
- **Bug upsert yang sudah diketahui**: `saveVariasiDraft` dan `submitVariasiScores` memakai `onConflict: 'participant_id'`, sedangkan unique key schema adalah `(participant_id, juri_role)`. Ubah menjadi `onConflict: 'participant_id,juri_role'`, dan ubah `getVariasiSubmission` agar ikut memfilter `juri_role`.
- **RLS**: policy `USING (true)` membuat penalti dan voting bisa diubah siapa saja yang memegang anon key. Untuk penyelenggaraan nyata, batasi tulis ke role admin sebelum dipakai.

---

## 7. Perubahan kode

| File | Perubahan |
|---|---|
| `src/app/lib/scoring.ts` (baru) | Fungsi murni: `aggregateComponent`, `computeRanking(config, participantData)`, `computeBestCategories`. Tanpa akses Supabase, supaya bisa diuji |
| `src/app/data/` | Pisahkan rubrik per template (`lobb2026/`, `ldwc2026/`). `variasiData.ts` menandai item 19-24 sebagai grup `danton` |
| `src/app/types.ts` | Tambah `deductionPoints`, `voteCount`, `category` pada `Participant`; `scoringTemplate`, `categories` pada `Event`; tipe `RankingConfig`, `ComponentConfig`, `KostumSubmission`, `FinalResult` |
| `src/app/context/AppContext.tsx` | Mapping kolom baru; CRUD dan draft/submit/reset untuk `kostum_submissions`; fungsi update `deduction_points` dan `vote_count`; perbaiki `onConflict` Variasi |
| `src/app/components/admin/AdminDashboard.tsx` (`ResultsTab`) | Hapus normalisasi `/max × 100` dan rata-rata `/3`. Hitung ranking dari `computeRanking` memakai konfigurasi template event. Tampilkan ranking per konfigurasi dan per kategori usia. Tampilkan kategori "Terbaik" |
| `src/app/components/admin/` (form baru) | Input penalti dan voting per regu; pemilih kategori usia di form peserta |
| `src/app/components/juri/KostumScoringPage.tsx` (baru) | Form 10 item dengan pola yang sama seperti `VariasiScoringPage.tsx` |
| `src/app/App.tsx` dan dashboard juri | View `kostum` dan routing role `juri4` |

Hapus ketergantungan skor akhir pada "maksimum PBB event". `activeMovementIds` boleh tetap dipakai hanya untuk menentukan gerakan yang tampil di form juri. Fallback `1000` di `ResultsTab` diganti nilai `max` dari konfigurasi.

---

## 8. Rencana pengujian

`package.json` belum punya script test. Tambahkan Vitest (`pnpm add -D vitest` dan script `"test": "vitest run"`) agar `scoring.ts` bisa diuji.

1. **Fixture LOBB**: pakai data nomor urut 1-7 dari file Excel LOBB. Harapan: `NilaiUtama` dan `NilaiUmum` sama dengan kolom "Nilai Keseluruhan" (toleransi 2 desimal).
2. **Regresi 20 regu SMP**: urutan Juara Utama dan Juara Umum harus sama dengan sheet `Rekap Akhir` dan PDF resmi.
3. **Kasus penalti**: SMPN 33 Banjarmasin (pengurangan 500) harus menghasilkan 45.01 (Umum) dan 88.925 (Utama).
4. **Komponen belum lengkap**: nilai akhir tidak dihitung sampai semua komponen di konfigurasi punya submission yang sudah submit. UI menampilkan "Belum Lengkap".
5. **Skala rubrik LDWC**: tes bahwa maksimum tiap rubrik sesuai §3.1 (1000, 100, 400, 600, 100, 100) dan semua item memiliki 9 level (3 level untuk Danton Variasi item 1-3).
6. **LDWC end-to-end**: ditunda sampai bobot final dan data uji tersedia.

---

## 9. Pertanyaan terbuka (perlu juknis / sheet rekap LDWC)

1. Bobot tiap komponen LDWC dan daftar ranking resmi (Juara Utama, Umum, atau lainnya).
2. Apakah Kostum masuk nilai akhir atau hanya penghargaan terpisah ("Kostum Terbaik").
3. Jumlah juri per sheet: PBB 2 juri seperti LOBB? Kostum berapa juri? Nama role juri keempat (`juri4` hanyalah usulan).
4. Apakah LDWC memakai Pengurangan dan Voting.
5. Apakah U15 dan U19 dirangking terpisah, dan apakah nomor urut dipisah per kategori.
6. Koreksi template: judul sheet, heading sheet KOSTUM, nilai `A29`, dan nilai "MINIMAL" Danton Variasi item 1-3 (1 atau 2).

---

## 10. Urutan implementasi yang disarankan

1. Buat `scoring.ts` dan tes-nya dengan fixture LOBB (belum menyentuh UI atau DB).
2. Migrasi DB §6.1-6.3 dan perbaikan `onConflict` Variasi.
3. Ganti `ResultsTab` agar memakai `computeRanking` untuk LOBB, lalu cocokkan dengan PDF resmi.
4. Tambah input penalti dan voting.
5. Tambah rubrik LDWC, kategori usia, dan form Kostum (migrasi §6.4).
6. Isi bobot LDWC setelah §9 terjawab, lalu uji end-to-end.
7. Revisi `SCORING.md`, `DATABASE.md`, dan `ARCHITECTURE.md` agar sesuai perubahan.

---

## 11. Referensi

- `docs/SCORING.md`, `docs/ARCHITECTURE.md`, `docs/DATABASE.md` (dokumentasi lama, perlu direvisi setelah implementasi)
- `Lembar_Penilaian_LOBB_ANASHERA_PART_III_2026.xlsx` (sheet `Nomor Urut 1`-`20` dan `Rekap Akhir`)
- `Lembar_Penilaian_LDWC.xlsx` (sheet `PBB U15 & U-19`, `VARFOR`, `KOSTUM`)
- `Pemenang_LOBB_ANASHERA_PART_III_2026_Tingkat_SMP_Sederajat.pdf` dan `..._Tingkat_SMA_Sederajat.pdf`
