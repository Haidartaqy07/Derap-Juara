'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Lock, Unlock, CheckCircle2, Circle, Download } from 'lucide-react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

type StatusRow = {
  peserta_id: string;
  nama_regu: string;
  nomor_urut: number;
  juri1_id: string | null;
  juri1_submitted: boolean;
  juri1_locked: boolean;
  juri2_id: string | null;
  juri2_submitted: boolean;
  juri2_locked: boolean;
  juri3_id: string | null;
  juri3_submitted: boolean;
  juri3_locked: boolean;
};

interface ScoreData {
  peserta_id: string;
  nama_regu: string;
  nomor_urut: number;
  juri1_scores: { [key: string]: number };
  juri2_scores: { [key: string]: number };
  juri3_scores: { [key: string]: number };
  juri1_total: number;
  juri2_total: number;
  juri3_total: number;
}

export default function KelolaPenilaianTab({ eventId }: { eventId: string }) {
  const [rows, setRows] = useState<StatusRow[]>([]);
  const [scoresData, setScoresData] = useState<ScoreData[]>([]);
  const [loading, setLoading] = useState(true);
  const [eventName, setEventName] = useState('');

  const load = useCallback(async () => {
    const supabase = createClient();

    // Fetch event name
    const { data: event } = await supabase
      .from('events')
      .select('nama_event')
      .eq('id', eventId)
      .single();

    if (event) setEventName(event.nama_event);

    const { data: peserta } = await supabase
      .from('peserta')
      .select('*')
      .eq('event_id', eventId)
      .order('nomor_urut');

    if (!peserta) {
      setRows([]);
      setScoresData([]);
      setLoading(false);
      return;
    }

    const pesertaIds = peserta.map((p) => p.id);

    const { data: pbb } = await supabase
      .from('penilaian_pbb')
      .select('*')
      .in('peserta_id', pesertaIds);

    const { data: varfor } = await supabase
      .from('penilaian_varfor')
      .select('*')
      .in('peserta_id', pesertaIds);

    // Fetch detail scores
    const { data: pbbDetails } = await supabase
      .from('nilai_detail_pbb')
      .select('*')
      .in('penilaian_id', pbb?.map((p) => p.id) || []);

    const { data: varforDetails } = await supabase
      .from('nilai_detail_varfor')
      .select('*')
      .in('penilaian_id', varfor?.map((p) => p.id) || []);

    // Fetch indikators for labels
    const { data: indikators } = await supabase
      .from('indikator_pbb')
      .select('*')
      .eq('event_id', eventId);

    const result: StatusRow[] = peserta.map((p) => {
      const j1 = pbb?.find((x) => x.peserta_id === p.id && x.tipe_juri === 'juri1');
      const j2 = pbb?.find((x) => x.peserta_id === p.id && x.tipe_juri === 'juri2');
      const j3 = varfor?.find((x) => x.peserta_id === p.id);
      return {
        peserta_id: p.id,
        nama_regu: p.nama_regu,
        nomor_urut: p.nomor_urut,
        juri1_id: j1?.id ?? null,
        juri1_submitted: j1?.is_submitted ?? false,
        juri1_locked: j1?.is_locked ?? false,
        juri2_id: j2?.id ?? null,
        juri2_submitted: j2?.is_submitted ?? false,
        juri2_locked: j2?.is_locked ?? false,
        juri3_id: j3?.id ?? null,
        juri3_submitted: j3?.is_submitted ?? false,
        juri3_locked: j3?.is_locked ?? false,
      };
    });

    // Build scores data for export
    const scores: ScoreData[] = peserta.map((p) => {
      const j1 = pbb?.find((x) => x.peserta_id === p.id && x.tipe_juri === 'juri1');
      const j2 = pbb?.find((x) => x.peserta_id === p.id && x.tipe_juri === 'juri2');
      const j3 = varfor?.find((x) => x.peserta_id === p.id);

      const juri1_scores: { [key: string]: number } = {};
      const juri2_scores: { [key: string]: number } = {};
      const juri3_scores: { [key: string]: number } = {};
      let juri1_total = 0;
      let juri2_total = 0;
      let juri3_total = 0;

      if (j1) {
        pbbDetails?.forEach((d) => {
          if (d.penilaian_id === j1.id) {
            const indicator = indikators?.find((i) => i.id === d.indikator_id);
            if (indicator) {
              juri1_scores[indicator.nama_gerakan] = d.nilai;
              juri1_total += d.nilai;
            }
          }
        });
      }

      if (j2) {
        pbbDetails?.forEach((d) => {
          if (d.penilaian_id === j2.id) {
            const indicator = indikators?.find((i) => i.id === d.indikator_id);
            if (indicator) {
              juri2_scores[indicator.nama_gerakan] = d.nilai;
              juri2_total += d.nilai;
            }
          }
        });
      }

      if (j3) {
        varforDetails?.forEach((d) => {
          if (d.penilaian_id === j3.id) {
            juri3_scores[d.kode_indikator] = d.nilai;
            juri3_total += d.nilai;
          }
        });
      }

      return {
        peserta_id: p.id,
        nama_regu: p.nama_regu,
        nomor_urut: p.nomor_urut,
        juri1_scores,
        juri2_scores,
        juri3_scores,
        juri1_total,
        juri2_total,
        juri3_total,
      };
    });

    setRows(result);
    setScoresData(scores);
    setLoading(false);
  }, [eventId]);

  useEffect(() => {
    load();
  }, [load]);

  async function toggleLock(
    table: 'penilaian_pbb' | 'penilaian_varfor',
    id: string,
    currentLocked: boolean
  ) {
    if (currentLocked && !confirm('Buka kunci penilaian? Juri akan bisa edit nilainya kembali.')) return;

    const supabase = createClient();
    const { error } = await supabase.from(table).update({ is_locked: !currentLocked }).eq('id', id);

    if (error) alert('Gagal: ' + error.message);
    await load();
  }

  async function exportToExcel() {
    if (scoresData.length === 0) {
      alert('Tidak ada data untuk diexport');
      return;
    }

    const supabase = createClient();
    const { data: indikators } = await supabase
      .from('indikator_pbb')
      .select('*')
      .eq('event_id', eventId)
      .order('urutan');

    const workbook = XLSX.utils.book_new();

    // Buat sheet untuk setiap peserta
    for (const score of scoresData) {
      const data: any[] = [];

      // Row 0: Header
      data.push(['Lembar Penilaian', '', '', '', '', '', 'Lembar Penilaian LOBB ANASHERA PART III 2026', '', '', '', eventName]);

      // Row 1: Empty
      data.push([]);

      // Row 2: Info Peserta
      data.push(['Nama Satuan/Club', '', '', '', '', '', 'Nomor Urut', '', '', '', 'Waktu']);

      // Row 3: Data Peserta
      data.push(['', score.nama_regu, '', '', '', '', score.nomor_urut, '', '', '', '']);

      // Row 4: Empty
      data.push([]);

      // Row 5: PBB Header
      data.push(['PBB', '', '', '', '', '', 'No', 'Indikator Penilaian', 'Nilai', '', '']);

      // Row 6: Column headers
      data.push(['No', 'Materi Penilaian', 'Nilai', '', 'Jumlah', '', 'VARIASI', '', '', '', 'PENGURANG']);

      // Row 7: Juri columns
      data.push(['', '', 'Juri 1', 'Juri 2', '', '', '1', 'Opening', '', '', 'No']);

      // Row 8+: PBB Gerakan
      const pbbGerakan = indikators?.filter((ind) => ind.kategori === 'pbb') || [];
      pbbGerakan.forEach((ind, idx) => {
        data.push([
          idx + 1,
          ind.nama_gerakan,
          score.juri1_scores[ind.nama_gerakan] || '',
          score.juri2_scores[ind.nama_gerakan] || '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
        ]);
      });

      // Total PBB row
      data.push([
        'Total',
        '',
        score.juri1_total || 0,
        score.juri2_total || 0,
        '',
        '',
        'TOTAL',
        '',
        score.juri3_total || 0,
        '',
        '',
      ]);

      // Add VarFor section header
      const varforRowStart = data.length + 1;
      data.push([]);
      data.push(['VARIASI FORMASI & DANTON PENAMPILAN']);

      // Add DANPAS section
      data.push(['']);
      data.push(['DANPAS PBB', '', '', '', '', '', '', '', '', '', '']);
      data.push(['No', 'Materi Penilaian', 'Nilai', '', 'Jumlah', '', 'No', 'Indikator Penilaian', 'Nilai', '', 'Total']);
      data.push(['', '', 'Juri 1', 'Juri 2', '', '', '', '', '', '', '']);

      // DANPAS items
      const danpasItems = ['Sikap Badan', 'Volume Suara', 'Artikulasi/Intonasi Suara', 'Penguasaan Materi', 'Penguasaan Pasukan', 'Penguasaan Lapangan'];
      danpasItems.forEach((item, idx) => {
        data.push([idx + 1, item, '', '', '', '', '', '', '', '', '']);
      });

      // DANPAS Total
      data.push(['Total', '', 0, 0, '', '', '', '', '', '', '']);

      const ws = XLSX.utils.aoa_to_sheet(data);

      // Set column widths
      ws['!cols'] = [
        { wch: 5 },  // A
        { wch: 30 }, // B
        { wch: 10 }, // C
        { wch: 10 }, // D
        { wch: 10 }, // E
        { wch: 5 },  // F
        { wch: 15 }, // G
        { wch: 25 }, // H
        { wch: 10 }, // I
        { wch: 5 },  // J
        { wch: 15 }, // K
      ];

      XLSX.utils.book_append_sheet(workbook, ws, `Nomor Urut ${score.nomor_urut}`);
    }

    // Sheet Rekap Akhir
    const rekapData: any[] = [['Nomor Urut', 'Nama Regu', 'Juri 1 (PBB)', 'Juri 2 (PBB)', 'Juri 3 (VarFor)']];
    scoresData.forEach((score) => {
      rekapData.push([
        score.nomor_urut,
        score.nama_regu,
        score.juri1_total > 0 ? score.juri1_total : '-',
        score.juri2_total > 0 ? score.juri2_total : '-',
        score.juri3_total > 0 ? score.juri3_total : '-',
      ]);
    });

    const rekapSheet = XLSX.utils.aoa_to_sheet(rekapData);
    XLSX.utils.book_append_sheet(workbook, rekapSheet, 'Rekap Akhir');

    const filename = `Lembar_Penilaian_${eventName}_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(workbook, filename);
  }

  async function exportToPDF() {
    if (scoresData.length === 0) {
      alert('Tidak ada data untuk diexport');
      return;
    }

    const supabase = createClient();
    const { data: indikators } = await supabase
      .from('indikator_pbb')
      .select('*')
      .eq('event_id', eventId)
      .order('urutan');

    const pdf = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4',
    });

    const pbbGerakan = indikators?.filter((ind) => ind.kategori === 'pbb') || [];
    const dantonGerakan = indikators?.filter((ind) => ind.kategori === 'danton_pbb') || [];

    let pageNum = 0;

    for (const score of scoresData) {
      if (pageNum > 0) {
        pdf.addPage();
      }

      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      let yPos = 10;

      // Header
      pdf.setFontSize(14);
      pdf.setFont('Helvetica', 'bold');
      pdf.text('Lembar Penilaian', pageWidth / 2, yPos, { align: 'center' });
      yPos += 5;

      pdf.setFontSize(11);
      pdf.text('LOBB ANASHERA PART III 2026', pageWidth / 2, yPos, { align: 'center' });
      yPos += 5;

      pdf.setFontSize(10);
      pdf.text(eventName, pageWidth / 2, yPos, { align: 'center' });
      yPos += 8;

      // Info Peserta
      pdf.setFont('Helvetica', 'normal');
      pdf.setFontSize(9);
      pdf.text(`Nama Satuan/Club: ${score.nama_regu}`, 15, yPos);
      pdf.text(`Nomor Urut: ${score.nomor_urut}`, 130, yPos);
      pdf.text(`Waktu: `, 220, yPos);
      yPos += 6;

      // ===== TABLE PBB =====
      const pbbTableData: any[] = [];

      // Header row
      const pbbHeaders: any[] = [['No', 'Materi Penilaian', 'Juri 1', 'Juri 2', 'Jumlah']];

      // Data rows
      pbbGerakan.forEach((ind, idx) => {
        const nilai1 = score.juri1_scores[ind.nama_gerakan] || 0;
        const nilai2 = score.juri2_scores[ind.nama_gerakan] || 0;
        pbbTableData.push([
          idx + 1,
          ind.nama_gerakan,
          nilai1,
          nilai2,
          '',
        ]);
      });

      // Total row
      pbbTableData.push([
        'Total',
        '',
        score.juri1_total || 0,
        score.juri2_total || 0,
        '',
      ]);

      autoTable(pdf, {
        head: pbbHeaders,
        body: pbbTableData,
        startY: yPos,
        margin: 15,
        theme: 'grid',
        styles: {
          fontSize: 8,
          cellPadding: 3,
          lineColor: 0,
          lineWidth: 0.3,
        },
        headStyles: {
          fillColor: [180, 180, 180],
          textColor: 0,
          fontStyle: 'bold',
          lineColor: 0,
          lineWidth: 0.3,
        },
        bodyStyles: {
          lineColor: 0,
          lineWidth: 0.3,
        },
        didDrawPage: function (data) {
          // Tidak perlu karena kita manage manually
        },
      });

      // Add label PBB
      pdf.setFontSize(10);
      pdf.setFont('Helvetica', 'bold');
      pdf.text('PBB', 15, yPos - 2);

      yPos = (pdf as any).lastAutoTable?.finalY + 5 || yPos + 60;

      // ===== TABLE DANPAS PBB =====
      const danpasTableData: any[] = [];

      dantonGerakan.forEach((ind, idx) => {
        danpasTableData.push([
          idx + 1,
          ind.nama_gerakan,
          '',
          '',
          '',
        ]);
      });

      danpasTableData.push([
        'Total',
        '',
        0,
        0,
        '',
      ]);

      pdf.setFontSize(10);
      pdf.setFont('Helvetica', 'bold');
      pdf.text('DANPAS PBB', 15, yPos);
      yPos += 5;

      autoTable(pdf, {
        head: [['No', 'Materi Penilaian', 'Juri 1', 'Juri 2', 'Jumlah']],
        body: danpasTableData,
        startY: yPos,
        margin: 15,
        theme: 'grid',
        styles: {
          fontSize: 8,
          cellPadding: 3,
          lineColor: 0,
          lineWidth: 0.3,
        },
        headStyles: {
          fillColor: [180, 180, 180],
          textColor: 0,
          fontStyle: 'bold',
          lineColor: 0,
          lineWidth: 0.3,
        },
        bodyStyles: {
          lineColor: 0,
          lineWidth: 0.3,
        },
      });

      yPos = (pdf as any).lastAutoTable?.finalY + 8 || yPos + 40;

      // ===== VARIASI FORMASI SECTION =====
      pdf.setFontSize(10);
      pdf.setFont('Helvetica', 'bold');
      pdf.text('VARIASI FORMASI & DANTON', 15, yPos);
      yPos += 5;

      const varforTableData = [
        ['Opening', score.juri3_scores['V1'] || 0],
        ['Kualitas Gerakan', score.juri3_scores['V2'] || 0],
        ['Ragam Gerak', score.juri3_scores['V3'] || 0],
        ['Unsur PBB', score.juri3_scores['V4'] || 0],
        ['Konsep & Kreativitas', score.juri3_scores['V5'] || 0],
        ['Jelajah Lapangan', score.juri3_scores['V6'] || 0],
        ['Etika & Estetika', score.juri3_scores['V7'] || 0],
        ['Ending Variasi', score.juri3_scores['V8'] || 0],
        ['TOTAL VARIASI', score.juri3_total || 0],
      ];

      autoTable(pdf, {
        head: [['Indikator', 'Nilai']],
        body: varforTableData,
        startY: yPos,
        margin: 15,
        theme: 'grid',
        styles: {
          fontSize: 8,
          cellPadding: 3,
          lineColor: 0,
          lineWidth: 0.3,
        },
        headStyles: {
          fillColor: [180, 180, 180],
          textColor: 0,
          fontStyle: 'bold',
        },
        bodyStyles: {
          lineColor: 0,
          lineWidth: 0.3,
        },
        columnStyles: {
          0: { halign: 'left' },
          1: { halign: 'center' },
        },
      });

      yPos = (pdf as any).lastAutoTable?.finalY + 5;

      // ===== DANTON SECTION =====
      yPos += 3;
      pdf.setFontSize(10);
      pdf.setFont('Helvetica', 'bold');
      pdf.text('PENILAIAN DANTON SAAT VARIASI & FORMASI', 15, yPos);
      yPos += 5;

      const dantonTableData = [
        ['Aba-Aba Variasi', score.juri3_scores['D1'] || 0],
        ['Aba-Aba Formasi', score.juri3_scores['D2'] || 0],
        ['Aba-Aba Tutup Formasi', score.juri3_scores['D3'] || 0],
        ['Artikulasi & Intonasi', score.juri3_scores['D4'] || 0],
        ['Penampilan & Penghayatan', score.juri3_scores['D5'] || 0],
        ['Sinergi dengan Pasukan', score.juri3_scores['D6'] || 0],
      ];

      autoTable(pdf, {
        head: [['Indikator', 'Nilai']],
        body: dantonTableData,
        startY: yPos,
        margin: 15,
        theme: 'grid',
        styles: {
          fontSize: 8,
          cellPadding: 3,
          lineColor: 0,
          lineWidth: 0.3,
        },
        headStyles: {
          fillColor: [180, 180, 180],
          textColor: 0,
          fontStyle: 'bold',
        },
        bodyStyles: {
          lineColor: 0,
          lineWidth: 0.3,
        },
        columnStyles: {
          0: { halign: 'left' },
          1: { halign: 'center' },
        },
      });

      // Add footer with page number
      pdf.setFontSize(8);
      pdf.setFont('Helvetica', 'normal');
      pdf.text(`Tanggal: ${new Date().toLocaleDateString('id-ID')}`, 15, pageHeight - 10);
      pdf.text(`Halaman ${pageNum + 1}`, pageWidth - 25, pageHeight - 10);

      pageNum++;
    }

    const filename = `Lembar_Penilaian_${eventName}_${new Date().toISOString().split('T')[0]}.pdf`;
    pdf.save(filename);
  }

  if (loading) return <p className="text-slate-600">Memuat...</p>;

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
        <p className="font-medium">Buka kunci untuk revisi</p>
        <p className="mt-1 text-amber-800">
          Setelah juri klik submit, nilai akan terkunci otomatis. Buka kunci di sini jika ada juri
          yang perlu merevisi nilainya.
        </p>
      </div>

      <div className="flex gap-2">
        {/* <button
          onClick={exportToExcel}
          className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 transition"
        >
          <Download className="h-4 w-4" />
          Export Excel
        </button> */}
        <button
          onClick={exportToPDF}
          className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 transition"
        >
          <Download className="h-4 w-4" />
          Export PDF
        </button>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <table id="penilaian-table" className="w-full">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600">No</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600">Regu</th>
              <th className="px-3 py-2 text-center text-xs font-semibold text-slate-600">
                Juri 1 (PBB)
              </th>
              <th className="px-3 py-2 text-center text-xs font-semibold text-slate-600">
                Juri 2 (PBB)
              </th>
              <th className="px-3 py-2 text-center text-xs font-semibold text-slate-600">
                Juri 3 (VarFor)
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {rows.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-sm text-slate-500">
                  Belum ada peserta
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r.peserta_id}>
                  <td className="px-3 py-3 font-mono text-sm">#{r.nomor_urut}</td>
                  <td className="px-3 py-3 text-sm font-medium">{r.nama_regu}</td>
                  <StatusCell
                    submitted={r.juri1_submitted}
                    locked={r.juri1_locked}
                    onToggle={
                      r.juri1_id
                        ? () => toggleLock('penilaian_pbb', r.juri1_id!, r.juri1_locked)
                        : undefined
                    }
                  />
                  <StatusCell
                    submitted={r.juri2_submitted}
                    locked={r.juri2_locked}
                    onToggle={
                      r.juri2_id
                        ? () => toggleLock('penilaian_pbb', r.juri2_id!, r.juri2_locked)
                        : undefined
                    }
                  />
                  <StatusCell
                    submitted={r.juri3_submitted}
                    locked={r.juri3_locked}
                    onToggle={
                      r.juri3_id
                        ? () => toggleLock('penilaian_varfor', r.juri3_id!, r.juri3_locked)
                        : undefined
                    }
                  />
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StatusCell({
  submitted,
  locked,
  onToggle,
}: {
  submitted: boolean;
  locked: boolean;
  onToggle?: () => void;
}) {
  if (!submitted) {
    return (
      <td className="px-3 py-3 text-center">
        <span className="inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs text-slate-500">
          <Circle className="h-3 w-3" />
          Belum
        </span>
      </td>
    );
  }
  return (
    <td className="px-3 py-3 text-center">
      <div className="flex flex-col items-center gap-1">
        <span className="inline-flex items-center gap-1 rounded bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
          <CheckCircle2 className="h-3 w-3" />
          Submitted
        </span>
        {onToggle && (
          <button
            onClick={onToggle}
            className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs font-medium transition ${
              locked
                ? 'bg-red-100 text-red-700 hover:bg-red-200'
                : 'bg-amber-100 text-amber-700 hover:bg-amber-200'
            }`}
          >
            {locked ? (
              <>
                <Lock className="h-3 w-3" />
                Terkunci • Buka
              </>
            ) : (
              <>
                <Unlock className="h-3 w-3" />
                Terbuka
              </>
            )}
          </button>
        )}
      </div>
    </td>
  );
}
