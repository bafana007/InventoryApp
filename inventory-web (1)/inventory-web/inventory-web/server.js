const http = require("http");
const fs = require("fs");
const path = require("path");

const MIME = {
  ".html": "text/html",
  ".js": "application/javascript",
  ".css": "text/css",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".ico": "image/x-icon",
};

const ROOT = path.resolve(__dirname);

const server = http.createServer(function (req, res) {
  let filePath = path.join(ROOT, req.url === "/" ? "/index.html" : req.url);
  fs.readFile(filePath, function (err, data) {
    if (err) {
      res.writeHead(404);
      res.end("Not found");
      return;
    }
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, { "Content-Type": MIME[ext] || "application/octet-stream" });
    res.end(data);
  });
});

server.listen(8080, function () {
  console.log("Server running on http://localhost:8080");
});
