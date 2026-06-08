import { createReadStream, existsSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("./", import.meta.url));
const port = Number(process.env.PORT || 4173);
const host = process.env.HOST || "0.0.0.0";
const types = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
};

function resolvePath(urlPath) {
  const clean = decodeURIComponent(urlPath.split("?")[0]);
  const requested = clean === "/" ? "/index.html" : clean;
  const safe = normalize(requested).replace(/^(\.\.[/\\])+/, "");
  const direct = join(root, safe);
  if (existsSync(direct) && statSync(direct).isFile()) return direct;
  const html = join(root, `${safe}.html`);
  if (existsSync(html) && statSync(html).isFile()) return html;
  return join(root, "index.html");
}

createServer((req, res) => {
  const file = resolvePath(req.url || "/");
  res.setHeader("Content-Type", types[extname(file)] || "application/octet-stream");
  createReadStream(file)
    .on("error", () => {
      res.statusCode = 500;
      res.end("Unable to load preview file.");
    })
    .pipe(res);
}).listen(port, host, () => {
  console.log(`ORDS preview running at http://${host}:${port}/`);
});
