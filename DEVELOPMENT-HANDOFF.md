# Derap Juara — Catatan Handoff Pengembangan

Dokumen ini merangkum perilaku aplikasi, keputusan yang sudah dibuat, lokasi implementasi utama,
database, dan pekerjaan yang masih menunggu keputusan/integrasi. Baca bersama `README.md` sebelum
mengambil alih pengembangan.

## Gambaran aplikasi

Derap Juara adalah aplikasi lomba Paskibra berbasis Next.js App Router, TypeScript, Tailwind CSS,
dan Supabase. Role utama: admin, juri1, juri2, dan juri3. Skema Supabase yang dipakai kode adalah
skema berbasis `participants`, bukan skema lama `peserta`.

## Fitur dan keputusan saat ini

- **Rubrik LDWC 2026:** konfigurasi rubrik per event disimpan sebagai snapshot. Form menilai PBB,
  Danton PBB, Variasi, Formasi, serta Danton Variasi/Formasi. Perubahan rubrik dibatasi setelah ada
  nilai agar arti nilai tersimpan tidak berubah. Danton Variasi/Formasi sekarang memakai tiga indikator
  yang tersisa (maksimum 52); migration 20261108 menghapus item 19-21 dan skor terkait dari event LDWC lama.
- **Hasil:** dashboard admin menampilkan status dan subtotal mentah. Tab Pengumuman Juara memiliki
  formula penghargaan khusus yang sudah disepakati; jangan menerapkan formula itu sebagai ranking umum
  atau menganggapnya menggantikan konfigurasi penilaian LDWC lain. Jangan menyalin bobot LOBB ke LDWC.
- **Alur juri:** nilai tersimpan otomatis sebagai draf. Juri dapat mengirim draf untuk ditinjau dan
  tetap mengedit sampai admin memfinalkan. Finalisasi admin mengunci nilai; admin dapat membuka kunci
  untuk meminta revisi. Database trigger membatasi perubahan status final untuk admin.
- **Event publik:** katalog event, halaman detail, deskripsi, tempat/waktu, dan poster.
- **Poster:** JPG/PNG/WebP maksimal 5 MB, bucket `event-posters`. Unggah server membutuhkan
  `SUPABASE_SERVICE_ROLE_KEY`; bucket disiapkan oleh migration poster.
- **Voting:** halaman publik menampilkan event dan tim serta riwayat pembayaran terverifikasi.
  Suara dihitung satu kali saat backend tepercaya mengubah pembayaran menjadi `paid`.
  Provider pembayaran dan webhook QRIS belum terintegrasi; alur pembayaran publik sengaja nonaktif.
- **Juara:** tab Pengumuman Juara admin menghitung dan meninjau pemenang U15/U19 sebelum publikasi.
  Publikasi menyimpan snapshot semua kategori juara sekaligus dan ditampilkan di `/pengumuman`.
  Juara Bergilir memakai peserta peringkat tertinggi. Juara Utama, Harapan, Madya, Bina, Mula, Purwa,
  Caraka, Potensial, Perintis, dan Siaga masing-masing memiliki tiga peringkat berurutan dengan formula
  PBB 60%, Danton PBB 5%, VAFOR 30%, Danton VAFOR 5%; urutannya berlanjut sampai Siaga III di peringkat 30.
  Juara Umum: PBB 50%, VAFOR 30%, Danton PBB 10%, voting 10%; voting dinormalisasi terhadap jumlah
  tertinggi dalam kategori. Dua nilai PBB dan Danton PBB dirata-rata. Juara Danton memakai Danton PBB.
  Juara Variasi memakai Variasi+Formasi dan Formasi sebagai tie-break. Detail poin tersimpan bersama snapshot.
  Semua nilai harus sudah final dan lengkap untuk seluruh peserta sebelum publikasi; skor seri pada posisi
  penghargaan Juara Utama–Siaga memblokir
  publikasi, sedangkan seri Juara Variasi yang tetap imbang setelah tie-break diumumkan sebagai juara bersama.
- **UI:** tema navy-oranye dipakai di landing page, admin, dan juri. Area juri dirancang nyaman
  untuk tablet. Dialog juri menggunakan portal ke `document.body` agar tidak terpotong stacking context.

## Ringkasan aktivitas pengembangan

- **Database dan skema:** kode menggunakan tabel `participants`, bukan tabel lama `peserta`.
  Migration aplikasi disatukan di `database/combined_migrations.sql`; `database/schema.sql`
  tetap dikecualikan karena skema legacy dan memiliki `DROP TABLE ... CASCADE`.
- **Login dan navigasi:** halaman login tidak menampilkan navbar publik. Area admin memakai pola
  sidebar, navbar, dan konten utama; halaman publik berbagi navigasi dengan tema navy-oranye.
- **Event dan poster:** katalog dan detail event publik menampilkan deskripsi, tempat/waktu, serta
  poster. Admin dapat mengunggah poster ke bucket Supabase Storage `event-posters`.
- **Penilaian:** rubrik LDWC dinamis tersimpan sebagai snapshot per event. Juri dapat menyimpan dan
  mengirim draf untuk ditinjau; admin yang memfinalkan atau membuka kunci nilai. Pemeriksaan finalisasi
  memisahkan item dari array skor Juri 3 bersama agar skor Variasi, Formasi, dan Danton tidak keliru
  dianggap belum lengkap.
- **Indikator:** tiga indikator Aba-Aba Variasi/Formasi yang tidak lagi dipakai dihapus dari rubrik
  dasar. Nilai maksimum Danton Variasi/Formasi menjadi 52; migration 20261108 membersihkan snapshot
  rubrik dan skor item 19–21 di event LDWC lama.
- **Voting:** tampilan voting dan riwayat pembayaran terverifikasi sudah tersedia, tetapi provider
  pembayaran dan webhook QRIS belum terintegrasi sehingga alur pembayaran publik masih nonaktif.
- **Pengumuman juara:** admin meninjau dan menerbitkan snapshot hasil, yang tampil di `/pengumuman`.
  Kategori Juara Bergilir, Juara Utama/Harapan/Madya/Bina/Mula/Purwa/Caraka/Potensial/Perintis/Siaga
  I–III, Juara Umum, PBB Terbaik, Juara Danton, dan Juara Variasi dihitung terpisah untuk U15/U19.
- **Tampilan hasil juara:** kategori penghargaan dipisahkan secara visual dan memiliki tautan navigasi
  cepat di pratinjau admin serta halaman publik.

## Sumber SQL dan cara menyiapkan database

Gunakan [`database/combined_migrations.sql`](./database/combined_migrations.sql) untuk mengaplikasikan
seluruh migration secara berurutan pada database Supabase yang sudah memiliki skema berbasis
`participants`. Bundel tersusun dari:

1. `database/migrations/20261029_lobb_scoring_fix.sql` — prasyarat skema existing, tabel pendukung,
   RLS, dan fungsi penilaian.
2. `database/migrations/20261102_ldwc_2026_rubric.sql` — kategori dan template LDWC; event existing
   dipertahankan sebagai `LEGACY`.
3. `database/migrations/20261102_ldwc_dynamic_rubric.sql` — snapshot rubrik dan validasi skor.
4. `database/migrations/20261103_public_event_details.sql` — deskripsi, poster URL, dan waktu event.
5. `database/migrations/20261103_public_voting_payments.sql` — tabel transaksi voting.
6. `database/migrations/20261104_count_verified_voting_payments.sql` — hitung suara terverifikasi
   satu kali dan konfigurasi Realtime.
7. `database/migrations/20261105_event_posters_storage.sql` — bucket Storage publik untuk poster.
8. `database/migrations/20261106_jury_draft_review.sql` — status draf dan perlindungan finalisasi admin.
9. `database/migrations/20261107_championship_announcements.sql` — penyimpanan publikasi pemenang dengan RLS.
10. `database/migrations/20261108_remove_unused_varfor_items.sql` — hapus tiga indikator aba-aba yang tidak digunakan
    dari snapshot rubrik LDWC dan bersihkan nilai tersimpan untuk indikator tersebut.
11. `database/migrations/20261109_admin_unlock_finalized_submissions.sql` — izinkan admin membuka kunci nilai final
    sambil tetap mencegah juri mengubah nilai yang sudah difinalkan; mengganti trigger legacy yang menolak semua update.
12. `database/migrations/20261110_swap_participant_numbers.sql` — simpan perubahan nomor urut secara atomik dan tukar
    nomor dengan peserta lain di event yang sama jika nomor tujuan sudah digunakan.

Cadangkan database dan baca peringatan di header bundel sebelum menjalankan. Bundel tidak membuat
database kosong. Jangan jalankan seluruh bundel jika migration individual sudah pernah diterapkan.
Periksa migration mana yang sudah diterapkan dan jalankan hanya sisanya. Migration rubrik dinamis
menginisialisasi snapshot hanya ketika `events.rubric IS NULL`; migration 20261108 kemudian menghapus
indikator lama dan skor terkait dari snapshot event LDWC.

`database/schema.sql` **sengaja tidak dimasukkan ke bundel**. File tersebut adalah skema lama dengan
tabel `peserta`/`penilaian_*` dan perintah `DROP TABLE ... CASCADE`; menjalankannya di database aktif
dapat menghapus tabel dan data. Instalasi dari database kosong belum didukung oleh rangkaian migration
ini.

## Peta implementasi

| Area | File penting |
|---|---|
| Landing/public shell dan halaman | `src/app/page.tsx`, `src/app/events/`, `src/app/voting/`, `src/components/public/` |
| Login dan proteksi route | `src/app/login/page.tsx`, `src/middleware.ts`, `src/app/api/auth/login/route.ts` |
| Layout dan manajemen event admin | `src/app/admin/layout.tsx`, `src/components/admin/admin-workspace-shell.tsx`, `src/app/admin/page.tsx` |
| Detail event dan tab admin | `src/app/admin/events/[id]/page.tsx`, `src/components/admin/` |
| Upload poster | `src/components/admin/event-poster-upload.tsx`, `src/app/api/admin/upload-event-image/route.ts` |
| Rubrik/sumber data LDWC | `src/app/data/ldwc2026/rubric.json`, `src/lib/ldwc-rubric.ts` |
| Penilaian juri | `src/app/juri/`, `src/components/juri/` |
| Draft/finalisasi admin | `src/components/juri/rubric-score-form.tsx`, `src/components/admin/kelola-penilaian-tab.tsx`, migration 20261106 |
| Hitung subtotal/hasil | `src/lib/scoring.ts`, `src/components/admin/peringkat-tab.tsx` |
| Vote dan riwayat publik | `src/app/api/public/`, `src/components/public/public-voting-page.tsx`, migration 20261103–04 |
| Sistem juara dan pengumuman | `src/lib/championship-awards.ts`, `src/components/admin/championship-announcement-tab.tsx`, `src/components/public/public-championship-announcements.tsx`, migration 20261107 |
| Dialog bersama | `src/components/confirm-dialog.tsx` |

## Catatan untuk perubahan berikutnya

- Semua pembayaran harus diverifikasi melalui provider/webhook server sebelum berstatus `paid`.
  Jangan menambah jumlah suara dari input client atau membuat status pembayaran sukses palsu.
- Sebelum mengaktifkan ranking LDWC, minta keputusan resmi tentang bobot, ranking per kategori,
  agregasi juri, dan pengurangan.
- Jika skema database berubah, sinkronkan tipe di `src/types/index.ts`, query Supabase, RLS,
  migration, dan dokumentasi.
- Perubahan langsung ke tabel submissions mematuhi RLS. Admin mengubah flag final melalui tab
  Kelola Penilaian; juri hanya boleh mengubah skor selama submission belum difinalkan.

## Verifikasi lokal

```bash
npm test
npx tsc --noEmit
npm run build
```

Validasi terakhir untuk fitur juara dan penilaian: 36 tes lulus, TypeScript dan production build berhasil,
serta `git diff --check` bersih. Lint interaktif `next lint` meminta konfigurasi ESLint yang belum tersedia,
jadi build digunakan untuk lint/type check.
