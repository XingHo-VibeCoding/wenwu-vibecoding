const http = require("http");

const REST_BASE =
  "https://wenwu-331122-d6gyrwmum2a734671.api.tcloudbasegateway.com/v1/rdb/rest";

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8"
  });
  res.end(JSON.stringify(payload));
}

function fail(res, statusCode, code) {
  sendJson(res, statusCode, { ok: false, error: code });
}

async function fetchTable(pathWithQuery, key) {
  const resp = await fetch(REST_BASE + pathWithQuery, {
    headers: { Authorization: "Bearer " + key }
  });
  if (!resp.ok) {
    throw new Error("upstream_status_" + resp.status);
  }
  return resp.json();
}

function resolveMode(pathname) {
  var p = pathname || "/";
  if (p === "/" || p === "" || p === "/api/scenes" || p === "/api/scenes/") {
    return { mode: "list", id: null };
  }
  var stripped = p.match(/^\/(scene-[0-9]+)$/);
  if (stripped) {
    return { mode: "detail", id: stripped[1] };
  }
  var full = p.match(/^\/api\/scenes\/(scene-[0-9]+)$/);
  if (full) {
    return { mode: "detail", id: full[1] };
  }
  if (p.indexOf("/api/scenes/") === 0 || /^\/[^/]+$/.test(p)) {
    return { mode: "bad_id", id: null };
  }
  return { mode: "unknown", id: null };
}

const server = http.createServer(async function (req, res) {
  var parsed = null;
  try {
    parsed = new URL(req.url, "http://localhost");
  } catch (e) {
    parsed = null;
  }
  var pathname = parsed ? parsed.pathname : req.url || "/";

  var route = resolveMode(pathname);

  if (route.mode === "unknown") {
    fail(res, 404, "invalid_path");
    return;
  }
  if (req.method !== "GET") {
    fail(res, 405, "method not allowed");
    return;
  }
  if (route.mode === "bad_id") {
    fail(res, 400, "invalid_param");
    return;
  }

  var key = process.env.PUBLISHABLE_KEY;
  if (!key) {
    fail(res, 500, "config_error");
    return;
  }

  try {
    if (route.mode === "list") {
      var items = await fetchTable("/scenes?select=*&order=no.asc", key);
      sendJson(res, 200, { ok: true, count: items.length, items: items });
      return;
    }

    var scenes = await fetchTable(
      "/scenes?id=eq." + route.id + "&select=*",
      key
    );
    if (!scenes.length) {
      fail(res, 404, "scene_not_found");
      return;
    }
    var steps = await fetchTable(
      "/steps?select=order_no,content,difficulty_level,time_minutes,caution,measure_status&scene_id=eq." +
        route.id +
        "&order=order_no.asc",
      key
    );
    var item = scenes[0];
    item.steps = steps;
    sendJson(res, 200, { ok: true, item: item });
  } catch (e) {
    fail(res, 500, "internal_error");
  }
});

server.listen(9000, function () {
  console.log("[scenes] listening on port 9000");
});
