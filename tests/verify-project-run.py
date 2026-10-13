# -*- coding: utf-8 -*-
# Day 26 ｜ 发布前检查执行器
# 照 skills/verify-project/SKILL.md 的检查项逐条实现，输出 [PASS]/[FAIL] + 证据。
# 用法： python tests/verify-project-run.py
# 只读 + 写接口错误分支，零数据变更（不落库/可回滚）。
#
# Day 29 更新（v1.1）：
#   检查 1 增「6 张面板图字节数核对」；检查 3/7 增 /api/panels 与面板两表；
#   检查 5 模式收紧为三段式 JWT；新增检查 8「静态站链接口径」。
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

# 基线（若项目数据/产物变更，同步更新这里；见 SKILL.md「Day 29 基线」）
B = {"index.html": 541, "assets/index-CCG6c4Xs.css": 9703, "assets/index-D6c_vhx8.js": 176787}
IMG = {
    "img/panels/panel-curve_tracer.webp": 75216,
    "img/panels/panel-dc_power.webp": 35412,
    "img/panels/panel-lcr.webp": 19302,
    "img/panels/panel-multimeter.webp": 97350,
    "img/panels/panel-oscilloscope.webp": 152968,
    "img/panels/panel-signal_gen.webp": 52572,
}
COUNTS = {"/api/scenes": 4, "/api/resources": 6, "/api/instruments": 34, "/api/tasks": 7, "/api/panels": 6}
SCENE_KEYS = {"description","device_note","difficulty","id","measure_status","method","name","no","prerequisite","step_count","time_cost"}
RES_KEYS   = {"id","kind","name","purpose","url"}
INS_KEYS   = {"device_name","device_type","id","keywords","source","step_list","title"}
TASK_KEYS  = {"id","label","scene_id"}
STEP_KEYS  = {"caution","content","difficulty_level","measure_status","order_no","time_minutes"}
PANEL_KEYS = {"device_name","device_type","image_desc","image_path","keys","order_no","source"}
PANEL_KEY_KEYS = {"function_desc","key_name","order_no","source"}
PANEL_PER_DEVICE = {"curve_tracer":36, "oscilloscope":38, "signal_gen":17, "multimeter":14, "lcr":12, "dc_power":29}

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
            for p in ["app.tcloudbase.com", "/scenes", "/resources", "/instruments", "/tasks", "/panels"]:
                hit = p in js
                ev.append("  JS 含 %-22s : %s" % (p, hit))
                ok = ok and hit
    # Day 29 新增：面板图 6 张的字节数核对（图片走桶内路径，不在 index.html 里引用，故写死清单）
    ev.append("面板图 img/panels/*.webp（Day 28 新增，6 张）:")
    for nm in sorted(IMG):
        s3, r3 = call("GET", FRONT + nm)
        same = (IMG[nm] == len(r3))
        ev.append("  %-42s -> %s , %d bytes (基线 %d , 吻合=%s)" % (nm, s3, len(r3), IMG[nm], same))
        ok = ok and s3 == 200 and same
add(ok, "1. 公网首页可访问 + 真实数据 + 面板图", ev)

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
# Day 28 新增接口 /api/panels（含 keys 嵌套 + type 过滤 + 非法 type 校验）
st, raw = call("GET", API + "/api/panels")
j = json.loads(raw.decode("utf-8")); items = j.get("items", [])
ks = set(items[0].keys()) if items else set(); d = PANEL_KEYS - ks
kks = set(items[0]["keys"][0].keys()) if items and items[0].get("keys") else set(); dk = PANEL_KEY_KEYS - kks
per = dict((it.get("device_type"), len(it.get("keys") or [])) for it in items)
ev.append("/api/panels -> %s count=%s (基线 %s) 差集=%s 按键字段差集=%s" % (st, j.get("count"), COUNTS["/api/panels"], sorted(d) or "空", sorted(dk) or "空"))
ev.append("  逐台按键数 = %s (期望 %s)" % (per, PANEL_PER_DEVICE))
ok = ok and st == 200 and j.get("count") == COUNTS["/api/panels"] and not d and not dk and per == PANEL_PER_DEVICE
st, raw = call("GET", API + "/api/panels?type=oscilloscope")
j = json.loads(raw.decode("utf-8"))
ev.append("/api/panels?type=oscilloscope -> %s count=%s (期望 200/1)" % (st, j.get("count")))
ok = ok and st == 200 and j.get("count") == 1
st, raw = call("GET", API + "/api/panels?type=bogus")
j = json.loads(raw.decode("utf-8"))
ev.append("/api/panels?type=bogus -> %s error=%s (期望 400/invalid_param) 中文message=%s" % (st, j.get("error"), bool(j.get("message"))))
ok = ok and st == 400 and j.get("error") == "invalid_param" and bool(j.get("message"))
add(ok, "3. 读接口（6 路，逐一对字段）", ev)

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
# Day 29 收紧：原宽模式 eyJ[A-Za-z0-9_\-]{10,} 会被 index.html 里 base64 图（577KB）误命中，
# 改为三段式 JWT。副作用（如实标注）：不再检出"单段 token"形态的凭据。
ev = []
PAT = r'eyJ[A-Za-z0-9_\-]{8,}\.[A-Za-z0-9_\-]{8,}\.[A-Za-z0-9_\-]{8,}'
pat = re.compile(PAT + r'|Bearer eyJ')
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
    g = subprocess.run(["git", "grep", "-nE", PAT], cwd=ROOT,
                       capture_output=True, text=True, encoding="utf-8", errors="replace")
    gh = [l for l in (g.stdout or "").splitlines() if l.strip()]
except Exception as e:
    gh = ["git err: " + str(e)]
ev.append("模式（三段式 JWT）= %s" % PAT)
ev.append("源码树扫描文件数 = %d" % len(targets))
ev.append("源码树命中 = %s" % (hits if hits else "无"))
ev.append("git grep 已跟踪文件（三段式，不含历史提交）命中 = %s" % (gh if gh else "无"))
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
# Day 28 新增两表：panels 与 panel_keys（后者由 keys 嵌套非空间接证明）
st, raw = call("GET", API + "/api/panels")
try:
    j = json.loads(raw.decode("utf-8"))
    items = j.get("items", [])
    nk = sum(len(i.get("keys") or []) for i in items)
    good = st == 200 and len(items) > 0 and nk > 0
except Exception:
    items = []; nk = -1; good = False
ev.append("%-22s (%s) -> %s 非空行数=%s 按键总数=%s" % ("/api/panels", "panels+panel_keys", st, len(items), nk))
ok = ok and good
add(ok, "7. 数据库可连 + 6 表存在（间接）", ev)

# ---------- 检查 8 ----------
# Day 29 新增：静态站链接口径。来源=Day 13 潜伏到 Day 29 的真 bug：
#   index.html 的场景卡片写成裸锚点 href="#scene-1"，被 hash 路由 parse() 当成
#   「视图名 = scene-1」→ 不在 VIEWS 名单 → 回落到默认视图 search（点卡片跳去搜索页）。
ev = []; ok = True
p8 = os.path.join(ROOT, "index.html")
t8 = open(p8, "r", encoding="utf-8").read()
VIEWS8 = {"search", "transfer", "device", "scene"}
allh = re.findall(r'href="(#[^"]*)"', t8)
bare = [h for h in allh if not h.startswith("#/")]
badview = [h for h in allh if h.startswith("#/") and h[2:].split("/")[0] not in VIEWS8]
scenes = set(h for h in allh if h.startswith("#/transfer/scene-"))
ev.append("index.html 内 href=\"#...\" 总数 = %d" % len(allh))
ev.append("裸锚点（形如 #scene-1，会致路由回落 search）= %s" % (sorted(bare) or "无"))
ev.append("视图名不在 VIEWS %s 内 = %s" % (sorted(VIEWS8), sorted(badview) or "无"))
ev.append("四个场景链接 = %s" % (sorted(scenes) or "无"))
ok = bool(allh) and not bare and not badview and len(scenes) == 4
add(ok, "8. 静态站链接口径（#/view/anchor）", ev)

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
