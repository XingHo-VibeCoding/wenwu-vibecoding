const http = require("http");
const server = http.createServer(function (req, res) {
  if (req.method !== "GET") {
    res.writeHead(405, { "Content-Type": "application/json; charset=utf-8" });
    res.end(JSON.stringify({ ok: false, error: "method not allowed" }));
    return;
  }
  res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify({ ok: true, service: "wenwu-vibecoding" }));
});
server.listen(9000, function () {
  console.log("[health] listening on port 9000");
});
