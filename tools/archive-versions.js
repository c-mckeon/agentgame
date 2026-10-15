// Saves every tagged game version into a local folder OUTSIDE the repo:
//   node tools/archive-versions.js <archiveDir>
//
//   <archiveDir>/index.html               redirects to versions/
//   <archiveDir>/versions/index.html      list of every saved version
//   <archiveDir>/versions/<tag>/          a full, playable copy of that version
//
// Additive: versions already in the archive are never touched or deleted, even if
// the tag later disappears from git. Serve it with: node tools/serve.js 8081 <archiveDir>

import { existsSync, readdirSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { listTags, extractTag, versionsPage } from "./versions-lib.js";

if (!process.argv[2]) {
  console.error("Usage: node tools/archive-versions.js <archiveDir>");
  process.exit(1);
}
const archive = resolve(process.argv[2]);
const dir = join(archive, "versions");
mkdirSync(dir, { recursive: true });

let added = 0;
for (const tag of listTags()) {
  if (existsSync(join(dir, tag, "version.json"))) continue;
  extractTag(tag, join(dir, tag));
  console.log(`saved ${tag}`);
  added += 1;
}

// Index from what's on disk (newest first), so removed tags stay listed.
const saved = readdirSync(dir, { withFileTypes: true })
  .filter((d) => d.isDirectory() && existsSync(join(dir, d.name, "version.json")))
  .map((d) => ({ tag: d.name, ...JSON.parse(readFileSync(join(dir, d.name, "version.json"), "utf8")) }))
  .sort((a, b) => (b.date ?? "").localeCompare(a.date ?? "") || b.tag.localeCompare(a.tag));

writeFileSync(join(dir, "index.html"), versionsPage(saved, { backHref: "" }));
writeFileSync(join(archive, "index.html"), `<!doctype html><meta http-equiv="refresh" content="0; url=versions/">`);
console.log(`Archive ${archive}: ${saved.length} version(s), ${added} new`);
