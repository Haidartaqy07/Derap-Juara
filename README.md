# Sistem Penilaian Lomba Paskibra

Aplikasi web untuk penilaian lomba Paskibra dengan role Admin dan tiga slot juri (dua juri PBB serta satu juri Variasi/Formasi). Dashboard menampilkan status dan subtotal rubrik LDWC 2026; peringkat akhir belum dihitung sampai bobot resmi dikonfirmasi.

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
Cadangkan database, lalu buka **SQL Editor** di Supabase. Untuk database yang cocok dengan skema tersebut
dan belum pernah menerima migration proyek ini, gunakan satu bundel berurutan:
[`database/combined_migrations.sql`](./database/combined_migrations.sql). Bundel ini menggabungkan seluruh
file di `database/migrations/`, termasuk migration dasar 20261029, rubrik LDWC dan snapshot dinamis,
detail event, voting dan hitung suara terverifikasi, bucket poster, draft/final penilaian juri, serta
penyimpanan pengumuman juara dan penghapusan indikator Danton Variasi/Formasi yang tidak digunakan.

Bundel **bukan installer database kosong** dan hanya dijalankan satu kali pada database yang sesuai.
Jangan jalankan jika sebagian migration sumber sudah pernah diterapkan. Periksa status migration terlebih
dahulu dan jalankan hanya migration yang belum diterapkan.
Bundel secara sengaja tidak memasukkan [`database/schema.sql`](./database/schema.sql), karena file itu
adalah skema lama yang tidak kompatibel dan berisi `DROP TABLE ... CASCADE`.
Catatan arsitektur, fitur, keterbatasan, dan panduan delegasi ada di
[`DEVELOPMENT-HANDOFF.md`](./DEVELOPMENT-HANDOFF.md).

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
│   ├── combined_migrations.sql # Bundel migration Supabase berurutan
│   ├── migrations/         # Sumber migration satuan
│   └── schema.sql          # Skema legacy; jangan jalankan pada database aktif
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

Ringkasan perubahan, peta file, keputusan teknis, dan pekerjaan lanjutan untuk delegasi ada di
[`DEVELOPMENT-HANDOFF.md`](./DEVELOPMENT-HANDOFF.md).

### Rubrik LDWC 2026

Rubrik dasar LDWC berasal dari [`src/app/data/ldwc2026/rubric.json`](./src/app/data/ldwc2026/rubric.json)
dan disalin ke snapshot masing-masing event. Form juri, subtotal, dan ekspor membaca snapshot event, sehingga
perubahan tidak mengubah event lain. Nilai awal rubrik adalah:

| Komponen | Item | Maksimum |
|---|---:|---:|
| PBB | 26 | 1000 |
| Danton PBB | 6 | 100 |
| Variasi | 8 | 400 |
| Formasi | 10 | 600 |
| Danton Variasi & Formasi | 3 | 52 |

Tiga indikator aba-aba lama sudah dihapus. Untuk database yang telah menjalankan migration sebelumnya,
terapkan [`database/migrations/20261108_remove_unused_varfor_items.sql`](./database/migrations/20261108_remove_unused_varfor_items.sql)
agar snapshot rubrik event dan skor tersimpan ikut dibersihkan. Jika hasil event sudah pernah diumumkan,
periksa pratinjau dan umumkan ulang agar snapshot publik mengikuti rubrik terbaru.

Dashboard menampilkan status pengumpulan dan subtotal mentah. Tab Pengumuman Juara menghitung kategori
penghargaan tersendiri dengan rumus yang disepakati, memisahkan U15/U19, dan menggunakan voting hanya
untuk komponen Juara Umum. Hasil voting tidak memengaruhi subtotal penilaian juri.

Halaman **Event** menampilkan kartu event bergambar dan membuka detail lomba berisi poster, deskripsi,
tempat, tanggal/waktu, dan tim peserta. Admin dapat mengatur deskripsi, waktu, serta URL foto/poster saat
membuat atau mengedit event. Jalankan migration
[`database/migrations/20261103_public_event_details.sql`](./database/migrations/20261103_public_event_details.sql)
sebelum menggunakan kolom-kolom detail tersebut. Poster dapat diunggah sebagai JPG, PNG, atau WebP
maksimal 5 MB. Jalankan juga migration
[`database/migrations/20261105_event_posters_storage.sql`](./database/migrations/20261105_event_posters_storage.sql)
untuk membuat bucket publik poster; unggah file hanya diizinkan untuk admin.

Halaman publik memakai navbar Derap Juara yang sama dengan penanda halaman aktif. Perpindahan halaman
menggunakan animasi singkat dan otomatis dikurangi untuk pengguna yang mengaktifkan preferensi reduced motion;
area admin dan juri tetap memakai navigasi workspace masing-masing.

Landing page menyediakan halaman **Voting** untuk
memilih tim pada event aktif. Harga voting yang diinformasikan adalah Rp1.000 per suara, tetapi pilihan
tim belum menambahkan suara. Pembayaran QRIS dinonaktifkan sampai penyedia pembayaran dipilih dan
integrasi verifikasi transaksi tersedia.

Halaman Voting menampilkan kartu event, detail dan tim peserta dalam dialog, serta dialog konfirmasi
pembayaran saat tim dipilih. Riwayat publik hanya menampilkan vote dari transaksi berstatus terverifikasi
(tim, event, jumlah, dan waktu; tanpa identitas pembayar). Jalankan
[`database/migrations/20261103_public_voting_payments.sql`](./database/migrations/20261103_public_voting_payments.sql)
untuk menyiapkan penyimpanan transaksi dan riwayat. Integrasi provider QRIS dan webhook belum aktif;
karena itu dialog pembayaran tetap nonaktif dan tidak ada pembayaran atau vote yang dicatat sampai
provider dipilih dan verifikasi server terpasang.

### Sistem Juara dan Pengumuman

Tab **Pengumuman Juara** pada detail event admin menampilkan pratinjau hasil berdasarkan nilai yang sudah
difinalkan. Admin dapat mengumumkan seluruh kategori sekaligus; hasil publik tampil di menu **Pengumuman**
dan memuat detail subtotal serta kontribusi rumus untuk Juara Bergilir, Juara Utama I–III, Juara Harapan
I–III, Juara Madya I–III, Juara Bina I–III, Juara Mula I–III, Juara Purwa I–III, Juara Caraka I–III,
Juara Potensial I–III, Juara Perintis I–III, Juara Siaga I–III, Juara Umum, PBB Terbaik, Juara Danton,
dan Juara Variasi. Pengumuman dapat diperbarui dengan tombol **Umumkan Ulang**.

Perhitungan dipisahkan untuk U15 dan U19. Juara Bergilir memakai regu peringkat tertinggi. Juara Utama,
Harapan, Madya, Bina, Mula, Purwa, Caraka, Potensial, Perintis, dan Siaga masing-masing menggunakan
rumus PBB 60%, Danton PBB 5%, Variasi+Formasi 30%, dan Danton Variasi/Formasi 5%; setiap tingkat berisi
tiga peringkat berurutan. Juara Utama memakai tiga peringkat pertama, Harapan tiga berikutnya, dan
seterusnya sampai Siaga (peringkat 28–30).
Juara Umum memakai PBB 50%, Variasi+Formasi 30%, Danton PBB 10%, dan voting 10%; poin voting dinormalisasi
terhadap suara tertinggi dalam kategori. PBB dan Danton PBB menggunakan rata-rata dua juri. Juara Danton
menggunakan subtotal Danton PBB; Juara Variasi memakai gabungan Variasi+Formasi, dengan Formasi sebagai
tie-break. Seluruh subtotal dinormalisasi terhadap maksimum rubrik event. Pengumuman diblokir apabila nilai
belum lengkap/difinalkan atau skor untuk posisi pemenang Juara Utama sampai Siaga maupun Juara Umum seri. Jika
skor Variasi dan Formasi sama-sama seri, semua regu teratas diumumkan sebagai pemenang bersama.

Setelah provider/webhook menandai pembayaran sebagai `paid`, migration
[`database/migrations/20261104_count_verified_voting_payments.sql`](./database/migrations/20261104_count_verified_voting_payments.sql)
secara atomik menambahkan kuantitas suara satu kali ke peserta. Tab Voting admin memperbarui jumlah
secara realtime. Pastikan webhook hanya menetapkan status `paid` setelah signature dan nominal transaksi
diverifikasi.

Admin dapat membuka tab **Gerakan PBB** untuk mengubah langsung tabel gerakan/penilaian, nomor dan nama
item, nilai maksimum, serta nilai tiap level pada event itu saja. Pengaturan tidak lagi harus diubah lewat source code. Perubahan dikunci setelah
ada draf atau submission nilai pertama agar skor yang tersimpan tidak berubah maknanya. Nilai level dan
jumlah item yang disesuaikan akan langsung dipakai oleh form juri, subtotal, dan ekspor.

Event lama tetap `LEGACY`. Admin hanya dapat mengganti template event menjadi LDWC jika belum ada
submission yang disubmit; perubahan template tidak mengonversi angka lama. Tetapkan kategori U15/U19
tiap regu di tab Peserta.

### Pengujian

Jalankan `npm test` dan `npx tsc --noEmit`. Fixture LOBB 2026 hanya dipakai untuk menguji regresi
mesin hitung; bobot LOBB tidak dipakai di dashboard atau penilaian LDWC.

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

Bobot LDWC, kategori umur, serta aturan jumlah/agregasi juri belum sepenuhnya ditetapkan; jangan memakai
konfigurasi bobot LOBB untuk event LDWC. Data Kostum lama di database tidak dihapus, tetapi tidak lagi
digunakan oleh alur aplikasi.

### Sebagai Admin

1. Login dengan akun admin
2. **Buat Event** → klik tombol "Buat Event Baru", isi nama & batas waktu
3. Buka event dan siapkan rubrik pada tab "Gerakan PBB" sebelum juri mulai menilai
4. **Buat User Juri** → tab "Juri", buat akun untuk Juri1, Juri2, Juri3
5. **Input Peserta** → tab "Peserta", tambahkan nama regu & nomor urut
6. **Tinjau Nilai** → tab "Kelola Penilaian", periksa draf dari juri, lalu pilih "Kunci & Finalkan"
   setelah semua indikator lengkap. Admin dapat membuka kunci untuk meminta revisi.
7. **Pantau Hasil** → tab "Peringkat" menampilkan status dan subtotal yang sudah difinalkan.
   Aturan bobot/ranking akhir LDWC belum ditetapkan.
8. **Voting** → tab "Voting" untuk melihat atau mengoreksi jumlah suara; pembayaran publik belum aktif.

### Sebagai Juri

1. Login dengan akun juri yang dibuat admin
2. Pilih event yang aktif
3. Pilih peserta dari daftar
4. Isi indikator melalui tombol level pada rubrik. Nilai tersimpan otomatis sebagai draf.
5. Pilih **Kirim Draf ke Admin** untuk menandai draf siap ditinjau; juri masih dapat memperbaiki nilai.
6. Setelah admin memilih **Kunci & Finalkan**, penilaian terkunci. Hubungi admin bila perlu revisi.

## Troubleshooting

**Error "Cannot connect to Supabase"**
→ Periksa `.env.local`, pastikan URL & key benar

**Login gagal**
→ Pastikan user sudah dibuat di Supabase Auth + ada row di tabel `profiles`

**Realtime tidak update**
→ Di Supabase, buka **Database** → **Replication** → enable untuk tabel yang dipakai


tes 1234