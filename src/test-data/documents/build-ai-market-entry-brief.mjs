/**
 * One-off generator for TC-010 upload fixture (minimal valid PDF).
 * Run: node src/test-data/documents/build-ai-market-entry-brief.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outPath = path.join(__dirname, 'ai-market-entry-brief.pdf');

const lines = [
  'AI Consulting Market Entry - Input Brief',
  '',
  'Target market: United States enterprise buyers',
  'Competitors: Big Four and boutique AI consultancies',
  'Constraints: Cloud-first delivery, partner-led GTM, FY2026 launch',
  'Success metrics: Qualified pipeline, win rate, time-to-first-deal',
];

function escapePdfText(value) {
  return value.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
}

let stream = 'BT\n/F1 11 Tf\n50 750 Td\n';
lines.forEach((line, index) => {
  if (index > 0) {
    stream += '0 -16 Td\n';
  }
  stream += `(${escapePdfText(line)}) Tj\n`;
});
stream += 'ET';

const streamObject = `<< /Length ${Buffer.byteLength(stream, 'utf8')} >>\nstream\n${stream}\nendstream`;

const parts = [
  '<< /Type /Catalog /Pages 2 0 R >>',
  '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
  '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>',
  streamObject,
  '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
];

let pdf = '%PDF-1.4\n';
const offsets = [0];

for (let i = 0; i < parts.length; i++) {
  offsets.push(Buffer.byteLength(pdf, 'utf8'));
  pdf += `${i + 1} 0 obj\n${parts[i]}\nendobj\n`;
}

const xrefOffset = Buffer.byteLength(pdf, 'utf8');
pdf += `xref\n0 ${parts.length + 1}\n0000000000 65535 f \n`;
for (let i = 1; i <= parts.length; i++) {
  pdf += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
}
pdf += `trailer\n<< /Size ${parts.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;

fs.writeFileSync(outPath, pdf);
console.log(`Wrote ${outPath} (${pdf.length} bytes)`);
