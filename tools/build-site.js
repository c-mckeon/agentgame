// Builds the public website: node tools/build-site.js [outDir]
//
//   <out>/                  the current game (this checkout)
//   <out>/versions/         index page listing every past version
//   <out>/versions/<tag>/   a full, playable copy of the game at that git tag
//
// Run with full history (fetch-depth: 0 in CI) so every tag is available.

import { cpSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { root, git, listTags, extractTag, versionsPage } from "./versions-lib.js";

const out = resolve(process.argv[2] ?? join(root, "_site"));
const SKIP = new Set([".git", ".github", "_site", "node_modules"]);

rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });

// 1. Current game at the site root.
cpSync(root, out, {
  recursive: true,
  filter: (src) => !SKIP.has(src.slice(root.length).split(/[\\/]/).filter(Boolean)[0]),
});
const head = git("rev-parse --short HEAD");
writeFileSync(join(out, "version.json"), JSON.stringify({ label: "latest", commit: head }));

// 2. Every tagged version, newest first, plus the index page.
const versions = listTags().map((tag) => extractTag(tag, join(out, "versions", tag)));
mkdirSync(join(out, "versions"), { recursive: true });
writeFileSync(join(out, "versions", "index.html"), versionsPage(versions));
console.log(`Site built in ${out}: latest (${head}) + ${versions.length} version(s)`);
