'use client';

import { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Event } from '@/types';
import {
  ArrowLeft,
  Users,
  ListOrdered,
  Trophy,
  Vote,
  Lock,
  ClipboardList,
  Award,
} from 'lucide-react';
import PesertaTab from '@/components/admin/peserta-tab';
import JuriTab from '@/components/admin/juri-tab';
import PeringkatTab from '@/components/admin/peringkat-tab';
import VotingTab from '@/components/admin/voting-tab';
import KelolaPenilaianTab from '@/components/admin/kelola-penilaian-tab';
import GerakanPbbTab from '@/components/admin/gerakan-pbb-tab';
import ChampionshipAnnouncementTab from '@/components/admin/championship-announcement-tab';

type Tab = 'peserta' | 'juri' | 'peringkat' | 'voting' | 'kelola' | 'gerakan' | 'juara';

export default function EventDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  // Next.js 15: params adalah Promise -> harus di-unwrap dengan React.use()
  const { id } = use(params);

  const [event, setEvent] = useState<Event | null>(null);
  const [tab, setTab] = useState<Tab>('peringkat');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadEvent();
  }, [id]);

  async function loadEvent() {
    const supabase = createClient();
    const { data } = await supabase.from('events').select('*').eq('id', id).single();
    setEvent(data);
    setLoading(false);
  }

  if (loading) return <p className="text-slate-600">Memuat...</p>;
  if (!event) return <p className="text-red-600">Event tidak ditemukan</p>;

  return (
    <div className="space-y-4">
      <div>
        <Link
          href="/admin"
          className="mb-2 inline-flex items-center gap-1 text-sm text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Kembali ke Daftar Event
        </Link>
        <h2 className="text-xl font-bold text-slate-900">{event.name}</h2>
        <p className="text-sm text-slate-600">
          {new Date(event.date).toLocaleDateString('id-ID', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric',
          })}{' '}
          • Batas waktu {Math.floor(event.batas_waktu_detik / 60)} menit
        </p>
        <p className="mt-1 text-xs font-medium text-blue-700">
          Template: {event.scoring_template === 'LEGACY' ? 'Legacy' : 'LDWC 2026'} · Kategori:{' '}
          {event.categories?.join(' / ')}
        </p>
      </div>

      <div className="border-b border-slate-200">
        <div className="flex gap-1 overflow-x-auto">
          <TabBtn
            active={tab === 'peringkat'}
            onClick={() => setTab('peringkat')}
            icon={<Trophy className="h-4 w-4" />}
            label="Peringkat"
          />
          <TabBtn
            active={tab === 'peserta'}
            onClick={() => setTab('peserta')}
            icon={<Users className="h-4 w-4" />}
            label="Peserta"
          />
          <TabBtn
            active={tab === 'juri'}
            onClick={() => setTab('juri')}
            icon={<ListOrdered className="h-4 w-4" />}
            label="Juri"
          />
          <TabBtn
            active={tab === 'gerakan'}
            onClick={() => setTab('gerakan')}
            icon={<ClipboardList className="h-4 w-4" />}
            label="Gerakan PBB"
          />
          <TabBtn
            active={tab === 'voting'}
            onClick={() => setTab('voting')}
            icon={<Vote className="h-4 w-4" />}
            label="Voting"
          />
          <TabBtn
            active={tab === 'kelola'}
            onClick={() => setTab('kelola')}
            icon={<Lock className="h-4 w-4" />}
            label="Kelola Penilaian"
          />
          <TabBtn
            active={tab === 'juara'}
            onClick={() => setTab('juara')}
            icon={<Award className="h-4 w-4" />}
            label="Pengumuman Juara"
          />
        </div>
      </div>

      <div>
        {tab === 'peringkat' && (
          <PeringkatTab eventId={id} batasWaktuDetik={event.batas_waktu_detik} />
        )}
        {tab === 'peserta' && (
          <PesertaTab
            eventId={id}
            categories={event.categories?.length ? event.categories : ['U15', 'U19']}
            batasWaktuDetik={event.batas_waktu_detik}
          />
        )}
        {tab === 'juri' && <JuriTab eventId={id} />}
        {tab === 'gerakan' && (
          <GerakanPbbTab eventId={id} scoringTemplate={event.scoring_template} />
        )}
        {tab === 'voting' && <VotingTab eventId={id} />}
        {tab === 'kelola' && <KelolaPenilaianTab eventId={id} />}
        {tab === 'juara' && <ChampionshipAnnouncementTab eventId={id} />}
      </div>
    </div>
  );
}

function TabBtn({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 whitespace-nowrap border-b-2 px-3 py-2 text-sm font-medium transition ${
        active
          ? 'border-blue-600 text-blue-600'
          : 'border-transparent text-slate-600 hover:text-slate-900'
      }`}
    >
      {icon}
      {label}
    </button>
  );
}