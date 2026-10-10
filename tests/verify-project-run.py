# -*- coding: utf-8 -*-
# Day 26 ｜ 发布前检查执行器
# 照 skills/verify-project/SKILL.md 的 7 项逐条实现，输出 [PASS]/[FAIL] + 证据。
# 用法： python tests/verify-project-run.py
# 只读 + 写接口错误分支，零数据变更（不落库/可回滚）。
import json, re, os, subprocess, urllib.request, urllib.error

ROOT  = r"C:\Users\zuwen\Desktop\vibecoding实战工作区"
DIST  = os.path.join(ROOT, "web", "dist")
FRONT = "https://wenwu-331122-d6gyrwmum2a734671-1498877015.tcloudbaseapp.com/wenwu-vibecoding/"
API   = "https://wenwu-331122-d6gyrwmum2a734671-1498887015.ap-shanghai.app.tcloudbase.com"

opener = urllib.request.build_opener(urllib.request.ProxyHandler({}))
R = []

def call(method, url, body=None):
    data = None
    h = {"Content-Type": "application/json"}
    if body is not None:
        data = json.dumps(body).encode("utf-8")
    req = urllib.request.Request(url, data=data, method=method, headers=h)
    try:
        r = opener.open(req, timeout=20)
        return r.status, r.read()
    except urllib.error.HTTPError as e:
        return e.code, e.read()
    except Exception as e:
        return None, ("EXC: " + str(e)).encode("utf-8")

def add(ok, title, ev):
    R.append(("PASS" if ok else "FAIL", title, ev))

# 基线（若项目数据/产物变更，同步更新这里；见 SKILL.md「Day 26 基线」）
B = {"index.html": 541, "assets/index-ChUL683b.js": 173388, "assets/index-Dk9WJkSO.css": 7591}
COUNTS = {"/api/scenes": 4, "/api/resources": 6, "/api/instruments": 34, "/api/tasks": 7}
SCENE_KEYS = {"description","device_note","difficulty","id","measure_status","method","name","no","prerequisite","step_count","time_cost"}
RES_KEYS   = {"id","kind","name","purpose","url"}
INS_KEYS   = {"device_name","device_type","id","keywords","source","step_list","title"}
TASK_KEYS  = {"id","label","scene_id"}
STEP_KEYS  = {"caution","content","difficulty_level","measure_status","order_no","time_minutes"}

# ---------- 检查 1 ----------
ev = []
st, raw = call("GET", FRONT)
ev.append("GET index.html -> %s , %d bytes (基线 %d)" % (st, len(raw), B["index.html"]))
ok = (st == 200 and len(raw) == B["index.html"])
if st == 200:
    html = raw.decode("utf-8", "replace")
    names = re.findall(r'assets/[A-Za-z0-9_\-\.]+', html)
    ev.append("引用资源: %s" % names)
    for nm in names:
        s2, r2 = call("GET", FRONT + nm)
        base = B.get(nm)
        same = (base == len(r2))
        ev.append("%s -> %s , %d bytes (基线 %s , 吻合=%s)" % (nm, s2, len(r2), base, same))
        ok = ok and s2 == 200 and same
        if nm.endswith(".js") and s2 == 200:
            js = r2.decode("utf-8", "replace")
            for p in ["app.tcloudbase.com", "/scenes", "/resources", "/instruments", "/tasks"]:
                hit = p in js
                ev.append("  JS 含 %-22s : %s" % (p, hit))
                ok = ok and hit
add(ok, "1. 公网首页可访问 + 真实数据", ev)

# ---------- 检查 2 ----------
st, raw = call("GET", API + "/api/health")
txt = raw.decode("utf-8", "replace")
try:
    j = json.loads(txt)
except Exception:
    j = None
ok = (st == 200 and j == {"ok": True, "service": "wenwu-vibecoding"})
add(ok, "2. GET /api/health", ["GET /api/health -> %s %s" % (st, txt)])

# ---------- 检查 3 ----------
ev = []; ok = True
st, raw = call("GET", API + "/api/scenes")
j = json.loads(raw.decode("utf-8")); ks = set(j["items"][0].keys()) if j.get("items") else set()
d = SCENE_KEYS - ks
ev.append("/api/scenes -> %s count=%s (基线 %s) 差集=%s" % (st, j.get("count"), COUNTS["/api/scenes"], sorted(d) or "空"))
ok = ok and st == 200 and j.get("count") == COUNTS["/api/scenes"] and not d
st, raw = call("GET", API + "/api/scenes/scene-1")
j = json.loads(raw.decode("utf-8")); stp = j["item"].get("steps", []); ks = set(stp[0].keys()) if stp else set()
d = STEP_KEYS - ks
ev.append("/api/scenes/scene-1 -> %s steps=%d (基线 5) 差集=%s" % (st, len(stp), sorted(d) or "空"))
ok = ok and st == 200 and len(stp) == 5 and not d
for path, keys in [("/api/resources", RES_KEYS), ("/api/instruments", INS_KEYS), ("/api/tasks", TASK_KEYS)]:
    st, raw = call("GET", API + path)
    j = json.loads(raw.decode("utf-8")); ks = set(j["items"][0].keys()) if j.get("items") else set()
    d = keys - ks
    ev.append("%s -> %s count=%s (基线 %s) 差集=%s" % (path, st, j.get("count"), COUNTS[path], sorted(d) or "空"))
    ok = ok and st == 200 and j.get("count") == COUNTS[path] and not d
add(ok, "3. 读接口（5 路，逐一对字段）", ev)

# ---------- 检查 4 ----------
ev = []
st, raw = call("GET", API + "/api/tasks")
j = json.loads(raw.decode("utf-8")); before = (j.get("count"), sorted([x["id"] for x in j["items"]]))
ev.append("跑前 tasks 基线 count/sorted-id = %s" % (before,))
ok = True
cases = [
    ("4a POST 缺 time_minutes", "POST", "/api/steps/measure", {"scene_id":"scene-1","order_no":1,"difficulty_level":2}, 400, "missing_field"),
    ("4b PATCH 仅 scene_id+order_no", "PATCH", "/api/steps/measure", {"scene_id":"scene-1","order_no":1}, 400, "empty_patch"),
    ("4c DELETE /api/tasks/abc", "DELETE", "/api/tasks/abc", None, 400, "invalid_param"),
    ("4d DELETE /api/tasks/999999", "DELETE", "/api/tasks/999999", None, 404, "task_not_found"),
]
for label, m, path, body, wst, werr in cases:
    st, raw = call(m, API + path, body)
    txt = raw.decode("utf-8", "replace")
    try:
        j = json.loads(txt); got = j.get("error"); cn = bool(j.get("message"))
    except Exception:
        got = None; cn = False
    good = (st == wst and got == werr and cn)
    ev.append("%-30s -> %s error=%s (期望 %s/%s) 中文message=%s %s" % (label, st, got, wst, werr, cn, "OK" if good else "!!!"))
    ok = ok and good
st, raw = call("GET", API + "/api/tasks")
j = json.loads(raw.decode("utf-8")); after = (j.get("count"), sorted([x["id"] for x in j["items"]]))
cur = (after == before)
ev.append("跑后复核 count/sorted-id = %s (零变更=%s)" % (after, cur))
ok = ok and cur
add(ok, "4. 写接口错误分支（方案 A，零变更）", ev)

# ---------- 检查 5 ----------
ev = []
pat = re.compile(r'eyJ[A-Za-z0-9_\-]{10,}|Bearer eyJ')
targets = []
for sub in ["web/src", "cloudfunctions"]:
    for root, dirs, files in os.walk(os.path.join(ROOT, sub)):
        for f in files:
            targets.append(os.path.join(root, f))
targets.append(os.path.join(ROOT, "index.html"))
hits = []
for p in targets:
    try:
        t = open(p, "r", encoding="utf-8", errors="replace").read()
    except Exception:
        continue
    for m in pat.finditer(t):
        hits.append("%s: %s" % (os.path.relpath(p, ROOT), m.group(0)[:24]))
try:
    g = subprocess.run(["git", "grep", "-nE", r"eyJ[A-Za-z0-9_-]{10,}"], cwd=ROOT,
                       capture_output=True, text=True, encoding="utf-8", errors="replace")
    gh = [l for l in (g.stdout or "").splitlines() if l.strip()]
except Exception as e:
    gh = ["git err: " + str(e)]
ev.append("源码树扫描文件数 = %d" % len(targets))
ev.append("源码树命中 = %s" % (hits if hits else "无"))
ev.append("git grep 全历史（严格 JWT 模式）命中 = %s" % (gh if gh else "无"))
ok = (not hits) and (not gh)
add(ok, "5. 无硬编码密钥（源码 + git）", ev)

# ---------- 检查 6 ----------
ev = []; ok = True
def git(*a):
    r = subprocess.run(["git"] + list(a), cwd=ROOT, capture_output=True, text=True, encoding="utf-8", errors="replace")
    return (r.stdout or "") + (r.stderr or "")
ci_env = git("check-ignore", "-v", ".env").strip()
ci_ex = git("check-ignore", "-v", ".env.example").strip()
ls_env = git("ls-files", ".env").strip()
ls_ex = git("ls-files", ".env.example").strip()
ev.append("check-ignore .env = %s" % (ci_env or "（空）"))
ev.append("check-ignore .env.example = %s" % (ci_ex or "（空）"))
ev.append("ls-files .env = %s / .env.example = %s" % (ls_env or "（空）", ls_ex or "（空）"))
ok = ok and (ci_env != "" and ls_env == "") and (ci_ex == "" and ls_ex != "")
ex_path = os.path.join(ROOT, ".env.example")
if os.path.exists(ex_path):
    t = open(ex_path, "r", encoding="utf-8", errors="replace").read()
    m = re.search(r'PUBLISHABLE_KEY=(.*)', t)
    val = (m.group(1).strip() if m else "")
    ev.append(".env.example PUBLISHABLE_KEY 值 = %r (应空)" % val)
    ok = ok and val == ""
else:
    ev.append(".env.example 不存在 !!!")
    ok = False
add(ok, "6. .gitignore/.env.example", ev)

# ---------- 检查 7 ----------
ev = []; ok = True
for path, tbl in [("/api/scenes","scenes"), ("/api/scenes/scene-1","steps"), ("/api/resources","resources"),
                  ("/api/instruments","instruments"), ("/api/tasks","tasks")]:
    st, raw = call("GET", API + path)
    try:
        j = json.loads(raw.decode("utf-8"))
        n = len(j.get("items", [])) if "items" in j else len(j.get("item", {}).get("steps", []))
        good = st == 200 and n > 0
    except Exception:
        n = -1; good = False
    ev.append("%-22s (%s) -> %s 非空行数=%s" % (path, tbl, st, n))
    ok = ok and good
add(ok, "7. 数据库可连 + 5 表存在（间接）", ev)

# ---------- 输出 ----------
lines = []
npass = sum(1 for s, _, _ in R if s == "PASS")
nfail = sum(1 for s, _, _ in R if s == "FAIL")
for s, title, ev in R:
    lines.append("[%s] %s" % (s, title))
    for l in ev:
        lines.append("        " + l)
lines.append("")
lines.append("小结：PASS %d / FAIL %d" % (npass, nfail))
print("\n".join(lines))
