#!/usr/bin/env node
/**
 * fetch-media.mjs — downloads every asset listed in content/media.json off the
 * Canva CDN and writes it to the exact local path that content/site.json expects.
 *
 *   node scripts/fetch-media.mjs            # skip anything already downloaded
 *   node scripts/fetch-media.mjs --force    # re-download everything
 *
 * Run this while the Canva site is still published. Once it's done, nothing on
 * the site points at Canva any more.
 */
import { mkdirSync, writeFileSync, existsSync, statSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const { base, files } = JSON.parse(readFileSync(join(ROOT, "content/media.json"), "utf8"));
const force = process.argv.includes("--force");

const kb = (n) => (n < 1024 * 1024 ? `${Math.round(n / 1024)} KB` : `${(n / 1024 / 1024).toFixed(1)} MB`);
const pad = (s, n) => s.padEnd(n, " ");

let ok = 0, skipped = 0, failed = [];

console.log(`\nDownloading ${files.length} files from ${base}\n`);

for (const f of files) {
  const dest = join(ROOT, f.to);

  if (!force && existsSync(dest) && statSync(dest).size > 0) {
    console.log(`  skip   ${pad(f.to, 38)} already here`);
    skipped++;
    continue;
  }

  try {
    const res = await fetch(`${base}/${f.from}`, {
      headers: { "User-Agent": "Mozilla/5.0", Referer: "https://pallaviverma.my.canva.site/" },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length === 0) throw new Error("empty response");

    mkdirSync(dirname(dest), { recursive: true });
    writeFileSync(dest, buf);
    console.log(`  ok     ${pad(f.to, 38)} ${kb(buf.length)}`);
    ok++;
  } catch (err) {
    console.log(`  FAIL   ${pad(f.to, 38)} ${err.message}`);
    failed.push({ ...f, err: err.message });
  }
}

console.log(`\n${ok} downloaded · ${skipped} already present · ${failed.length} failed`);

if (failed.length) {
  console.log(`\nThese did not come down:`);
  for (const f of failed) console.log(`  ${base}/${f.from}  ->  ${f.to}   (${f.err})`);
  console.log(
    `\nIf they 403 or 404, the Canva site was probably unpublished. Export the\n` +
      `originals from Canva instead and save them to the paths above.`
  );
  process.exit(1);
}

console.log(`\nAll media is local. Next: node scripts/build.mjs\n`);
