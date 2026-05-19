# Sistem Penilaian Lomba Paskibra

Aplikasi web untuk penilaian lomba Paskibra dengan 4 role (Admin, Juri1, Juri2, Juri3), real-time update peringkat, dan perhitungan otomatis 7 kategori juara.

## Tech Stack

- **Next.js 14** (App Router + TypeScript)
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

### Langkah 2: Setup Database

1. Di dashboard Supabase, buka menu **SQL Editor** (icon di sidebar kiri)
2. Klik **New Query**
3. Copy seluruh isi file `database/schema.sql` dari repo ini
4. Paste ke editor → klik **Run**
5. Verifikasi: buka menu **Table Editor**, harus ada 10 tabel

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

Karena tidak ada halaman registrasi publik (untuk keamanan), admin pertama harus dibuat manual:

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
WHERE email = 'admin@paskibra.local';
```

### Langkah 6: Jalankan Aplikasi

```bash
npm run dev
```

Buka browser ke [http://localhost:3000](http://localhost:3000)

Login dengan email & password yang Anda buat di Langkah 5.

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