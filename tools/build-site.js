// Builds the public website: node tools/build-site.js [outDir]
//
//   <out>/                  the current game (this checkout)
//   <out>/versions/         index page listing every past version
//   <out>/versions/<tag>/   a full, playable copy of the game at that git tag
//
// Versions are git tags named round-* or v*. The annotated tag message is shown
// as the version's description. Run with full history (fetch-depth: 0 in CI).

import { execSync } from "node:child_process";
import { cpSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const out = resolve(process.argv[2] ?? join(root, "_site"));
const SKIP = new Set([".git", ".github", "_site", "node_modules"]);

const git = (args) => execSync(`git ${args}`, { cwd: root, encoding: "utf8" }).trim();

rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });

// 1. Current game at the site root.
cpSync(root, out, {
  recursive: true,
  filter: (src) => !SKIP.has(src.slice(root.length).split(/[\\/]/).filter(Boolean)[0]),
});
const head = git("rev-parse --short HEAD");
writeFileSync(join(out, "version.json"), JSON.stringify({ label: "latest", commit: head }));

// 2. Every tagged version, newest first.
const tags = git(`tag -l "round-*" "v*" --sort=-creatordate`).split("\n").filter(Boolean);
const versions = [];
for (const tag of tags) {
  const dir = join(out, "versions", tag);
  mkdirSync(dir, { recursive: true });
  // Extract with cwd = target dir (tar on Windows can't parse "C:\..." for -C).
  execSync(`git archive --format=tar "${tag}" | tar -xf -`, { cwd: dir, shell: true, env: { ...process.env, GIT_DIR: join(root, ".git") } });
  const date = git(`tag -l "${tag}" --format="%(creatordate:short)"`);
  const message = git(`tag -l "${tag}" --format="%(contents)"`) || git(`log -1 --format=%B "${tag}"`);
  writeFileSync(join(dir, "version.json"), JSON.stringify({ label: tag, date }));
  versions.push({ tag, date, message });
}

// 3. Versions index page.
mkdirSync(join(out, "versions"), { recursive: true });
writeFileSync(join(out, "versions", "index.html"), versionsPage(versions));
console.log(`Site built in ${out}: latest (${head}) + ${versions.length} version(s)`);

function versionsPage(list) {
  const esc = (s) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
  const items = list
    .map(({ tag, date, message }) => {
      const [title, ...rest] = message.split("\n");
      return `<li><a href="${esc(tag)}/"><strong>${esc(tag)}</strong></a> <span class="date">${esc(date)}</span>
        <div class="title">${esc(title)}</div>${rest.join("\n").trim() ? `<pre>${esc(rest.join("\n").trim())}</pre>` : ""}</li>`;
    })
    .join("\n");
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Coin Grab versions</title><link rel="stylesheet" href="../viewer/style.css">
<style>
  ul { list-style: none; padding: 0; } li { background: var(--panel); border: 1px solid var(--line); border-radius: 10px; padding: 14px 16px; margin: 10px 0; }
  li a { color: var(--text); } .date { color: var(--muted); font-size: 13px; margin-left: 8px; }
  .title { margin-top: 4px; } pre { white-space: pre-wrap; color: var(--muted); font: 13px/1.45 system-ui, sans-serif; margin: 8px 0 0; }
</style></head>
<body><main>
  <header><h1>Coin Grab versions</h1><p class="sub">Every round's game, playable as it was. <a href="../" style="color:var(--muted)">Back to latest</a></p></header>
  <ul>${items || "<li>No versions tagged yet.</li>"}</ul>
</main></body></html>
`;
}
