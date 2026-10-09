import { useMemo, useState } from "react";
import OpItem from "../components/OpItem.jsx";
import { deleteTask, kindLabel, errorText } from "../api/client.js";

function norm(s) {
  return String(s == null ? "" : s).toLowerCase();
}

export default function SearchView({ scenes, instruments, tasks }) {
  const [taskQ, setTaskQ] = useState("");
  const [insQ, setInsQ] = useState("");
  const [delMsg, setDelMsg] = useState("");
  const [busyId, setBusyId] = useState(null);
  const [removedIds, setRemovedIds] = useState([]);

  // 任务/场景搜索：命中 任务别名 + 所属场景的名称/描述/方法
  const taskHits = useMemo(() => {
    const q = norm(taskQ.trim());
    if (!q) return null;
    return tasks.filter((t) => {
      if (removedIds.indexOf(t.id) > -1) return false;
      const s = scenes.find((x) => x.id === t.scene_id);
      const hay = norm(
        t.label + " " + (s ? s.no + " " + s.name + " " + s.description + " " + s.method : "")
      );
      return hay.indexOf(q) > -1;
    });
  }, [taskQ, tasks, scenes, removedIds]);

  async function onDelete(t) {
    const yes = window.confirm(
      "将删除任务《" + t.label + "》(id=" + t.id + ")，此操作不可撤销。\n\n确定删除吗？"
    );
    if (!yes) return;
    setBusyId(t.id);
    setDelMsg("");
    try {
      const gone = await deleteTask(t.id);
      setRemovedIds((prev) => prev.concat([t.id]));
      setDelMsg(
        "已删除任务《" + (gone && gone.label ? gone.label : t.label) + "》(id=" + t.id + ")。"
      );
    } catch (e) {
      // Day 23：统一走"类别 + 中文 message"，不再裸拼 e.message
      setDelMsg("删除失败（" + kindLabel(e && e.kind) + "）：" + errorText(e));
    } finally {
      setBusyId(null);
    }
  }


  // 仪器操作搜索：命中 操作名 + 关键词表
  const insHits = useMemo(() => {
    const q = norm(insQ.trim());
    if (!q) return null;
    return instruments.filter((op) => {
      if (norm(op.title).indexOf(q) > -1) return true;
      return op.keywords.some((k) => norm(k).indexOf(q) > -1);
    });
  }, [insQ, instruments]);

  return (
    <section className="view" aria-label="搜索">
      <h2>搜索</h2>
      <p className="sv-desc">
        两个搜索框各管一路：上面找「要办的事」，下面查「仪器怎么用」。数据来自云端数据库，断网或接口异常时自动使用内置离线内容。
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
        {delMsg && (
          <p className="sv-delmsg" role="status">
            {delMsg}
          </p>
        )}
        {taskHits === null ? (
          <p className="sv-hint">输入关键词开始查找，例如「拍板书」。</p>
        ) : taskHits.length === 0 ? (
          <p className="sv-hint">没有匹配「{taskQ.trim()}」的任务，换个更短的关键词试试。</p>
        ) : (
          <ul className="sv-list">
            {taskHits.map((t) => {
              const s = scenes.find((x) => x.id === t.scene_id);
              return (
                <li key={t.id}>
                  <a href={"#/scene/" + t.scene_id}>
                    <b>{t.label}</b>
                    {s ? " → " + s.no + " " + s.name + "（" + s.method + "）" : ""}
                  </a>
                  <button
                    type="button"
                    className="sv-del"
                    disabled={busyId === t.id}
                    onClick={() => onDelete(t)}
                    title={"删除任务「" + t.label + "」"}
                  >
                    {busyId === t.id ? "删除中…" : "删除"}
                  </button>
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
                <OpItem key={op.device_name + op.title + i} op={op} />
              ))}
            </ul>
          </>
        )}
      </div>
    </section>
  );
}
