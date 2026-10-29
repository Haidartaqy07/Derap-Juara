# Sistem Penilaian Lomba Paskibra

Aplikasi web untuk penilaian lomba Paskibra dengan 4 role (Admin, Juri1, Juri2, Juri3), real-time update peringkat, dan perhitungan otomatis 7 kategori juara.

## Tech Stack

- **Next.js 15** (App Router + TypeScript)
- **Supabase** (PostgreSQL + Auth + Realtime)
- **Tailwind CSS** + **shadcn/ui** komponen
- **Zustand** untuk state management ringan
- **React Hook Form** + **Zod** validasi form

## Panduan Setup dari Nol

### Prasyarat

Install dulu di komputer Anda:

1. **Node.js v20+** — download dari [nodejs.org](https://nodejs.org)
2. **Akun Supabase** — daftar gratis di [supabase.com](https://supabase.com)
3. **Akun Vercel** (untuk deploy) — daftar gratis di [vercel.com](https://vercel.com)

### Langkah 1: Buat Project Supabase

1. Login ke [supabase.com](https://supabase.com) → klik **New Project**
2. Beri nama: `paskibra-lomba` (atau bebas)
3. Set password database (catat baik-baik)
4. Pilih region terdekat: **Southeast Asia (Singapore)**
5. Tunggu ~2 menit sampai project siap

### Langkah 2: Siapkan Database yang Dipakai Aplikasi

Aplikasi ini saat ini menargetkan skema Supabase yang sudah dipakai, yaitu tabel
`events`, `participants`, `pbb_submissions`, `variasi_submissions`, dan `deductions`.
Di dashboard Supabase, buka **SQL Editor**, lalu jalankan versi terbaru
[`database/migrations/20261029_lobb_scoring_fix.sql`](./database/migrations/20261029_lobb_scoring_fix.sql).
Migration akan menambahkan tabel dan kolom pendukung yang diperlukan; migration tidak
menghapus data peserta atau event.

Jangan jalankan `database/schema.sql` pada database aktif. File itu ditujukan untuk skema
aplikasi yang lebih lama dan berisi perintah reset tabel. Instalasi database kosong belum
didukung oleh skema SQL tersebut.

### Langkah 3: Setup Project Next.js

```bash
# Clone atau copy folder ini ke komputer Anda
cd paskibra-app

# Install dependencies
npm install

# Copy environment template
cp .env.example .env.local
```

### Langkah 4: Konfigurasi Environment

Buka file `.env.local` dan isi dengan kredensial Supabase Anda:

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...
```

Cara mendapat kredensial:
- Dashboard Supabase → **Settings** → **API**
- Copy **Project URL** → paste ke `NEXT_PUBLIC_SUPABASE_URL`
- Copy **anon public** key → paste ke `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- Copy **service_role** key → paste ke `SUPABASE_SERVICE_ROLE_KEY`

⚠️ **PENTING**: Jangan pernah commit file `.env.local` ke git!

### Langkah 5: Buat User Admin Pertama

Jalankan migration pada Langkah 2 terlebih dahulu. Akun dibuat melalui Supabase Auth;
tabel `users` lama (jika ada) tidak dapat dipakai untuk login dan tidak otomatis dipindahkan.
Karena tidak ada halaman registrasi publik, admin pertama harus dibuat manual:

1. Buka **SQL Editor** di Supabase
2. Jalankan query ini (ganti email & password sesuai keinginan):

```sql
-- Buat user admin via Supabase Auth
-- Buka menu Authentication → Users → Add User
-- Email: admin@paskibra.local
-- Password: (set sendiri, minimal 6 karakter)

-- Setelah user dibuat, jalankan ini di SQL Editor:
INSERT INTO public.profiles (id, username, role)
SELECT id, 'admin', 'admin'
FROM auth.users
WHERE email = 'admin@paskibra.local'
ON CONFLICT (id) DO UPDATE SET username = EXCLUDED.username, role = 'admin';
```

Buat akun juri dari menu **Juri** setelah admin berhasil login. Jika akun lama hanya ada
di tabel `users`, buat akun Supabase Auth baru melalui menu **Authentication → Users**,
lalu buat profil dan tetapkan ke event menggunakan aplikasi.

### Langkah 6: Jalankan Aplikasi

```bash
npm run dev
```

Buka browser ke [http://localhost:3000](http://localhost:3000)

Login dengan username profil (contoh `admin`) dan password akun Supabase Auth yang dibuat di Langkah 5.

### Langkah 7: Deploy ke Vercel (Opsional)

1. Push project ke GitHub
2. Login ke Vercel → **Import Project**
3. Pilih repo Anda
4. Tambahkan environment variables (sama seperti `.env.local`)
5. Klik **Deploy**

## Struktur Folder

```
paskibra-app/
├── database/
│   └── schema.sql          # Skema database lengkap
├── src/
│   ├── app/
│   │   ├── login/          # Halaman login
│   │   ├── admin/          # Halaman admin (event, user, peserta, peringkat)
│   │   ├── juri/           # Halaman juri (penilaian)
│   │   └── api/            # API routes (opsional)
│   ├── components/         # Komponen UI reusable
│   ├── lib/                # Helpers, Supabase client
│   └── types/              # TypeScript types
├── .env.example
├── package.json
└── README.md
```

## Cara Pakai

### Rumus Penilaian LOBB 2026

Nilai akhir menggunakan skor mentah dari lembar penilaian, tanpa normalisasi terhadap nilai
tertinggi event:

- **Juara Utama** = rata-rata PBB × 0,65 + Variasi Formasi × 0,25 + Danpas PBB / 2 +
  Danpas Variasi/Formasi / 2 − total pengurangan.
- **Juara Umum** = rata-rata PBB × 0,60 + Variasi Formasi × 0,30 +
  (Danpas PBB + Danpas Variasi/Formasi) / 4 + proporsi voting × 50 − total pengurangan.

Penilaian akhir baru ditampilkan setelah juri 1, juri 2, dan juri 3 mengirimkan nilai.

Migration `database/migrations/20261029_lobb_scoring_fix.sql` ditujukan untuk database yang
menggunakan tabel `participants`, `pbb_submissions`, `variasi_submissions`, dan `deductions`.
File tersebut tidak cocok dengan instalasi `database/schema.sql` di repo ini, yang memakai
`peserta` dan `penilaian_*`. Jangan jalankan `database/schema.sql` pada database aktif: file itu
mereset tabel. Skema kedua aplikasi ini perlu diselaraskan sebelum membuat instalasi baru atau
mengubah database dari satu bentuk ke bentuk lainnya.

Pada skema `participants`, migration membaca skor JSON terbaru yang sudah disubmit, skor Danton
PBB dari `danton_scores`, item Danton Variasi dari item 19-24, voting dari `vote_count`, dan
pengurangan dari `deductions`. Skema tersebut tidak menyimpan waktu tampil atau penanda gerakan
jalan, sehingga penalti waktu tidak dihitung dan tie-break PBB gerakan jalan tidak tersedia.

Bobot LDWC, kategori umur, dan komponen Kostum belum diterapkan karena detail resminya masih perlu
dikonfirmasi panitia; jangan memakai konfigurasi bobot LOBB untuk event LDWC.

### Sebagai Admin

1. Login dengan akun admin
2. **Buat Event** → klik tombol "Buat Event Baru", isi nama & batas waktu
3. **Set Urutan PBB** → buka event, tab "Indikator PBB" (sudah ada 26 default)
4. **Buat User Juri** → tab "Juri", buat akun untuk Juri1, Juri2, Juri3
5. **Input Peserta** → tab "Peserta", tambahkan nama regu & nomor urut
6. **Saat Lomba** → buka tab "Peringkat" untuk lihat update real-time
7. **Input Voting** → tab "Voting", input jumlah voting Instagram per peserta
8. **Unlock Nilai** → jika perlu revisi, buka tab "Penilaian", klik tombol unlock

### Sebagai Juri

1. Login dengan akun juri yang dibuat admin
2. Pilih event yang aktif
3. Pilih peserta dari daftar
4. Isi semua indikator dengan tombol cepat (K1, K2, C1, C2, B1, B2, SB)
5. Review total nilai di bagian bawah
6. Klik **Submit** → nilai akan terkunci

## Troubleshooting

**Error "Cannot connect to Supabase"**
→ Periksa `.env.local`, pastikan URL & key benar

**Login gagal**
→ Pastikan user sudah dibuat di Supabase Auth + ada row di tabel `profiles`

**Realtime tidak update**
→ Di Supabase, buka **Database** → **Replication** → enable untuk tabel yang dipakai


tes 1234