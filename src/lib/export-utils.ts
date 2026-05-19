/**
 * Advanced Excel Export - Clone template approach
 * Membaca template "Lembar Penilaian..." dan clone per peserta
 */
import * as XLSX from 'xlsx';
import { promises as fs } from 'fs';
import path from 'path';

interface ExportScore {
  nomor_urut: number;
  nama_regu: string;
  juri1_scores: { [key: string]: number };
  juri2_scores: { [key: string]: number };
  juri3_scores: { [key: string]: number };
  juri1_total: number;
  juri2_total: number;
  juri3_total: number;
}

interface IndikatorPBB {
  nama_gerakan: string;
  kategori: 'pbb' | 'danton_pbb';
}

/**
 * Clone dan update sheet dengan data peserta
 */
function cloneAndUpdateSheet(
  templateWB: XLSX.WorkBook,
  peserta: ExportScore,
  indikators: IndikatorPBB[],
  eventName: string
): XLSX.WorkBook {
  const wb = XLSX.utils.book_new();

  // Clone sheet dari template
  const templateSheet = templateWB.Sheets['Nomor Urut 1'];

  // Deep copy sheet
  const newSheet: any = {};
  Object.keys(templateSheet).forEach((key) => {
    if (key.startsWith('!')) {
      // Copy sheet metadata
      if (Array.isArray(templateSheet[key])) {
        newSheet[key] = [...(templateSheet[key] as any[])];
      } else {
        newSheet[key] = templateSheet[key];
      }
    } else {
      // Copy cells
      const cell = templateSheet[key];
      newSheet[key] = JSON.parse(JSON.stringify(cell));
    }
  });

  // Update nama peserta (Row 3)
  const cellB4 = XLSX.utils.encode_cell({ r: 3, c: 1 });
  newSheet[cellB4] = { t: 's', v: peserta.nama_regu };

  // Update nomor urut (Row 2, Column G)
  const cellG3 = XLSX.utils.encode_cell({ r: 2, c: 6 });
  newSheet[cellG3] = { t: 'n', v: peserta.nomor_urut };

  // Update nilai PBB Juri 1 & 2 (Rows 8-33)
  const pbbIndicators = indikators.filter((ind) => ind.kategori === 'pbb');
  pbbIndicators.forEach((ind, idx) => {
    const rowIdx = 8 + idx;

    // Juri 1 (Column C)
    const cellC = XLSX.utils.encode_cell({ r: rowIdx, c: 2 });
    const nilai1 = peserta.juri1_scores[ind.nama_gerakan] || 0;
    newSheet[cellC] = { t: 'n', v: nilai1 };

    // Juri 2 (Column D)
    const cellD = XLSX.utils.encode_cell({ r: rowIdx, c: 3 });
    const nilai2 = peserta.juri2_scores[ind.nama_gerakan] || 0;
    newSheet[cellD] = { t: 'n', v: nilai2 };
  });

  // Update Total PBB (Row 34)
  const totalRowIdx = 34;
  const cellC34 = XLSX.utils.encode_cell({ r: totalRowIdx, c: 2 });
  newSheet[cellC34] = { t: 'n', v: peserta.juri1_total };

  const cellD34 = XLSX.utils.encode_cell({ r: totalRowIdx, c: 3 });
  newSheet[cellD34] = { t: 'n', v: peserta.juri2_total };

  // Update VarFor Total (Row 16, Column I)
  const cellI16 = XLSX.utils.encode_cell({ r: 16, c: 8 });
  newSheet[cellI16] = { t: 'n', v: peserta.juri3_total };

  XLSX.utils.book_append_sheet(wb, newSheet, `Nomor Urut ${peserta.nomor_urut}`);
  return wb;
}

/**
 * Export dengan template cloning
 */
export async function exportWithTemplateClone(
  scoresData: ExportScore[],
  eventName: string,
  indikators: IndikatorPBB[]
) {
  try {
    // Cari dan baca template file
    const templatePath = path.join(process.cwd(), 'public', 'template-lembar-penilaian.xlsx');
    const templateBuffer = await fs.readFile(templatePath);
    const templateWB = XLSX.read(templateBuffer, { cellFormula: true, cellStyles: true });

    // Create workbook baru
    const finalWB = XLSX.utils.book_new();

    // Clone dan update untuk setiap peserta
    for (const peserta of scoresData) {
      const clonedWB = cloneAndUpdateSheet(templateWB, peserta, indikators, eventName);
      const sheet = clonedWB.Sheets[clonedWB.SheetNames[0]];

      XLSX.utils.book_append_sheet(finalWB, sheet, `Nomor Urut ${peserta.nomor_urut}`);
    }

    // Tambah sheet Rekap Akhir
      const rekapData: (string | number)[][] = [['Nomor Urut', 'Nama Regu', 'Juri 1 (PBB)', 'Juri 2 (PBB)', 'Juri 3 (VarFor)']];    scoresData.forEach((score) => {
      rekapData.push([
        score.nomor_urut,
        score.nama_regu,
        score.juri1_total > 0 ? score.juri1_total : '-',
        score.juri2_total > 0 ? score.juri2_total : '-',
        score.juri3_total > 0 ? score.juri3_total : '-',
      ]);
    });

    const rekapSheet = XLSX.utils.aoa_to_sheet(rekapData);
    XLSX.utils.book_append_sheet(finalWB, rekapSheet, 'Rekap Akhir');

    const filename = `Lembar_Penilaian_${eventName}_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(finalWB, filename);
  } catch (error) {
    console.error('Export error:', error);
    throw error;
  }
}
