import { useEffect, useState } from "react";
import { fetchSceneDetail, kindLabel, errorText } from "../api/client.js";

// 场景详情视图（Day 24 新增，待办 #9）
// 路由：#/scene/scene-1 —— 调 GET /api/scenes/:id 拿场景 + 5 个步骤
// 视觉沿用第 2 周静态站（index.html）的场景板块：左侧主题色条 + 角落序号水印
//   + .scene-meta 前置条件条 + ol.steps 序号圆圈
//
// 三态：
//   loading  接口请求中
//   ready    拿到 item（含 steps[]）→ 完整渲染
//   degraded 接口失败 → 退到场景列表里那条（无 steps），并显示提示条（不白屏）

// 难度档级 → 星级展示。null/undefined 一律「待实测」——0 是真实实测值，不能混
function stars(level) {
  if (level === null || level === undefined) return null;
  var n = Math.max(0, Math.min(5, Number(level)));
  if (!Number.isFinite(n)) return null;
  return "★".repeat(n) + "☆".repeat(Math.max(0, 5 - n));
}

// 耗时展示：null 一律待实测（0 分钟是真实值，取整口径见契约 §7.2）
function minutesText(m) {
  if (m === null || m === undefined) return null;
  var n = Number(m);
  if (!Number.isFinite(n)) return null;
  return n + " 分钟";
}

function stepMeta(s) {
  var st = stars(s.difficulty_level);
  var mn = minutesText(s.time_minutes);
  // ⚠️ 不能用 "难度：" + <span>…</span> 字符串拼接——JSX 元素会被 toString 成
  //    "[object Object]"（Day 24 线上实测踩中）。必须在 JSX 子元素位置混排。
  return (
    <>
      难度：
      {st === null ? "待实测" : <span className="stars">{st}</span>}
      {" ｜ 耗时："}
      {mn === null ? "待实测" : <span className="mins">{mn}</span>}
    </>
  );
}

export default function SceneView({ sceneId, scenes }) {
  const [state, setState] = useState({ phase: "loading", item: null, error: null });

  useEffect(() => {
    let alive = true;
    if (!sceneId) {
      setState({ phase: "missing", item: null, error: null });
      return;
    }
    setState({ phase: "loading", item: null, error: null });
    fetchSceneDetail(sceneId)
      .then((item) => {
        if (alive) setState({ phase: "ready", item: item, error: null });
      })
      .catch((e) => {
        if (alive) setState({ phase: "degraded", item: null, error: e });
      });
    return () => {
      alive = false;
    };
  }, [sceneId]);

  if (!sceneId) {
    return (
      <section className="view" aria-label="场景详情">
        <h2>场景详情</h2>
        <p className="scene-desc">没有指定场景编号。</p>
        <p>
          <a className="scene-back" href="#/transfer">
            ← 回到传输指南
          </a>
        </p>
      </section>
    );
  }

  if (state.phase === "loading") {
    return (
      <section className="view" aria-label="场景详情">
        <div className="state-box state-box--info" role="status">
          正在加载场景 {sceneId} 的步骤……
        </div>
      </section>
    );
  }

  // 取展示数据：优先接口返回的 item；接口失败则退到场景列表那条（无 steps）
  const listed = (scenes || []).find((s) => s.id === sceneId) || null;
  const item = state.item || listed;

  if (!item) {
    return (
      <section className="view" aria-label="场景详情">
        <h2>场景详情</h2>
        <div className="state-box" role="alert">
          <b>找不到场景「{sceneId}」。</b>
          当前只有 scene-1 至 scene-4 四个场景。
        </div>
        <p>
          <a className="scene-back" href="#/transfer">
            ← 回到传输指南
          </a>
        </p>
      </section>
    );
  }

  const steps = item.steps || [];

  return (
    <section className={"view scene-detail " + ("scene--" + item.id)} aria-label={"场景详情：" + item.name}>
      <span className="scene-no" aria-hidden="true">
        {item.no}
      </span>

      <div className="scene-head">
        <h2>
          {item.no} {item.name}
        </h2>
        <p className="scene-desc">{item.description}</p>
        {item.device_note ? (
          <span className="device-tag">适用：{item.device_note}</span>
        ) : null}
      </div>

      <div className="scene-meta">
        <span>
          <b>方式：</b>
          {item.method}
        </span>
        {/* 离线兜底（mock）没有 prerequisite 字段，故降级时要能优雅落空 */}
        <span>
          <b>前置条件：</b>
          {item.prerequisite || "详见步骤说明"}
        </span>
        <span>
          <b>总耗时：</b>
          {item.time_cost || "待实测"}
        </span>
      </div>

      {state.phase === "degraded" && (
        <div className="state-box state-box--warn" role="alert">
          <b>{kindLabel(state.error && state.error.kind)}：</b>
          {errorText(state.error)}。步骤详情没能取回（离线模式暂无步骤详情），
          以上是场景概况；恢复网络后刷新页面即可查看完整步骤。
        </div>
      )}

      {steps.length > 0 ? (
        <ol className="steps">
          {steps.map((s) => (
            <li key={s.order_no}>
              <p className="step-text">{s.content}</p>
              <p className="step-meta">{stepMeta(s)}</p>
              {s.caution ? <p className="note">坑：{s.caution}</p> : null}
            </li>
          ))}
        </ol>
      ) : (
        <div className="state-box state-box--info">
          这个场景还没有可显示的步骤（离线模式下步骤详情不可用）。
        </div>
      )}

      <p>
        <a className="scene-back" href="#/transfer">
          ← 回到传输指南
        </a>
      </p>
    </section>
  );
}
