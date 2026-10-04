import { useMemo, useState } from "react";
import OpItem from "../components/OpItem.jsx";

// 类型标签与第 2 周静态站（index.html 的 .ins-chip）完全一致；
// 筛选沿用「device_name 前缀子串匹配」（接口与 mock 的 device_name 同值，如「万用表 GDM-8341」）
const TYPES = ["全部", "直流电源", "万用表", "示波器", "信号发生器", "LCR测试仪", "图示仪"];

function norm(s) {
  return String(s == null ? "" : s).toLowerCase();
}

export default function DeviceView({ instruments }) {
  const [type, setType] = useState("全部");
  const [q, setQ] = useState("");

  const hits = useMemo(() => {
    const pool =
      type === "全部"
        ? instruments
        : instruments.filter((op) => op.device_name.indexOf(type) > -1);
    const key = norm(q.trim());
    if (!key) return pool;
    return pool.filter((op) => {
      if (norm(op.title).indexOf(key) > -1) return true;
      return op.keywords.some((k) => norm(k).indexOf(key) > -1);
    });
  }, [type, q, instruments]);

  const filtered = type !== "全部" || q.trim().length > 0;

  return (
    <section className="view" aria-label="设备指南">
      <h2 id="instruments">仪器速查</h2>
      <p className="ins-desc">
        6 台实验室常用仪器的 34 条常用操作（提炼自厂商说明书，标注出处页码）。点下方按钮按仪器类型筛选，或输入关键词实时过滤。
      </p>

      <div className="ins-filter" role="group" aria-label="按仪器类型筛选">
        {TYPES.map((t) => (
          <button
            key={t}
            type="button"
            className="ins-chip"
            aria-pressed={t === type}
            onClick={() => setType(t)}
          >
            {t === "LCR测试仪" ? "LCR 测试仪" : t}
          </button>
        ))}
      </div>

      <div className="sv-field">
        <label htmlFor="ins-q">关键词</label>
        <input
          id="ins-q"
          type="search"
          autoComplete="off"
          placeholder="如：通断 / 限流 / 正弦波"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>

      <p className="ins-count" aria-live="polite">
        {filtered ? hits.length + " 条匹配结果" : "共 " + hits.length + " 条操作"}
      </p>

      {hits.length === 0 ? (
        <div className="state-box">
          <b>没有匹配「{q.trim() || type}」的操作。</b>
          <br />
          换个更短的关键词试试，或点回「全部」。
        </div>
      ) : (
        <ul className="ins-list">
          {hits.map((op, i) => (
            <OpItem key={op.device_name + op.title + i} op={op} />
          ))}
        </ul>
      )}
    </section>
  );
}
