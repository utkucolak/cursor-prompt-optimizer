/**
 * One JSONL (50 rows): ids 1–15 Turkish, 16–30 Arabic, 31–50 Chinese.
 * Source: first 50 rows of OckBench_coding.jsonl — only `problem` changes.
 *
 * Run: node scripts/build-i18n-50-jsonl.cjs
 */

const fs = require("fs");
const path = require("path");
const { problemTr } = require("./i18n50-tr.cjs");
const { problemAr } = require("./i18n50-ar.cjs");
const { problemZh } = require("./i18n50-zh.cjs");

const root = path.join(__dirname, "..");
const inputPath = path.join(root, "OckBench_coding.jsonl");
const outPath = path.join(root, "data", "OckBench_coding_mixed_tr_ar_zh_50.jsonl");

function problemForId(id) {
  if (id <= 15) return problemTr(id);
  if (id <= 30) return problemAr(id);
  return problemZh(id);
}

function main() {
  const raw = fs.readFileSync(inputPath, "utf8");
  const lines = raw.split(/\r?\n/).filter((l) => l.trim().length > 0).slice(0, 50);
  if (lines.length < 50) {
    throw new Error(`Need 50 source rows, got ${lines.length}`);
  }

  const outDir = path.join(root, "data");
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  const out = fs.createWriteStream(outPath, { encoding: "utf8" });
  for (let i = 0; i < 50; i++) {
    const row = JSON.parse(lines[i]);
    const id = row.id;
    if (typeof id !== "number") {
      throw new Error(`Row ${i + 1}: missing numeric id`);
    }
    row.problem = problemForId(id);
    out.write(`${JSON.stringify(row)}\n`);
  }
  out.end();

  // eslint-disable-next-line no-console
  console.log(`Wrote ${outPath} (TR: id 1–15, AR: 16–30, ZH: 31–50)`);
}

main();
