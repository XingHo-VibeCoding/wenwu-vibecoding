const http = require("http");

const repo = require("./repository");

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
  internal_error: "\u670d\u52a1\u7aef\u8bfb\u53d6\u6570\u636e\u5931\u8d25\uff0c\u8bf7\u7a0d\u540e\u91cd\u8bd5",
  measure_method: "\u672c\u63a5\u53e3\u53ea\u63a5\u53d7 POST \u8bf7\u6c42",
  already_measured: "\u8be5\u6b65\u9aa4\u5df2\u7ecf\u5b9e\u6d4b\u8fc7\uff0c\u4e0d\u80fd\u91cd\u590d\u63d0\u4ea4",
  write_failed: "\u670d\u52a1\u7aef\u5199\u5165\u6570\u636e\u5931\u8d25\uff0c\u8bf7\u7a0d\u540e\u91cd\u8bd5",
  bad_body_json: "\u8bf7\u6c42\u4f53\u4e0d\u662f\u5408\u6cd5\u7684 JSON \u5bf9\u8c61",
  missing_prefix: "\u7f3a\u5c11\u5fc5\u586b\u5b57\u6bb5\uff1a",
  missing_suffix: "\uff08\u5fc5\u586b\u56db\u9879\uff1ascene_id\u3001order_no\u3001difficulty_level\u3001time_minutes\uff09",
  field_prefix: "\u5b57\u6bb5 ",
  field_mid: " \u53d6\u503c\u4e0d\u5408\u6cd5\uff1a",
  rule_scene_id: "\u5e94\u5f62\u5982 scene-1",
  rule_order_no: "\u5fc5\u987b\u662f\u5927\u4e8e\u7b49\u4e8e 1 \u7684\u6574\u6570",
  rule_level: "\u5fc5\u987b\u662f 1 \u5230 5 \u7684\u6574\u6570",
  rule_minutes: "\u5fc5\u987b\u662f\u5927\u4e8e\u7b49\u4e8e 0 \u7684\u6574\u6570",
  step_prefix: "\u627e\u4e0d\u5230\u8fd9\u4e2a\u6b65\u9aa4\uff1a",
  step_mid: " \u7684\u7b2c ",
  step_suffix: " \u6b65\u4e0d\u5b58\u5728"
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

function failMsg(res, statusCode, errorCode, message) {
  sendJson(res, statusCode, {
    ok: false,
    error: errorCode,
    message: message
  });
}

function readJsonBody(req) {
  return new Promise(function (resolve) {
    var chunks = [];
    var size = 0;
    var over = false;
    req.on("data", function (c) {
      size += c.length;
      if (size > 65536) {
        over = true;
        return;
      }
      chunks.push(c);
    });
    req.on("end", function () {
      if (over) {
        resolve({ error: "bad_body" });
        return;
      }
      var raw = Buffer.concat(chunks).toString("utf8");
      if (!raw) {
        resolve({ error: "bad_body" });
        return;
      }
      try {
        resolve({ value: JSON.parse(raw) });
      } catch (e) {
        resolve({ error: "bad_body" });
      }
    });
    req.on("error", function () {
      resolve({ error: "bad_body" });
    });
  });
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

  if (p === "/steps/measure") {
    return { mode: "step_measure" };
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

function measureFieldError(res, field, rule) {
  failMsg(
    res,
    400,
    "invalid_param",
    MSG.field_prefix + field + MSG.field_mid + rule
  );
}

async function handleMeasure(req, res) {
  var key = process.env.PUBLISHABLE_KEY;
  if (!key) {
    fail(res, 500, "config_error", "config_error");
    return;
  }

  var parsedBody = await readJsonBody(req);
  if (parsedBody.error) {
    failMsg(res, 400, "invalid_param", MSG.bad_body_json);
    return;
  }
  var payload = parsedBody.value;
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    failMsg(res, 400, "invalid_param", MSG.bad_body_json);
    return;
  }

  var required = ["scene_id", "order_no", "difficulty_level", "time_minutes"];
  for (var r = 0; r < required.length; r++) {
    var fname = required[r];
    if (
      !Object.prototype.hasOwnProperty.call(payload, fname) ||
      payload[fname] === null ||
      payload[fname] === undefined
    ) {
      failMsg(
        res,
        400,
        "missing_field",
        MSG.missing_prefix + fname + MSG.missing_suffix
      );
      return;
    }
  }

  var sceneId = payload.scene_id;
  if (typeof sceneId !== "string" || !/^scene-[0-9]+$/.test(sceneId)) {
    measureFieldError(res, "scene_id", MSG.rule_scene_id);
    return;
  }

  var orderNo = payload.order_no;
  if (!Number.isInteger(orderNo) || orderNo < 1) {
    measureFieldError(res, "order_no", MSG.rule_order_no);
    return;
  }

  var level = payload.difficulty_level;
  if (!Number.isInteger(level) || level < 1 || level > 5) {
    measureFieldError(res, "difficulty_level", MSG.rule_level);
    return;
  }

  var minutes = payload.time_minutes;
  if (!Number.isInteger(minutes) || minutes < 0) {
    measureFieldError(res, "time_minutes", MSG.rule_minutes);
    return;
  }

  var rows;
  try {
    rows = await repo.findStep(sceneId, orderNo, key);
  } catch (e) {
    failMsg(res, 500, "internal_error", MSG.write_failed);
    return;
  }

  if (!rows.length) {
    failMsg(
      res,
      404,
      "step_not_found",
      MSG.step_prefix + sceneId + MSG.step_mid + orderNo + MSG.step_suffix
    );
    return;
  }

  if (rows[0].measure_status === "measured") {
    failMsg(res, 409, "already_measured", MSG.already_measured);
    return;
  }

  var updated;
  try {
    updated = await repo.markStepMeasured(sceneId, orderNo, level, minutes, key);
  } catch (e) {
    failMsg(res, 500, "internal_error", MSG.write_failed);
    return;
  }

  var row = updated && updated.length ? updated[0] : null;
  if (!row) {
    failMsg(res, 500, "internal_error", MSG.write_failed);
    return;
  }

  ok(res, {
    item: {
      scene_id: row.scene_id,
      order_no: row.order_no,
      difficulty_level: row.difficulty_level,
      time_minutes: row.time_minutes,
      measure_status: row.measure_status
    }
  });
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
  if (route.mode === "step_measure") {
    if (req.method !== "POST") {
      failMsg(res, 405, "method_not_allowed", MSG.measure_method);
      return;
    }
    await handleMeasure(req, res);
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
      var scenesAll = await repo.listScenes(key);
      ok(res, { count: scenesAll.length, items: scenesAll });
      return;
    }

    if (route.mode === "scene_detail") {
      var scenes = await repo.findScene(route.id, key);
      if (!scenes.length) {
        fail(res, 404, "scene_not_found", "scene_not_found");
        return;
      }
      var steps = await repo.listStepsOfScene(route.id, key);
      var detail = scenes[0];
      detail.steps = steps;
      ok(res, { item: detail });
      return;
    }

    if (route.mode === "resources") {
      var resourceRows = await repo.listResources(key);
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
      var rows = await repo.listInstruments(qs, key);
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
      var tasks = await repo.listTasks(key);
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
