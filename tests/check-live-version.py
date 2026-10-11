# -*- coding: utf-8 -*-
"""线上版本指纹校验器

用途：发布 / 回滚之后，机器化判定"**线上现在到底是哪个版本**"。
     不靠肉眼看页面，靠「产物文件名 + 字节数 + 特征串命中数」三重比对。

用法：
    python tests/check-live-version.py                  # 自动识别线上版本
    python tests/check-live-version.py --expect v1.0    # 断言线上必须是 v1.0（不符 → exit 1）
    python tests/check-live-version.py --list           # 列出已登记的版本指纹

背景：CloudBase 静态网站托管**没有平台级回退入口 / 部署历史**（文件管理只有上传、下载、删除），
     所以"回滚"= 重新上传旧产物。既然没有平台的版本号可依赖，就必须自己拿指纹比对。

网络：所有请求走 ProxyHandler({})，绕开本机系统代理（Day 16 起沿用的姿势）。
"""

import argparse
import re
import sys
import time
import urllib.request

sys.stdout.reconfigure(encoding="utf-8")

BASE = "https://wenwu-331122-d6gyrwmum2a734671-1498877015.tcloudbaseapp.com/wenwu-vibecoding/"

# ---- 已登记的版本指纹（发布 / 回滚后请把新版本补进来）----
PROFILES = {
    "v1.0": {
        "commit": "d3ad504",
        "note": "Day 26 冻结点；线上 v1.0（本手册发布验收时的版本）",
        "files": {
            "index.html": 541,
            "assets/index-ChUL683b.js": 173388,
            "assets/index-Dk9WJkSO.css": 7591,
        },
        "patterns": {
            "#/transfer/": 0,
            "Day 20": 0,
            "云数据库数据 · 实时": 1,
            "2026-10-04": 0,
            "2026-10-09": 1,
        },
    },
    "4c264a4": {
        "commit": "4c264a4",
        "note": "Day 24；回滚演练目标（与 v1.0 有 3 处可观测差异）",
        "files": {
            "index.html": 541,
            "assets/index-DzyjopGZ.js": 173400,
            "assets/index-Dk9WJkSO.css": 7591,
        },
        "patterns": {
            "#/transfer/": 1,
            "Day 20": 1,
            "云数据库数据 · 实时": 0,
            "2026-10-04": 1,
            "2026-10-09": 0,
        },
    },
}

# ⚠️ 判据提醒：不要用 "云数据库数据" 这种**短串**当指纹 —— 旧版徽标 "Day 20 · React · 云数据库数据"
#    也含这 6 个字，会两边都命中。必须带后半段 " · 实时"。
# ⚠️ 判据提醒：不要只搜特征串（React 产物自带 "[object Object]" 之类的报错文案）—— 字节数才是硬判据。


def fetch(path, bust_cache=True):
    url = BASE + path + ("?t=%d" % int(time.time()) if bust_cache else "")
    op = urllib.request.build_opener(urllib.request.ProxyHandler({}))
    op.addheaders = [
        ("User-Agent", "Mozilla/5.0"),
        ("Cache-Control", "no-cache"),
        ("Pragma", "no-cache"),
    ]
    with op.open(url, timeout=20) as r:
        return r.read()


def detect(tries=3, gap=8):
    """抓线上首页 → 解析引用的资源 → 返回 {相对路径: 字节数}。"""
    last = None
    for i in range(tries):
        try:
            html = fetch("index.html").decode("utf-8", "replace")
            assets = re.findall(r"(?:src|href)=\"\.?/?(assets/[^\"]+)\"", html)
            sizes = {"index.html": len(html.encode("utf-8"))}
            for a in sorted(set(assets)):
                sizes[a] = len(fetch(a))
            return sizes
        except Exception as e:  # noqa: BLE001
            last = e
            if i < tries - 1:
                time.sleep(gap)
    raise SystemExit("抓取线上失败：%s" % last)


def match(sizes):
    hit = []
    for name, p in PROFILES.items():
        if sizes == p["files"]:
            hit.append(name)
    return hit


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--expect", help="断言线上必须是这个版本 key")
    ap.add_argument("--list", action="store_true", help="只列出已登记指纹")
    args = ap.parse_args()

    if args.list:
        for name, p in PROFILES.items():
            print("%-10s commit=%-9s %s" % (name, p["commit"], p["note"]))
            for f, n in sorted(p["files"].items()):
                print("           %-32s %d" % (f, n))
            for k, v in p["patterns"].items():
                print("           特征串 %-18s 期望命中 %d" % (repr(k), v))
        return 0

    print("target:", BASE)
    sizes = detect()
    print("线上实际产物：")
    for f, n in sorted(sizes.items()):
        print("  %-34s %d bytes" % (f, n))

    hits = match(sizes)
    if not hits:
        print("结果：UNKNOWN —— 线上不符合任何已登记指纹（可能是新版本，或上传只完成了一半）")
        return 1

    name = hits[0]
    print("结果：线上 = %s（commit %s）" % (name, PROFILES[name]["commit"]))

    # 特征串二次确认（只用第一个命中的 profile 的 js 文件）
    js = [f for f in sizes if f.endswith(".js")]
    if js:
        body = fetch(js[0]).decode("utf-8", "replace")
        print("特征串复核：")
        for k, want in PROFILES[name]["patterns"].items():
            got = body.count(k)
            print("  %-20s 命中 %d（期望 %d）%s" % (repr(k), got, want, "OK" if got == want else "!!！不符"))

    if args.expect:
        ok = (args.expect in hits)
        print("断言：期望 %s → %s" % (args.expect, "PASS" if ok else "FAIL"))
        return 0 if ok else 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
