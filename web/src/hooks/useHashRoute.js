import { useEffect, useState } from "react";

// Day 24 新增 "scene"：场景详情视图（#/scene/scene-1）
// 注意：它不在主导航（VIEWS 里的前三项才是导航项），只在卡片点击后进入
export const VIEWS = ["search", "transfer", "device", "scene"];
// 主导航显示的视图（scene 是详情页，不进导航栏）
export const NAV_VIEWS = ["search", "transfer", "device"];
export const DEFAULT_VIEW = "search";

// hash 解析：形如 #/transfer/scene-1 → { view: "transfer", anchor: "scene-1" }
//          形如 #/scene/scene-1   → { view: "scene",   anchor: "scene-1" }
// 与第 2 周静态站（index.html）的路由口径保持一致
export function parseHash(hash) {
  const parts = String(hash || "")
    .replace(/^#\/?/, "")
    .split("/")
    .filter((s) => s.length > 0);
  const view = parts[0] && VIEWS.indexOf(parts[0]) > -1 ? parts[0] : DEFAULT_VIEW;
  return { view, anchor: parts[1] || "" };
}

export function useHashRoute() {
  const [route, setRoute] = useState(() => parseHash(window.location.hash));

  useEffect(() => {
    function onHashChange() {
      setRoute(parseHash(window.location.hash));
    }
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  return route;
}
