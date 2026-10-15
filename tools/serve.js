// Tiny static file server for local viewing: node tools/serve.js [port] [folder]
// Serves the game by default, or any folder (e.g. the local version archive).
// (Browsers block ES modules from file:// URLs, so the page needs to be served.)

import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, join, normalize, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const root = process.argv[3] ? resolve(process.argv[3]) + sep : fileURLToPath(new URL("..", import.meta.url));
const port = Number(process.argv[2]) || 8080;
const types = {
  ".html": "text/html", ".js": "text/javascript", ".css": "text/css",
  ".json": "application/json", ".md": "text/plain", ".svg": "image/svg+xml",
};

createServer(async (req, res) => {
  const path = normalize(decodeURIComponent(new URL(req.url, "http://x").pathname)).replace(/^([/\\])+/, "");
  let file = join(root, path);
  if (!file.startsWith(root)) return res.writeHead(403).end();
  if (await stat(file).then((s) => s.isDirectory(), () => false)) {
    // Folder URLs need a trailing slash so relative links inside resolve correctly.
    if (!req.url.split("?")[0].endsWith("/")) return res.writeHead(301, { Location: req.url.replace(/(\?|$)/, "/$1") }).end();
    file = join(file, "index.html");
  }
  try {
    const body = await readFile(file);
    res.writeHead(200, { "Content-Type": types[extname(file)] ?? "application/octet-stream" }).end(body);
  } catch {
    res.writeHead(404).end("Not found");
  }
}).listen(port, () => console.log(`Serving ${root} at http://localhost:${port}`));
