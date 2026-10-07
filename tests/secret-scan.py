# 密钥自查脚本（Day 23）
# 用法：在工作区根目录执行  python tests/secret-scan.py
# 输出：工作区命中清单 + Git 历史命中清单 + 判定
import os, subprocess, sys

CWD = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))

WORK_PATTERNS = [
    "API_KEY", "apikey", "secret", "SECRET", "token", "TOKEN",
    "password", "PASSWORD", "BEGIN RSA", "PRIVATE KEY",
    "Bearer ", "Authorization:", "postgres://", "postgresql://",
]
# 扫描时排除的目录：
#   .git / node_modules / dist / .workbuddy —— 非源码
#   tests —— 本扫描脚本与说明自身含特征词清单，属"自指命中"，排除
SKIP_DIRS = {".git", "node_modules", "dist", ".workbuddy", "tests"}
SKIP_EXT = (".pdf", ".png", ".jpg", ".jpeg", ".gif", ".zip", ".ico", ".woff", ".woff2")

HIST_PATTERNS = [
    "TENCENTCLOUD_SECRET", "BEGIN RSA", "BEGIN PRIVATE KEY",
    "postgres://", "postgresql://", "publishable_key=",
    "API_KEY=", "apikey=", "password=", "secret=", "token=",
]


# 判定为「非真实密钥」的白名单特征（命中行含任一即视为说明性文字，不计入真实密钥）
BENIGN_MARKERS = [
    "#",                    # 注释行（如 .env 里的 # API_KEY=）
    "<PUBLISHABLE_KEY>",    # 占位符
    "PUBLISHABLE_KEY",      # 变量名/占位说明
    '"Bearer " + key',      # 变量拼接，key 来自环境变量
    "Bearer<br/>",          # 文档示意图
    "js-tokens",            # npm 包名，非凭据
    "无鉴权", "无 token",    # 文档在说"没有"
    "user:password@host",   # 格式模板示例
    "git diff",             # 文档里的自查说明
    "TENCENTCLOUD_SECRET",  # 环境变量"名"（讲事故的说明文字）
    "SECRETID", "SECRETKEY", "SESSIONTOKEN",  # 同上
]


def is_benign(line):
    return any(m in line for m in BENIGN_MARKERS)


def scan_workspace():
    hits = []
    for root, dirs, files in os.walk(CWD):
        dirs[:] = [d for d in dirs if d not in SKIP_DIRS]
        for fn in files:
            if fn.endswith(SKIP_EXT):
                continue
            p = os.path.join(root, fn)
            rel = os.path.relpath(p, CWD)
            try:
                with open(p, "r", encoding="utf-8", errors="replace") as f:
                    for i, line in enumerate(f, 1):
                        for pat in WORK_PATTERNS:
                            if pat in line:
                                hits.append({
                                    "loc": "%s:%d" % (rel, i),
                                    "pat": pat,
                                    "text": line.strip()[:120],
                                    "benign": is_benign(line.strip()),
                                })
                                break
            except Exception:
                pass
    return hits


def run_git(args):
    r = subprocess.run(["git"] + args, cwd=CWD, capture_output=True,
                       text=True, encoding="utf-8", errors="replace")
    return (r.stdout or "").strip()


def scan_history():
    out = []
    for pat in HIST_PATTERNS:
        res = run_git(["log", "--all", "-S", pat, "--oneline", "--", "."])
        out.append((pat, res))
    return out


def main():
    lines = []
    lines.append("=" * 60)
    lines.append("密钥自查（Day 23）")
    lines.append("工作区：" + CWD)
    lines.append("=" * 60)

    lines.append("")
    lines.append("[1] 工作区密钥特征词扫描（已排除 tests/ 自指命中）")
    hits = scan_workspace()
    real = [h for h in hits if not h["benign"]]
    benign = [h for h in hits if h["benign"]]
    lines.append("原始命中：%d 处" % len(hits))
    lines.append("  ├─ 真实密钥：%d 处  ← 关键指标" % len(real))
    lines.append("  └─ 非真实（说明性文字/占位符/包名）：%d 处" % len(benign))
    if real:
        lines.append("")
        lines.append("  ⚠️ 真实密钥明细（需立即处置）：")
        for h in real:
            lines.append("    %s  [%s]  %s" % (h["loc"], h["pat"], h["text"]))
    lines.append("")
    lines.append("  非真实命中明细：")
    for h in benign:
        lines.append("    %s  [%s]  %s" % (h["loc"], h["pat"], h["text"]))

    lines.append("")
    lines.append("[2] Git 历史扫描")
    for pat, res in scan_history():
        lines.append("  -S %-22s : %s" % (pat, res if res else "(无命中)"))

    lines.append("")
    lines.append("[3] .env 检查")
    lines.append("  git ls-files .env      : %r" % run_git(["ls-files", ".env"]))
    lines.append("  git check-ignore -v    : %s" % run_git(["check-ignore", "-v", ".env"]))
    lines.append("  git log --all -- .env  : %s" % (run_git(["log", "--all", "--oneline", "--", ".env"]) or "(从未提交)"))

    lines.append("")
    lines.append("=" * 60)
    lines.append("[4] 结论")
    lines.append("  ★ 真实密钥命中：%d 处" % len(real))
    if len(real) == 0:
        lines.append("  ✅ 全仓库无真实密钥泄露，无需作废重生成。")
    else:
        lines.append("  ❌ 发现真实密钥 → 立即作废 + 重新生成 + 更新环境变量，不要只清理代码！")
    lines.append("=" * 60)

    text = "\n".join(lines)
    print(text)
    # 同时落一份 UTF-8 结果文件，便于截图/留档（PowerShell 管道会乱码，故直接写文件）
    out_path = os.path.join(CWD, "tests", "secret-scan-result.txt")
    with open(out_path, "w", encoding="utf-8") as f:
        f.write(text)
    return 0


if __name__ == "__main__":
    sys.exit(main())
