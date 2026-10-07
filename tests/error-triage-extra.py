# -*- coding: utf-8 -*-
"""补测：去掉 PUBLISHABLE_KEY -> 期望 500 config_error + 中文；并复核 A10 在真 key 下的语义"""
import json, subprocess, time, urllib.request, urllib.error

WS = r"C:\Users\zuwen\Desktop\vibecoding实战工作区"
NODE = r"C:\Users\zuwen\.workbuddy\binaries\node\versions\22.22.2-3\node.exe"
FN = WS + r"\cloudfunctions\scenes\index.js"


def call(method, path):
    op = urllib.request.build_opener(urllib.request.ProxyHandler({}))
    req = urllib.request.Request("http://127.0.0.1:9000" + path, method=method)
    try:
        with op.open(req, timeout=9) as r:
            return r.status, json.loads(r.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read().decode("utf-8"))
    except Exception as e:
        return -1, {"_exc": str(e)}


out = []
# 场景1：完全不设 PUBLISHABLE_KEY
env_no_key = {"PATH": r"C:\Windows\System32", "SystemRoot": r"C:\Windows"}
p = subprocess.Popen([NODE, FN], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
                     env=env_no_key, cwd=WS + r"\cloudfunctions\scenes")
time.sleep(2)
out.append("[D] 缺 PUBLISHABLE_KEY（期望 500 config_error）")
for label, m, path in [("D1 GET /scenes", "GET", "/scenes"),
                       ("D2 GET /health(不需要 key)", "GET", "/health"),
                       ("D3 POST /steps/measure", "POST", "/steps/measure")]:
    st, bd = call(m, path)
    out.append("  %-28s -> %s %s | %s" % (label, st, bd.get("error", "-"), bd.get("message", "-")))
p.terminate()
time.sleep(0.8)

txt = "\n".join(out)
with open(WS + r"\tests\error-triage-extra.txt", "w", encoding="utf-8") as f:
    f.write(txt + "\n")
print(txt)
