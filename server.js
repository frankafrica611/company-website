const http = require("http");
const fs = require("fs");
const path = require("path");
const dir = __dirname;
http.createServer((req, res) => {
  let f = req.url === "/" ? "index.html" : req.url.slice(1);
  f = path.join(dir, f);
  try {
    const c = fs.readFileSync(f);
    const ext = path.extname(f);
    const types = { ".html": "text/html", ".css": "text/css", ".js": "application/javascript", ".png": "image/png", ".jpg": "image/jpeg", ".svg": "image/svg+xml" };
    res.writeHead(200, { "Content-Type": types[ext] || "application/octet-stream" });
    res.end(c);
  } catch { res.writeHead(404); res.end("404"); }
}).listen(8765, () => console.log("Server on :8765"));
