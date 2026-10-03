const http = require("http");

const REST_BASE =
  "https://wenwu-331122-d6gyrwmum2a734671.api.tcloudbasegateway.com/v1/rdb/rest";

const SERVICE_NAME = "wenwu-vibecoding";

const DEVICE_TYPES = [
  "dc_power",
  "multimeter",
  "oscilloscope",
  "signal_gen",
  "lcr",
  "curve_tracer"
];

const MSG = {
  invalid_path: "\u63a5\u53e3\u5730\u5740\u4e0d\u5b58\u5728",
  bad_scene_id: "\u8bf7\u6c42\u7684\u8def\u5f84\u4e0d\u5b58\u5728\uff0c\u6216\u573a\u666f\u7f16\u53f7\u683c\u5f0f\u4e0d\u5bf9\uff08\u5e94\u5f62\u5982 scene-1\uff09",
  bad_type: "type \u53d6\u503c\u4e0d\u5728\u5141\u8bb8\u8303\u56f4\u5185\u3002\u53ef\u9009\u503c\uff1adc_power\u3001multimeter\u3001oscilloscope\u3001signal_gen\u3001lcr\u3001curve_tracer",
  scene_not_found: "\u627e\u4e0d\u5230\u8fd9\u4e2a\u573a\u666f\u3002\u5f53\u524d\u6709 scene-1 \u81f3 scene-4 \u5171 4 \u4e2a\u573a\u666f",
  method_not_allowed: "\u672c\u63a5\u53e3\u53ea\u63a5\u53d7 GET \u8bf7\u6c42",
  config_error: "\u670d\u52a1\u7aef\u914d\u7f6e\u7f3a\u5931\uff0c\u8bf7\u8054\u7cfb\u7ef4\u62a4\u8005",
  internal_error: "\u670d\u52a1\u7aef\u8bfb\u53d6\u6570\u636e\u5931\u8d25\uff0c\u8bf7\u7a0d\u540e\u91cd\u8bd5"
};

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8"
  });
  res.end(JSON.stringify(payload));
}

function ok(res, extra) {
  var body = { ok: true };
  for (var k in extra) {
    if (Object.prototype.hasOwnProperty.call(extra, k)) {
      body[k] = extra[k];
    }
  }
  sendJson(res, 200, body);
}

function fail(res, statusCode, errorCode, messageKey) {
  sendJson(res, statusCode, {
    ok: false,
    error: errorCode,
    message: MSG[messageKey] || MSG.invalid_path
  });
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

function resolveRoute(pathname) {
  var p = pathname || "/";
  if (p.length > 1 && p.charAt(p.length - 1) === "/") {
    p = p.slice(0, -1);
  }
  if (p.indexOf("/api/") === 0) {
    p = p.slice(4);
  } else if (p === "/api") {
    p = "/";
  }

  if (p === "" || p === "/" || p === "/scenes") {
    return { mode: "scenes_list" };
  }

  var m = p.match(/^\/scenes\/(.+)$/);
  if (m) {
    if (/^scene-[0-9]+$/.test(m[1])) {
      return { mode: "scene_detail", id: m[1] };
    }
    return { mode: "bad_scene_id" };
  }

  m = p.match(/^\/(scene-[0-9]+)$/);
  if (m) {
    return { mode: "scene_detail", id: m[1] };
  }

  if (p === "/resources") {
    return { mode: "resources" };
  }
  if (p === "/instruments") {
    return { mode: "instruments" };
  }
  if (p === "/tasks") {
    return { mode: "tasks" };
  }
  if (p === "/health") {
    return { mode: "health" };
  }

  if (/^\/[^\/]+$/.test(p)) {
    return { mode: "bad_scene_id" };
  }
  return { mode: "not_found" };
}

function matchKeyword(item, needle) {
  var lower = String(needle).toLowerCase();
  if (item.title && String(item.title).toLowerCase().indexOf(lower) !== -1) {
    return true;
  }
  var kws = item.keywords || [];
  for (var i = 0; i < kws.length; i++) {
    if (String(kws[i]).toLowerCase().indexOf(lower) !== -1) {
      return true;
    }
  }
  return false;
}

const server = http.createServer(async function (req, res) {
  var started = Date.now();
  var parsed = null;
  try {
    parsed = new URL(req.url, "http://localhost");
  } catch (e) {
    parsed = null;
  }
  var pathname = parsed ? parsed.pathname : req.url || "/";
  var route = resolveRoute(pathname);

  res.on("finish", function () {
    console.log(
      "[" + new Date().toISOString() + "] " +
        req.method + " " + pathname + " " + route.mode +
        " -> " + res.statusCode + " " + (Date.now() - started) + "ms"
    );
  });

  if (route.mode === "not_found") {
    fail(res, 404, "invalid_path", "invalid_path");
    return;
  }
  if (req.method !== "GET") {
    fail(res, 405, "method_not_allowed", "method_not_allowed");
    return;
  }
  if (route.mode === "health") {
    ok(res, { service: SERVICE_NAME });
    return;
  }
  if (route.mode === "bad_scene_id") {
    fail(res, 400, "invalid_param", "bad_scene_id");
    return;
  }

  var key = process.env.PUBLISHABLE_KEY;
  if (!key) {
    fail(res, 500, "config_error", "config_error");
    return;
  }

  try {
    if (route.mode === "scenes_list") {
      var scenesAll = await fetchTable("/scenes?select=*&order=no.asc", key);
      ok(res, { count: scenesAll.length, items: scenesAll });
      return;
    }

    if (route.mode === "scene_detail") {
      var scenes = await fetchTable(
        "/scenes?id=eq." + route.id + "&select=*",
        key
      );
      if (!scenes.length) {
        fail(res, 404, "scene_not_found", "scene_not_found");
        return;
      }
      var steps = await fetchTable(
        "/steps?select=order_no,content,difficulty_level,time_minutes,caution,measure_status&scene_id=eq." +
          route.id +
          "&order=order_no.asc",
        key
      );
      var detail = scenes[0];
      detail.steps = steps;
      ok(res, { item: detail });
      return;
    }

    if (route.mode === "resources") {
      var resourceRows = await fetchTable(
        "/resources?select=id,name,url,purpose,kind&order=id.asc",
        key
      );
      ok(res, { count: resourceRows.length, items: resourceRows });
      return;
    }

    if (route.mode === "instruments") {
      var type = parsed ? parsed.searchParams.get("type") || "" : "";
      var q = parsed ? parsed.searchParams.get("q") || "" : "";
      if (type && DEVICE_TYPES.indexOf(type) === -1) {
        fail(res, 400, "invalid_param", "bad_type");
        return;
      }
      var qs =
        "select=id,device_name,device_type,title,keywords,step_list,source&order=id.asc";
      if (type) {
        qs += "&device_type=eq." + type;
      }
      var rows = await fetchTable("/instruments?" + qs, key);
      if (q) {
        var kept = [];
        for (var i = 0; i < rows.length; i++) {
          if (matchKeyword(rows[i], q)) {
            kept.push(rows[i]);
          }
        }
        rows = kept;
      }
      ok(res, { count: rows.length, items: rows });
      return;
    }

    if (route.mode === "tasks") {
      var tasks = await fetchTable(
        "/tasks?select=id,label,scene_id&order=id.asc",
        key
      );
      ok(res, { count: tasks.length, items: tasks });
      return;
    }

    fail(res, 404, "invalid_path", "invalid_path");
  } catch (e) {
    fail(res, 500, "internal_error", "internal_error");
  }
});

server.listen(9000, function () {
  console.log("[scenes] listening on port 9000");
});
