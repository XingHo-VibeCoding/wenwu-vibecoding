import { useMemo, useState } from "react";
import { INSTRUMENT_OPS, MOCK, TASK_INDEX } from "../data/mock.js";
import OpItem from "../components/OpItem.jsx";

function norm(s) {
  return String(s == null ? "" : s).toLowerCase();
}

export default function SearchView() {
  const [taskQ, setTaskQ] = useState("");
  const [insQ, setInsQ] = useState("");

  // 任务/场景搜索：命中 任务别名 + 所属场景的名称/描述/方法
  const taskHits = useMemo(() => {
    const q = norm(taskQ.trim());
    if (!q) return null;
    return TASK_INDEX.filter((t) => {
      const s = MOCK.scenes.find((x) => x.anchor === t.scene);
      const hay = norm(
        t.label + " " + (s ? s.no + " " + s.name + " " + s.desc + " " + s.method : "")
      );
      return hay.indexOf(q) > -1;
    });
  }, [taskQ]);

  // 仪器操作搜索：命中 操作名 + 关键词表
  const insHits = useMemo(() => {
    const q = norm(insQ.trim());
    if (!q) return null;
    return INSTRUMENT_OPS.filter((op) => {
      if (norm(op.title).indexOf(q) > -1) return true;
      return op.k.some((k) => norm(k).indexOf(q) > -1);
    });
  }, [insQ]);

  return (
    <section className="view" aria-label="搜索">
      <h2>搜索</h2>
      <p className="sv-desc">
        两个搜索框各管一路：上面找「要办的事」，下面查「仪器怎么用」。数据全部内置在页面里，断网照常用。
      </p>

      <div className="sv-field">
        <label htmlFor="sv-task">① 找任务 / 场景</label>
        <input
          id="sv-task"
          type="search"
          autoComplete="off"
          placeholder="如：拍板书 / 交作业 / 大文件"
          value={taskQ}
          onChange={(e) => setTaskQ(e.target.value)}
        />
      </div>
      <div className="sv-result" aria-live="polite">
        {taskHits === null ? (
          <p className="sv-hint">输入关键词开始查找，例如「拍板书」。</p>
        ) : taskHits.length === 0 ? (
          <p className="sv-hint">没有匹配「{taskQ.trim()}」的任务，换个更短的关键词试试。</p>
        ) : (
          <ul className="sv-list">
            {taskHits.map((t) => {
              const s = MOCK.scenes.find((x) => x.anchor === t.scene);
              return (
                <li key={t.label}>
                  <a href={"#/transfer/" + t.scene}>
                    <b>{t.label}</b>
                    {s ? " → " + s.no + " " + s.name + "（" + s.method + "）" : ""}
                  </a>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className="sv-field">
        <label htmlFor="sv-ins">② 找仪器操作</label>
        <input
          id="sv-ins"
          type="search"
          autoComplete="off"
          placeholder="如：通断 / 限流 / 正弦波"
          value={insQ}
          onChange={(e) => setInsQ(e.target.value)}
        />
      </div>
      <div className="sv-result" aria-live="polite">
        {insHits === null ? (
          <p className="sv-hint">输入关键词查找仪器操作，例如「通断」。</p>
        ) : insHits.length === 0 ? (
          <p className="sv-hint">没有匹配「{insQ.trim()}」的操作，换个更短的关键词试试。</p>
        ) : (
          <>
            <p className="sv-count">{insHits.length} 条匹配结果</p>
            <ul className="ins-list">
              {insHits.map((op, i) => (
                <OpItem key={op.t + op.title + i} op={op} />
              ))}
            </ul>
          </>
        )}
      </div>
    </section>
  );
}
