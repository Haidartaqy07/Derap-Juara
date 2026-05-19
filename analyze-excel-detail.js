const XLSX = require('xlsx');
const wb = XLSX.readFile('Lembar Penilaian LOBB ANASHERA PART III 2026.xlsx');

// Analisis struktur detail sheet pertama
const ws = wb.Sheets['Nomor Urut 1'];

console.log('=== RAW DATA (All Cells) ===');
const range = XLSX.utils.decode_range(ws['!ref']);
console.log('Range:', ws['!ref']);

// Print row by row
for(let R = range.s.r; R <= Math.min(range.e.r, 50); R++) {
  let row = [];
  for(let C = range.s.c; C <= Math.min(range.e.c, 10); C++) {
    const cellAddress = XLSX.utils.encode_cell({r: R, c: C});
    const cell = ws[cellAddress];
    row.push(cell ? cell.v : '');
  }
  console.log(`Row ${R}:`, row.join(' | '));
}

console.log('\n=== MERGED CELLS ===');
if(ws['!merges']) {
  console.log(ws['!merges']);
}

console.log('\n=== COLUMN WIDTHS ===');
if(ws['!cols']) {
  console.log(ws['!cols']);
}
