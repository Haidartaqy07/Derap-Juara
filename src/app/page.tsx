import Link from 'next/link';
import {
  ArrowDown,
  ArrowRight,
  BadgeCheck,
  BarChart3,
  CalendarDays,
  Check,
  ClipboardCheck,
  Flag,
  Medal,
  Shield,
  ShieldCheck,
  Users,
} from 'lucide-react';

const navigation = [
  { label: 'Beranda', href: '#beranda' },
  { label: 'Event', href: '#event' },
  { label: 'Penilaian', href: '#penilaian' },
  { label: 'Peringkat', href: '#peringkat' },
];

const steps = [
  {
    number: '01',
    icon: CalendarDays,
    title: 'Siapkan event',
    description: 'Atur event, indikator lomba, peserta, dan penugasan juri.',
    tone: 'bg-blue-100 text-blue-950',
  },
  {
    number: '02',
    icon: ClipboardCheck,
    title: 'Juri memberikan nilai',
    description: 'Juri mengisi penilaian sesuai bidang dan peran masing-masing.',
    tone: 'bg-orange-100 text-orange-800',
  },
  {
    number: '03',
    icon: BarChart3,
    title: 'Pantau hasil',
    description: 'Rekap dan peringkat dihitung setelah seluruh juri mengirim nilai.',
    tone: 'bg-emerald-100 text-emerald-800',
  },
];

const workspaces = [
  {
    icon: Flag,
    eyebrow: 'PENGELOLAAN EVENT',
    title: 'Satu ruang untuk kebutuhan lomba',
    description:
      'Kelola informasi event, susunan indikator PBB, peserta, dan akun juri dalam satu alur.',
    accent: 'from-blue-950 to-blue-800',
    details: ['Data peserta dan nomor urut', 'Penugasan juri per event', 'Pengaturan indikator PBB'],
  },
  {
    icon: ShieldCheck,
    eyebrow: 'PENILAIAN TERARAH',
    title: 'Setiap juri fokus pada bidangnya',
    description:
      'Juri PBB dan Variasi Formasi mengisi nilai melalui halaman khusus dengan status submit yang jelas.',
    accent: 'from-orange-500 to-amber-400',
    details: ['PBB dan Danton PBB', 'Variasi Formasi dan Danton', 'Nilai tersimpan sebagai draft'],
  },
  {
    icon: Medal,
    eyebrow: 'REKAPITULASI',
    title: 'Hasil lebih mudah dipantau',
    description:
      'Lihat status penilaian, voting, pengurangan poin, dan peringkat peserta dari dashboard admin.',
    accent: 'from-slate-800 to-slate-600',
    details: ['Skor menunggu semua juri submit', 'Input voting dan pengurangan', 'Ekspor lembar penilaian'],
  },
];

export default function Home() {
  return (
    <main className="min-h-screen overflow-hidden bg-[#f7f8fc] text-slate-950">
      <header className="sticky top-0 z-30 border-b border-slate-200/70 bg-[#f7f8fc]/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-5 py-4 sm:px-8 lg:px-12">
          <Link href="/" className="flex shrink-0 items-center gap-2.5" aria-label="Derap Juara, beranda">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-950 text-white shadow-md shadow-blue-950/15">
              <Medal className="h-5 w-5" />
            </span>
            <span className="hidden text-sm font-black tracking-[0.12em] text-blue-950 sm:block">
              DERAP JUARA
            </span>
          </Link>

          <nav
            aria-label="Navigasi utama"
            className="order-3 flex w-full items-center justify-center gap-1 overflow-x-auto rounded-full border border-slate-200 bg-white p-1.5 shadow-sm sm:order-none sm:absolute sm:left-1/2 sm:w-auto sm:-translate-x-1/2"
          >
            {navigation.map((item, index) => (
              <a
                key={item.href}
                href={item.href}
                className={`shrink-0 rounded-full px-3 py-2 text-xs font-bold transition sm:px-4 ${
                  index === 0
                    ? 'bg-blue-950 text-white shadow-sm'
                    : 'text-slate-500 hover:bg-slate-100 hover:text-blue-950'
                }`}
              >
                {item.label}
              </a>
            ))}
          </nav>

          <Link
            href="/login"
            className="inline-flex shrink-0 items-center gap-2 rounded-full bg-orange-500 px-4 py-2.5 text-xs font-extrabold text-white shadow-lg shadow-orange-500/20 transition hover:-translate-y-0.5 hover:bg-orange-600 sm:px-5 sm:text-sm"
          >
            Masuk
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </header>

      <section
        id="beranda"
        className="relative mx-auto grid min-h-[650px] max-w-7xl items-center gap-10 px-5 py-14 sm:px-8 md:py-20 lg:grid-cols-[0.92fr_1.08fr] lg:px-12"
      >
        <div className="pointer-events-none absolute -left-40 top-20 h-96 w-96 rounded-full bg-blue-200/35 blur-3xl" />
        <div className="pointer-events-none absolute right-0 top-16 h-80 w-80 rounded-full bg-orange-200/30 blur-3xl" />

        <div className="relative z-10 max-w-xl">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-orange-200 bg-white/80 px-3.5 py-2 text-[10px] font-extrabold uppercase tracking-[0.2em] text-blue-950 shadow-sm">
            <span className="h-2 w-2 rounded-full bg-orange-500" />
            Platform perlombaan Paskibra
          </div>
          <p className="text-sm font-extrabold tracking-[0.28em] text-orange-600">DERAP JUARA</p>
          <h1 className="mt-3 text-5xl font-black leading-[1.02] tracking-tight text-blue-950 sm:text-6xl lg:text-[4.25rem]">
            Kelola lomba,
            <span className="block text-orange-500">dari nilai</span>
            sampai juara.
          </h1>
          <p className="mt-6 max-w-lg text-base leading-7 text-slate-600 sm:text-lg sm:leading-8">
            Satu platform untuk mengatur event, mendampingi proses penilaian juri, dan melihat
            rekapitulasi hasil perlombaan Paskibra.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/login"
              className="inline-flex items-center gap-2 rounded-xl bg-blue-950 px-5 py-3.5 text-sm font-extrabold text-white shadow-xl shadow-blue-950/20 transition hover:-translate-y-0.5 hover:bg-blue-900"
            >
              Masuk ke aplikasi
              <ArrowRight className="h-4 w-4" />
            </Link>
            <a
              href="#event"
              className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-5 py-3.5 text-sm font-extrabold text-slate-700 transition hover:border-blue-200 hover:text-blue-950"
            >
              Jelajahi fitur
              <ArrowDown className="h-4 w-4" />
            </a>
          </div>
          <div className="mt-7 flex flex-wrap gap-x-5 gap-y-2 text-xs font-semibold text-slate-500">
            <span className="inline-flex items-center gap-1.5">
              <Check className="h-4 w-4 text-emerald-600" />
              Untuk admin dan juri
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Check className="h-4 w-4 text-emerald-600" />
              Rekap nilai terpusat
            </span>
          </div>
        </div>

        <div className="relative mx-auto flex min-h-[440px] w-full max-w-2xl items-center justify-center lg:min-h-[520px]">
          <div className="absolute left-1/2 top-1/2 h-[330px] w-[330px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-blue-200/80 sm:h-[430px] sm:w-[430px]" />
          <div className="absolute left-1/2 top-1/2 h-[260px] w-[260px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-orange-200/80 sm:h-[345px] sm:w-[345px]" />
          <div className="absolute left-1/2 top-1/2 h-[200px] w-[200px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-gradient-to-br from-blue-100 via-white to-orange-100 sm:h-[270px] sm:w-[270px]" />

          <div className="absolute left-[8%] top-[16%] z-20 hidden rounded-2xl border border-white bg-white/90 p-3.5 shadow-lg shadow-blue-950/10 sm:block">
            <div className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-100 text-blue-950">
                <Users className="h-4 w-4" />
              </span>
              <span>
                <span className="block text-xs font-extrabold text-slate-800">Juri terkoordinasi</span>
                <span className="block text-[10px] text-slate-500">Sesuai peran event</span>
              </span>
            </div>
          </div>

          <div className="relative z-10 flex h-48 w-48 items-center justify-center rounded-[3rem] bg-gradient-to-br from-blue-950 via-blue-900 to-slate-800 shadow-[0_35px_80px_-25px_rgba(23,37,84,0.65)] ring-8 ring-white/80 sm:h-64 sm:w-64 sm:rounded-[4rem]">
            <div className="absolute inset-3 rounded-[2.4rem] border border-white/15 sm:inset-4 sm:rounded-[3.2rem]" />
            <div className="absolute inset-0 rounded-[3rem] bg-[radial-gradient(circle_at_50%_25%,rgba(255,255,255,0.18),transparent_58%)] sm:rounded-[4rem]" />
            <div className="relative flex h-28 w-28 items-center justify-center rounded-full border border-orange-300/50 bg-white/10 text-orange-300 shadow-inner sm:h-36 sm:w-36">
              <Shield className="absolute h-24 w-24 stroke-[1.2] sm:h-32 sm:w-32" />
              <Medal className="h-12 w-12 sm:h-16 sm:w-16" />
            </div>
            <span className="absolute -bottom-4 rounded-full border-4 border-[#f7f8fc] bg-orange-500 px-4 py-2 text-[10px] font-black uppercase tracking-[0.2em] text-white shadow-lg sm:px-5">
              Siap berlomba
            </span>
          </div>

          <div className="absolute right-0 top-[16%] z-20 w-48 rotate-2 rounded-2xl border border-white bg-white p-3 shadow-xl shadow-blue-950/10 sm:right-[2%] sm:w-56 sm:p-4">
            <div className="flex items-center justify-between">
              <span className="text-[9px] font-extrabold uppercase tracking-[0.16em] text-slate-400">
                Alur lomba
              </span>
              <BadgeCheck className="h-4 w-4 text-emerald-600" />
            </div>
            <div className="mt-3 flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-100 text-xs font-black text-blue-950">
                1
              </span>
              <span className="text-xs font-bold text-slate-700">Atur event</span>
            </div>
            <div className="ml-4 h-3 border-l border-dashed border-slate-300" />
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-orange-100 text-xs font-black text-orange-700">
                2
              </span>
              <span className="text-xs font-bold text-slate-700">Juri menilai</span>
            </div>
            <div className="ml-4 h-3 border-l border-dashed border-slate-300" />
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-100 text-xs font-black text-emerald-700">
                3
              </span>
              <span className="text-xs font-bold text-slate-700">Lihat hasil</span>
            </div>
          </div>

          <div className="absolute bottom-[12%] left-[1%] z-20 w-52 -rotate-2 rounded-2xl border border-white bg-white p-4 shadow-xl shadow-blue-950/10 sm:bottom-[10%] sm:left-[7%] sm:w-60">
            <p className="text-[9px] font-extrabold uppercase tracking-[0.16em] text-orange-600">
              Bidang penilaian
            </p>
            <p className="mt-1 text-sm font-black text-blue-950">PBB & Variasi Formasi</p>
            <div className="mt-3 flex gap-1.5">
              {['PBB', 'DANTON', 'VARFOR'].map((label, index) => (
                <span
                  key={label}
                  className={`rounded-md px-2 py-1 text-[8px] font-extrabold tracking-wide ${
                    index === 1 ? 'bg-orange-100 text-orange-800' : 'bg-blue-50 text-blue-900'
                  }`}
                >
                  {label}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="event" className="mx-auto max-w-7xl px-5 py-16 sm:px-8 sm:py-20 lg:px-12">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-[0.24em] text-slate-400">
              KENALI RUANG KERJANYA
            </p>
            <h2 className="mt-2 text-3xl font-black tracking-tight text-blue-950 sm:text-4xl">
              Event, penilaian, hasil.
            </h2>
            <p className="mt-2 max-w-xl text-sm leading-6 text-slate-600">
              Semua tahapan inti perlombaan tersusun dalam satu alur kerja yang mudah dipahami.
            </p>
          </div>
          <a
            href="#penilaian"
            className="inline-flex w-fit items-center gap-2 rounded-full bg-white px-4 py-2.5 text-xs font-extrabold text-blue-950 shadow-md shadow-blue-950/5 transition hover:shadow-lg"
          >
            Lihat alur kerja
            <ArrowRight className="h-4 w-4" />
          </a>
        </div>

        <div className="mt-8 grid gap-5 md:grid-cols-3">
          {workspaces.map(({ icon: Icon, eyebrow, title, description, accent, details }, index) => (
            <article
              key={eyebrow}
              className="group overflow-hidden rounded-[1.6rem] border border-slate-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-xl hover:shadow-blue-950/10"
            >
              <div className={`relative h-40 overflow-hidden bg-gradient-to-br ${accent} p-5`}>
                <div className="absolute -right-7 -top-10 h-40 w-40 rounded-full border border-white/20" />
                <div className="absolute -right-1 -top-4 h-28 w-28 rounded-full border border-white/20" />
                <span className="relative flex h-12 w-12 items-center justify-center rounded-2xl border border-white/30 bg-white/15 text-white backdrop-blur">
                  <Icon className="h-6 w-6" />
                </span>
                <div className="absolute bottom-4 left-5 right-5 flex items-center justify-between">
                  <span className="text-[9px] font-extrabold tracking-[0.2em] text-white/75">
                    {eyebrow}
                  </span>
                  <span className="text-3xl font-black text-white/25">0{index + 1}</span>
                </div>
              </div>
              <div className="p-5">
                <h3 className="text-lg font-extrabold leading-snug text-blue-950">{title}</h3>
                <p className="mt-2 min-h-[4.5rem] text-sm leading-6 text-slate-600">{description}</p>
                <ul className="mt-4 space-y-2 border-t border-slate-100 pt-4">
                  {details.map((detail) => (
                    <li key={detail} className="flex items-center gap-2 text-xs font-semibold text-slate-600">
                      <Check className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
                      {detail}
                    </li>
                  ))}
                </ul>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section id="penilaian" className="border-y border-slate-200 bg-white py-16 sm:py-20">
        <div className="mx-auto grid max-w-7xl gap-10 px-5 sm:px-8 lg:grid-cols-[0.8fr_1.2fr] lg:items-center lg:px-12">
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-[0.24em] text-orange-600">
              ALUR YANG TERARAH
            </p>
            <h2 className="mt-3 text-3xl font-black leading-tight tracking-tight text-blue-950 sm:text-4xl">
              Dari persiapan
              <span className="block text-orange-500">hingga pengumuman.</span>
            </h2>
            <p className="mt-4 max-w-md text-sm leading-7 text-slate-600">
              Panitia dan juri bekerja pada bagian masing-masing. Status penilaian dan perhitungan
              hasil dapat dipantau oleh admin.
            </p>
            <Link
              href="/login"
              className="mt-7 inline-flex items-center gap-2 rounded-xl bg-orange-500 px-5 py-3 text-sm font-extrabold text-white shadow-lg shadow-orange-500/20 transition hover:bg-orange-600"
            >
              Mulai menggunakan
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            {steps.map(({ number, icon: Icon, title, description, tone }) => (
              <article
                key={number}
                className="rounded-2xl border border-slate-200 bg-[#fbfcff] p-5 sm:mt-0 sm:even:mt-8"
              >
                <div className="flex items-center justify-between">
                  <span className={`flex h-11 w-11 items-center justify-center rounded-xl ${tone}`}>
                    <Icon className="h-5 w-5" />
                  </span>
                  <span className="text-2xl font-black text-slate-200">{number}</span>
                </div>
                <h3 className="mt-5 text-sm font-extrabold text-blue-950">{title}</h3>
                <p className="mt-2 text-xs leading-5 text-slate-600">{description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="peringkat" className="px-5 py-16 sm:px-8 sm:py-20 lg:px-12">
        <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-7 overflow-hidden rounded-[2rem] bg-blue-950 px-6 py-9 text-white sm:px-10 sm:py-12 lg:flex-row lg:items-center lg:px-14">
          <div className="relative z-10 max-w-2xl">
            <p className="text-[10px] font-extrabold uppercase tracking-[0.24em] text-orange-300">
              DERAP JUARA
            </p>
            <h2 className="mt-3 text-3xl font-black leading-tight tracking-tight sm:text-4xl">
              Penilaian tertata,
              <span className="block text-orange-300">hasil siap dipantau.</span>
            </h2>
            <p className="mt-3 max-w-xl text-sm leading-6 text-blue-100/80">
              Masuk sebagai admin untuk mengelola lomba, atau sebagai juri untuk mengisi penilaian
              sesuai penugasan.
            </p>
          </div>
          <Link
            href="/login"
            className="relative z-10 inline-flex shrink-0 items-center gap-2 rounded-xl bg-orange-500 px-6 py-3.5 text-sm font-extrabold text-white shadow-lg shadow-black/15 transition hover:-translate-y-0.5 hover:bg-orange-400"
          >
            Masuk ke aplikasi
            <ArrowRight className="h-4 w-4" />
          </Link>
          <div className="pointer-events-none absolute right-0 h-64 w-64 rounded-full border border-white/10" />
        </div>
      </section>

      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-5 py-6 text-xs font-medium text-slate-500 sm:flex-row sm:items-center sm:justify-between sm:px-8 lg:px-12">
          <span className="font-extrabold tracking-[0.14em] text-blue-950">DERAP JUARA</span>
          <span>Sistem pendukung penilaian perlombaan Paskibra</span>
        </div>
      </footer>
    </main>
  );
}
