import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { createServer } from "node:http";
import { extname, join, normalize, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL(".", import.meta.url)));
const requestedPort = Number(process.argv[2] || 8000);

const mimeTypes = new Map([
  [".html", "text/html; charset=utf-8"],
  [".css", "text/css; charset=utf-8"],
  [".js", "text/javascript; charset=utf-8"],
  [".mjs", "text/javascript; charset=utf-8"],
  [".jpg", "image/jpeg"],
  [".jpeg", "image/jpeg"],
  [".png", "image/png"],
  [".gif", "image/gif"],
  [".md", "text/markdown; charset=utf-8"],
]);

function resolveRequest(urlPath) {
  const parsed = new URL(urlPath, "http://127.0.0.1");
  const clean = normalize(decodeURIComponent(parsed.pathname)).replace(/^([/\\])+/, "");
  const target = resolve(join(root, clean || "index.html"));
  const insideRoot = target === root || target.startsWith(root + sep);
  return insideRoot ? target : null;
}

const server = createServer(async (request, response) => {
  try {
    const target = resolveRequest(request.url || "/");
    if (!target) {
      response.writeHead(403, { "content-type": "text/plain; charset=utf-8" });
      response.end("Forbidden");
      return;
    }

    const info = await stat(target);
    const filePath = info.isDirectory() ? join(target, "index.html") : target;
    const type = mimeTypes.get(extname(filePath).toLowerCase()) || "application/octet-stream";
    response.writeHead(200, {
      "content-type": type,
      "cache-control": "no-store",
    });
    if (request.method === "HEAD") {
      response.end();
      return;
    }

    createReadStream(filePath)
      .on("error", () => {
        if (!response.headersSent) {
          response.writeHead(500, { "content-type": "text/plain; charset=utf-8" });
        }
        response.end("Server error");
      })
      .pipe(response);
  } catch (error) {
    response.writeHead(error.code === "ENOENT" ? 404 : 500, {
      "content-type": "text/plain; charset=utf-8",
    });
    response.end(error.code === "ENOENT" ? "Not found" : "Server error");
  }
});

function listen(port) {
  server.once("error", (error) => {
    if (error.code === "EADDRINUSE") {
      listen(port + 1);
      return;
    }
    throw error;
  });
  server.listen(port, "127.0.0.1", () => {
    const address = server.address();
    console.log(`Serving http://127.0.0.1:${address.port}/`);
  });
}

listen(requestedPort);
