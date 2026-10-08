export default function TransferView({ scenes, resources }) {
  return (
    <section className="view" aria-label="传输指南">
      <h2>手机 ↔ 电脑 传输指南</h2>
      <p className="mv-desc">
        四个高频场景一目了然。数据来自云端数据库；断网或接口异常时自动使用内置离线内容。
      </p>

      <ul className="mv-cards">
        {scenes.map((s) => (
          <li key={s.id} id={s.id}>
            {/* Day 24：卡片从「锚点跳转」改为「进入场景详情页」（#/scene/scene-1） */}
            <a className="mv-card" href={"#/scene/" + s.id}>
              <span className="mv-card-no">{s.no}</span>
              <h3>{s.name}</h3>
              <p>{s.description}</p>
              <p className="mv-card-meta">
                方式：{s.method} ｜ {s.step_count} 步 ｜ 难度 {s.difficulty} ｜ 耗时{" "}
                {s.time_cost}
              </p>
            </a>
          </li>
        ))}
      </ul>

      <h2 id="resources">资源入口</h2>
      <ul className="res-list">
        {resources.map((r) => (
          <li key={r.url}>
            <a href={r.url} target="_blank" rel="noopener noreferrer">
              {r.name}
            </a>
            <span className="res-use">{r.purpose}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
