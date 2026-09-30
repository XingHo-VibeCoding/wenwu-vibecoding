import { useEffect, useState } from "react";

export const VIEWS = ["search", "transfer", "device"];
export const DEFAULT_VIEW = "search";

// hash 解析：形如 #/transfer/scene-1 → { view: "transfer", anchor: "scene-1" }
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
