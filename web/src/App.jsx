import { useEffect } from "react";
import { VIEWS, useHashRoute } from "./hooks/useHashRoute.js";
import SearchView from "./views/SearchView.jsx";
import TransferView from "./views/TransferView.jsx";
import DeviceView from "./views/DeviceView.jsx";

const TITLES = { search: "搜索", transfer: "传输指南", device: "设备指南" };

export default function App() {
  const { view, anchor } = useHashRoute();

  useEffect(() => {
    document.title = TITLES[view] + " ｜ 电子设备使用指南";
    if (anchor) {
      const el = document.getElementById(anchor);
      if (el) {
        el.scrollIntoView({ block: "start" });
        return;
      }
    }
    window.scrollTo({ top: 0, behavior: "auto" });
  }, [view, anchor]);

  return (
    <div className="wrap">
      <header className="site">
        <span className="badge">Day 15 · React 骨架 · mock 数据</span>
        <h1>电子设备使用指南</h1>
        <p className="tagline">
          写给用 Android 手机 + Windows 电脑的理工科学生：每件事分几步、每步多难、要多久，动手前先看清楚。
        </p>
        <nav className="views" aria-label="视图切换">
          {VIEWS.map((v) => (
            <a key={v} href={"#/" + v} aria-current={v === view ? "page" : undefined}>
              {TITLES[v]}
            </a>
          ))}
        </nav>
      </header>

      <main>
        {view === "search" && <SearchView />}
        {view === "transfer" && <TransferView />}
        {view === "device" && <DeviceView />}
      </main>

      <footer className="site">
        <p>
          <b>更新日期：</b>2026-09-30 ｜ <b>版本：</b>React 版骨架（mock 数据），真实数据接口 Day 16–20 接入。
        </p>
        <p>
          <b>卡住了找谁：</b>先看对应场景的「方法」列；仍不通就在班级群里问同学，或找实验室老师。
        </p>
      </footer>
    </div>
  );
}
