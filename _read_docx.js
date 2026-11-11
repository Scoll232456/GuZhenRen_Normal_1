const fs = require('fs');
const zlib = require('zlib');
const path = require('path');

const docxPath = "F:\\DS-HarnessDisplay\\《蛊真人》游戏策划\\《蛊真人》总策划案\\游戏的基础框架\\小说设定——数值基础.docx";

// docx is a zip. We'll read the raw bytes and extract document.xml manually is complex.
// Instead, just read as buffer and try to find XML content via a simple zip parser using zlib inflateRaw.
const buf = fs.readFileSync(docxPath);

// Minimal ZIP central directory parser
function findEndOfCentralDirectory(b) {
  for (let i = b.length - 22; i >= 0; i--) {
    if (b.readUInt32LE(i) === 0x06054b50) {
      return i;
    }
  }
  return -1;
}

const eocd = findEndOfCentralDirectory(buf);
if (eocd < 0) {
  console.log("NOT A ZIP");
  process.exit(1);
}

const totalEntries = buf.readUInt16LE(eocd + 10);
const cdOffset = buf.readUInt32LE(eocd + 16);

let entries = [];
let p = cdOffset;
for (let i = 0; i < totalEntries; i++) {
  if (buf.readUInt32LE(p) !== 0x02014b50) break;
  const method = buf.readUInt16LE(p + 10);
  const compSize = buf.readUInt32LE(p + 20);
  const nameLen = buf.readUInt16LE(p + 28);
  const extraLen = buf.readUInt16LE(p + 30);
  const commentLen = buf.readUInt16LE(p + 32);
  const localHeaderOffset = buf.readUInt32LE(p + 42);
  const name = buf.slice(p + 46, p + 46 + nameLen).toString('utf8');

  // read local header to get actual data offset
  const lhNameLen = buf.readUInt16LE(localHeaderOffset + 26);
  const lhExtraLen = buf.readUInt16LE(localHeaderOffset + 28);
  const dataStart = localHeaderOffset + 30 + lhNameLen + lhExtraLen;
  const compData = buf.slice(dataStart, dataStart + compSize);

  entries.push({ name, method, compData });
  p += 46 + nameLen + extraLen + commentLen;
}

// Extract document.xml and word/_rels/document.xml.rels
function getEntry(name) {
  return entries.find(e => e.name === name);
}

function inflate(e) {
  if (e.method === 0) return e.compData; // stored
  return zlib.inflateRawSync(e.compData);
}

const docEntry = getEntry('word/document.xml');
if (!docEntry) {
  console.log("NO document.xml. entries:");
  entries.forEach(e => console.log(e.name));
  process.exit(1);
}

const xml = inflate(docEntry).toString('utf8');

// Parse paragraphs: <w:p> ... </w:p>
// Extract text from <w:t> tags
const paras = xml.split(/<w:p[ >]/).slice(1);
const lines = [];
for (const para of paras) {
  const textMatch = para.match(/<w:t[^>]*>([\s\S]*?)<\/w:t>/g);
  if (textMatch) {
    let line = '';
    for (const t of textMatch) {
      const m = t.match(/<w:t[^>]*>([\s\S]*?)<\/w:t>/);
      if (m) line += m[1];
    }
    lines.push(line);
  }
}

// Also decode tables
const tables = xml.split(/<w:tbl>/).slice(1);
console.log("=== 段落 ===");
lines.forEach((l, i) => { if (l.trim()) console.log(l); });

console.log("\n=== 表格 ===");
tables.forEach((tbl, ti) => {
  const rows = tbl.split(/<w:tr[ >]/).slice(1);
  console.log(`\n--- 表 ${ti} ---`);
  rows.forEach(r => {
    const cells = r.split(/<w:tc[ >]/).slice(1);
    const cellTexts = cells.map(c => {
      const tm = c.match(/<w:t[^>]*>([\s\S]*?)<\/w:t>/g);
      if (!tm) return '';
      let s = '';
      for (const t of tm) {
        const m = t.match(/<w:t[^>]*>([\s\S]*?)<\/w:t>/);
        if (m) s += m[1];
      }
      return s.trim();
    });
    console.log(cellTexts.join(' | '));
  });
});
