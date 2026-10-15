// Shared by build-site.js (public website) and archive-versions.js (local archive).
// A "version" is a git tag named round-* or v*; its annotated message is the description.

import { execSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

export const root = fileURLToPath(new URL("..", import.meta.url));

export const git = (args) => execSync(`git ${args}`, { cwd: root, encoding: "utf8" }).trim();

/** Version tags, newest first. */
export function listTags() {
  return git(`tag -l "round-*" "v*" --sort=-creatordate`).split("\n").filter(Boolean);
}

export function tagInfo(tag) {
  const date = git(`tag -l "${tag}" --format="%(creatordate:short)"`);
  const message = git(`tag -l "${tag}" --format="%(contents)"`) || git(`log -1 --format=%B "${tag}"`);
  return { tag, date, message };
}

/** Write a full, playable copy of the game at `tag` into `dir`, plus its version.json. */
export function extractTag(tag, dir) {
  mkdirSync(dir, { recursive: true });
  // Extract with cwd = target dir (tar on Windows can't parse "C:\..." for -C).
  execSync(`git archive --format=tar "${tag}" | tar -xf -`, {
    cwd: dir,
    shell: true,
    env: { ...process.env, GIT_DIR: join(root, ".git") },
  });
  const info = tagInfo(tag);
  writeFileSync(join(dir, "version.json"), JSON.stringify({ label: tag, date: info.date, message: info.message }));
  return info;
}

/** Standalone HTML page listing versions (each links to "<tag>/"). */
export function versionsPage(list, { backHref = "../" } = {}) {
  const esc = (s) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
  const items = list
    .map(({ tag, date, message = "" }) => {
      const [title = "", ...rest] = message.split("\n");
      const body = rest.join("\n").trim();
      return `<li><a href="${esc(tag)}/"><strong>${esc(tag)}</strong></a> <span class="date">${esc(date ?? "")}</span>
        <div class="title">${esc(title)}</div>${body ? `<pre>${esc(body)}</pre>` : ""}</li>`;
    })
    .join("\n");
  const back = backHref ? ` <a href="${esc(backHref)}">Back to latest</a>` : "";
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Coin Grab versions</title>
<style>
  :root { --bg: #0f1218; --panel: #171b24; --line: #262c38; --text: #e6e9ef; --muted: #8b93a3; }
  body { margin: 0; background: var(--bg); color: var(--text); font: 15px/1.4 system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; }
  main { max-width: 760px; margin: 0 auto; padding: 24px 16px 32px; }
  h1 { margin: 0; font-size: 28px; } .sub { margin: 4px 0 20px; color: var(--muted); } .sub a { color: var(--muted); }
  ul { list-style: none; padding: 0; }
  li { background: var(--panel); border: 1px solid var(--line); border-radius: 10px; padding: 14px 16px; margin: 10px 0; }
  li a { color: var(--text); } .date { color: var(--muted); font-size: 13px; margin-left: 8px; } .title { margin-top: 4px; }
  pre { white-space: pre-wrap; color: var(--muted); font: 13px/1.45 system-ui, sans-serif; margin: 8px 0 0; }
</style></head>
<body><main>
  <h1>Coin Grab versions</h1>
  <p class="sub">Every saved version of the game, playable as it was.${back}</p>
  <ul>${items || "<li>No versions tagged yet.</li>"}</ul>
</main></body></html>
`;
}
