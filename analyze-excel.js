const XLSX = require('xlsx');
const wb = XLSX.readFile('Lembar Penilaian LOBB ANASHERA PART III 2026.xlsx');

console.log('=== SHEET NAMES ===');
console.log(wb.SheetNames);

wb.SheetNames.forEach((sheet, idx) => {
  const ws = wb.Sheets[sheet];
  const data = XLSX.utils.sheet_to_json(ws);
  
  console.log(`\n=== SHEET ${idx + 1}: ${sheet} ===`);
  console.log(`Rows: ${data.length}`);
  
  if(data.length > 0) {
    console.log(`Columns: ${JSON.stringify(Object.keys(data[0]))}`);
    console.log(`\nFirst 2 rows:`);
    console.log(JSON.stringify(data.slice(0, 2), null, 2));
  }
});
