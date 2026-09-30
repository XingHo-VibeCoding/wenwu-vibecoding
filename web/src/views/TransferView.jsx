import { MOCK } from "../data/mock.js";

export default function TransferView() {
  const { scenes, resources } = MOCK;

  return (
    <section className="view" aria-label="传输指南">
      <h2>手机 ↔ 电脑 传输指南</h2>
      <p className="mv-desc">
        四个高频场景一目了然。本版是 React 骨架（mock 数据）；分步详情将在 Day 16–20 接上真实接口后补全。
      </p>

      <ul className="mv-cards">
        {scenes.map((s) => (
          <li key={s.anchor} id={s.anchor}>
            <a className="mv-card" href={"#/transfer/" + s.anchor}>
              <span className="mv-card-no">{s.no}</span>
              <h3>{s.name}</h3>
              <p>{s.desc}</p>
              <p className="mv-card-meta">
                方式：{s.method} ｜ {s.steps} 步 ｜ 难度 {s.difficulty} ｜ 耗时 {s.time}
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
            <span className="res-use">{r.use}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
