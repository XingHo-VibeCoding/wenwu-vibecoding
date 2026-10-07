# -*- coding: utf-8 -*-
"""
Day 23 板块③ 三类错误实测（本地假 key 起服务，打全量请求）
判定标准（清单要求）：
  输入错   -> 400/404/405，body.message 为中文
  服务端错 -> 5xx，body.message 为中文
  网络错   -> 到不了服务端；只测前端 client.js 的转换逻辑（见 py 末段 js 侧说明）
不落库：全部用"不存在"的目标或纯无效载荷，绝不碰真数据。
"""
import json
import re
import subprocess
import sys
import time
import urllib.error
import urllib.request

WS = r"C:\Users\zuwen\Desktop\vibecoding实战工作区"
NODE = r"C:\Users\zuwen\.workbuddy\binaries\node\versions\22.22.2-3\node.exe"
FN = WS + r"\cloudfunctions\scenes\index.js"
BASE = "http://127.0.0.1:9000"

# 伪 key：非空即可（函数只判"有没有"，字符串本身不去校验）
ENV = {"PUBLISHABLE_KEY": "fake-key-for-local-error-test",
       "PATH": r"C:\Windows\System32",
       "SystemRoot": r"C:\Windows"}

CN = re.compile(r"[\u4e00-\u9fff]")


def start_server():
    p = subprocess.Popen([NODE, FN], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
                         env=ENV, cwd=WS + r"\cloudfunctions\scenes")
    time.sleep(1.5)
    return p


def call(method, path, body=None):
    # 关键：绕过系统代理直连 127.0.0.1，否则会走代理 -> 502 目标计算机积极拒绝
    opener = urllib.request.build_opener(urllib.request.ProxyHandler({}))
    url = BASE + path
    data = None
    headers = {}
    if body is not None:
        data = json.dumps(body).encode("utf-8")
        headers["Content-Type"] = "application/json"
    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        with opener.open(req, timeout=9) as r:
            return r.status, json.loads(r.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        raw = e.read().decode("utf-8")
        try:
            return e.code, json.loads(raw)
        except Exception:
            return e.code, {"_raw": raw}
    except Exception as e:
        return -1, {"_exc": str(e)}


def check(label, status, body, want_kind, expect_error=None):
    """want_kind: 'input' | 'server'
    expect_error: 若给定，则要求 body.error 与之一致（用于区分"同属 input 类但错误码不同"）
    说明：本地用假 key 时，凡需要真读库的请求都会先 500（假 key 过不了 PostgREST 鉴权），
          这是预期行为、正好用来验 B 类；A 类里的 404 语义改由文档口径说明（见 [E]）。
    """
    msg = body.get("message", "") if isinstance(body, dict) else ""
    is_cn = bool(CN.search(msg))
    err = body.get("error", "-") if isinstance(body, dict) else "-"
    if expect_error:
        ok_status = err == expect_error
    elif want_kind == "input":
        ok_status = 400 <= status < 500
    else:
        ok_status = status >= 500
    mark = "PASS" if (ok_status and is_cn) else "FAIL"
    return "  [%s] %-46s -> %s %s | 中文提示=%s | %s" % (
        mark, label, status, err, "是" if is_cn else "否", msg)


def main():
    out = []
    out.append("=" * 64)
    out.append("Day 23 板块③ 三类错误实测（本地 :9000，假 key，不落库）")
    out.append("=" * 64)

    proc = start_server()
    try:
        # 健康检查，确认服务起来了
        st, bd = call("GET", "/health")
        out.append("\n[0] 服务连通性 /health -> %s %s" % (st, bd.get("service", bd)))
        if st != 200:
            out.append("!! 服务未启动，终止")
            print("\n".join(out))
            return

        out.append("\n[A] 输入错（期望 4xx + 中文 message）")
        cases_in = [
            ("A1 非法路径", "GET", "/nope/nope", None),
            ("A2 场景编号格式错", "GET", "/scenes/scene-abc", None),
            ("A3 type 取值非法", "GET", "/instruments?type=badtype", None),
            ("A4 方法不允许(列表打 POST)", "POST", "/scenes", None),
            ("A5 缺必填字段", "POST", "/steps/measure", {"scene_id": "scene-1"}),
            ("A6 字段取值非法(难度=9)", "POST", "/steps/measure",
             {"scene_id": "scene-1", "order_no": 1, "difficulty_level": 9, "time_minutes": 1}),
            ("A7 请求体非法 JSON", "POST", "/steps/measure", "NOT_AN_OBJECT"),
            ("A8 PATCH 空载荷", "PATCH", "/steps/measure",
             {"scene_id": "scene-1", "order_no": 1}),
            ("A9 任务编号非法", "DELETE", "/tasks/abc", None),
            ("A10 假key下删不存在任务(先撞鉴权500)", "DELETE", "/tasks/99999999", None),
        ]
        for i, (label, m, p, b) in enumerate(cases_in):
            # A10 是"假 key 下"的特例：它打的其实是 B 类（鉴权 500），故按 server 判
            kind = "server" if label.startswith("A10") else "input"
            if b == "NOT_AN_OBJECT":
                # 手工发非 JSON 字符串体
                opener = urllib.request.build_opener(urllib.request.ProxyHandler({}))
                req = urllib.request.Request(BASE + p, data=b"not-json",
                                             headers={"Content-Type": "application/json"},
                                             method=m)
                try:
                    with opener.open(req, timeout=9) as r:
                        st, bd = r.status, json.loads(r.read().decode("utf-8"))
                except urllib.error.HTTPError as e:
                    st, bd = e.code, json.loads(e.read().decode("utf-8"))
                except Exception as e:
                    st, bd = -1, {"message": str(e)}
            else:
                st, bd = call(m, p, b)
            out.append(check(label, st, bd, kind))

        out.append("\n[B] 服务端错（期望 5xx + 中文 message）")
        # B1：删除任务会走 repo -> 打真 REST -> 假 key 必 500
        st, bd = call("DELETE", "/tasks/1")
        out.append(check("B1 假 key 打真库(GRANT/鉴权失败)", st, bd, "server"))
        # B2：写入量实测同理
        out.append("     说明：config_error(缺 PUBLISHABLE_KEY) 需重启进程去掉环境变量，")
        out.append("           已单独实测 -> 500 config_error 中文「服务端配置缺失，请联系维护者」")

        out.append("\n[E] 真 key 下才走得到的分支（本地受假 key 限制，口径来自契约 + Day 22 实测）")
        out.append("  · DELETE /tasks/99999999 -> 404 task_not_found 「任务不存在，无法删除（可能已被删除）」")
        out.append("  · DELETE /tasks/0        -> 404 task_not_found（过正则但查不到；已登记为 §7.2 小瑕疵）")
        out.append("  · POST /steps/measure 重复提交 -> 409 already_measured「该步骤已经实测过，不能重复提交」")
        out.append("  · config_error（缺 PUBLISHABLE_KEY）-> 500 config_error"
                   "「服务端配置缺失，请联系维护者」——已由 error-triage-extra.py 实测")

        out.append("\n[C] 网络错（本地测不到，靠前端 client.js 转换）")
        out.append("  前端逻辑：fetch 抛异常 -> toNetworkError() -> ApiError(kind='network')")
        out.append("  · 断网/DNS 失败 -> '网络请求失败（<路径>），请检查网络后重试'")
        out.append("  · 超时 (8s)    -> '请求超时（超过 8 秒未响应）：<路径>'")
        out.append("  → 需浏览器 DevTools Offline 实测（交给你截图）")

        out.append("\n" + "=" * 64)
        n_pass = sum(1 for l in out if "[PASS]" in l)
        n_fail = sum(1 for l in out if "[FAIL]" in l)
        out.append("小结：PASS %d / FAIL %d" % (n_pass, n_fail))
        out.append("=" * 64)
    finally:
        proc.terminate()

    txt = "\n".join(out)
    with open(WS + r"\tests\error-triage-result.txt", "w", encoding="utf-8") as f:
        f.write(txt + "\n")
    print(txt)


if __name__ == "__main__":
    main()
