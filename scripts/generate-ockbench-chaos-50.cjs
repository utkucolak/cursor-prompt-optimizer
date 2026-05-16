/**
 * Reads OckBench_coding.jsonl, first 50 rows; rewrites only `problem` in a casual,
 * daily-life tone (sometimes Turkish, please/thanks, small grammar slips).
 * id / answer / metadata unchanged.
 *
 * Run: node scripts/generate-ockbench-chaos-50.cjs
 */

const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const inputPath = path.join(root, "OckBench_coding.jsonl");
const outDir = path.join(root, "data");
const outputPath = path.join(outDir, "OckBench_coding_chaos_50.jsonl");

/** Light informal rephrase; keeps the same technical sentence mostly intact. */
function softRewrite(t, i) {
  let s = t.trim();
  if (!s) return s;

  const lowerFirst = (str) =>
    str.length > 0 ? str.charAt(0).toLowerCase() + str.slice(1) : str;

  if (/^Write a python function to /i.test(s)) {
    const rest = s.replace(/^Write a python function to /i, "");
    const a = `write a python function to ${lowerFirst(rest)}`;
    const b = `i need a python function to ${lowerFirst(rest)}`;
    const c = `could you please write a python function to ${lowerFirst(rest)}`;
    return [a, b, c][i % 3];
  }
  if (/^Write a python function /i.test(s)) {
    return lowerFirst(s.replace(/^Write /, "write "));
  }
  if (/^Write a function to /i.test(s)) {
    const rest = s.replace(/^Write a function to /i, "");
    const a = `write a function to ${lowerFirst(rest)}`;
    const b = `need a function to ${lowerFirst(rest)}`;
    const c = `please write a function to ${lowerFirst(rest)}`;
    return [a, b, c][i % 3];
  }
  if (/^Write a function /i.test(s)) {
    return lowerFirst(s.replace(/^Write /, "write "));
  }
  if (i % 4 === 0) return lowerFirst(s);
  return s;
}

/** One or two short lines; sounds like a real message, not a spec template. */
function chaosify(core, i) {
  const body = softRewrite(core, i);
  const styles = [
    () => `Merhaba, ${body} Teşekkürler.`,
    () => `Hey, ${body} thanks a lot.`,
    () => `So can you do this: ${body} thanks.`,
    () => `${body} if you have time, thanks.`,
    () => `So um, ${body} pls.`,
    () => `Could you help me: ${body} ? thanks!!`,
    () => `Merhaba yani şöyle diyim, ${body} olur mu teşekkürler.`,
    () => `${body} i would really appreciate it thank you.`,
    () => `Hi, ${body} please and thank you.`,
    () => `${body} thx (sorry if dumb question).`,
    () => `Btw ${body} thanks!!`,
    () => `I kinda stuck, ${body} please help thanks.`
  ];
  const pick = styles[i % styles.length]();
  // Occasional tiny grammar slip in filler only (not touching the task clause).
  if (i % 7 === 0) {
    return pick.replace("i would", "i wuld").replace("I kinda stuck", "I kinda stucked");
  }
  if (i % 11 === 0) {
    return pick.replace("thanks", "thank you").replace("pls", "plz");
  }
  return pick;
}

function main() {
  const raw = fs.readFileSync(inputPath, "utf8");
  const lines = raw.split(/\r?\n/).filter((line) => line.trim().length > 0);
  if (lines.length < 50) {
    throw new Error(`Expected at least 50 lines in ${inputPath}, got ${lines.length}`);
  }

  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  const out = fs.createWriteStream(outputPath, { encoding: "utf8" });
  for (let i = 0; i < 50; i++) {
    const row = JSON.parse(lines[i]);
    const originalProblem = row.problem;
    if (typeof originalProblem !== "string") {
      throw new Error(`Line ${i + 1}: missing string problem`);
    }
    row.problem = chaosify(originalProblem, i);
    out.write(`${JSON.stringify(row)}\n`);
  }
  out.end();

  // eslint-disable-next-line no-console
  console.log(`Wrote ${outputPath}`);
}

main();
