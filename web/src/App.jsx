import { useEffect } from "react";
import { NAV_VIEWS, useHashRoute } from "./hooks/useHashRoute.js";
import { useAppData } from "./hooks/useFetch.js";
import { kindLabel } from "./api/client.js";
import SearchView from "./views/SearchView.jsx";
import TransferView from "./views/TransferView.jsx";
import DeviceView from "./views/DeviceView.jsx";
import SceneView from "./views/SceneView.jsx";

const TITLES = { search: "搜索", transfer: "传输指南", device: "设备指南", scene: "场景详情" };

export default function App() {
  const { view, anchor } = useHashRoute();
  const { status, data, error, errorKind } = useAppData();

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
  }, [view, anchor, status]);

  const badge =
    status === "loading"
      ? "正在连接云端数据库…"
      : status === "ready"
      ? "云数据库数据 · 实时"
      : "离线内容（接口未响应，已自动兜底）";

  return (
    <div className="wrap">
      <header className="site">
        <span className="badge">{badge}</span>
        <h1>电子设备使用指南</h1>
        <p className="tagline">
          写给用 Android 手机 + Windows 电脑的理工科学生：每件事分几步、每步多难、要多久，动手前先看清楚。
        </p>
        <nav className="views" aria-label="视图切换">
          {NAV_VIEWS.map((v) => (
            <a key={v} href={"#/" + v} aria-current={v === view ? "page" : undefined}>
              {TITLES[v]}
            </a>
          ))}
        </nav>
      </header>

      <main>
        {status === "loading" ? (
          <div className="state-box" role="status">
            正在加载数据……
          </div>
        ) : (
          <>
            {status === "fallback" && (
              <div className="state-box" role="alert">
                <b>{kindLabel(errorKind)}：</b>
                {error}。已切换为内置离线内容，恢复网络后刷新页面即可重试。
              </div>
            )}
            {view === "search" && (
              <SearchView
                scenes={data.scenes}
                instruments={data.instruments}
                tasks={data.tasks}
              />
            )}
            {view === "transfer" && (
              <TransferView scenes={data.scenes} resources={data.resources} />
            )}
            {view === "device" && <DeviceView instruments={data.instruments} />}
            {view === "scene" && (
              <SceneView sceneId={anchor} scenes={data.scenes} />
            )}
          </>
        )}
      </main>

      <footer className="site">
        <p>
          <b>更新日期：</b>2026-10-09 ｜ <b>版本：</b>React 版（数据来自 CloudBase 云数据库，接口异常自动切换内置离线内容）
        </p>
        <p>
          <b>卡住了找谁：</b>先看对应场景的「方法」列；仍不通就在班级群里问同学，或找实验室老师。
        </p>
      </footer>
    </div>
  );
}
