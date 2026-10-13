import { useEffect, useState } from "react";
import { fetchPanels, errorText } from "../api/client.js";

// 面板图 + 按键说明的独立加载（Day 28 板块 4）
//
// 为什么【不】并进 useAppData 的 Promise.all：
//   这四路老数据决定整页是「实时」还是「离线兜底」；而面板区块是新增的附加内容，
//   若把它绑进同一个 Promise.all，它一旦 500 就会把整站拖进离线兜底模式 ——
//   等于让新功能有能力砸掉老功能。所以这里单独加载、单独降级。
//
// status: "loading"（含等待主数据）| "ready" | "degraded"（拿不到，不编造数据）
export function usePanels(appStatus) {
  const [state, setState] = useState({ status: "loading", items: [], error: "" });

  useEffect(() => {
    // 主数据还在路上：先等着，避免两段加载各闪一次
    if (appStatus === "loading") return;

    // 整站已切离线兜底（接口整体不通）→ 本区块同样取不到，
    // 但不注入 mock：面板图在远端桶里，假数据配裂图没有意义。
    if (appStatus === "fallback") {
      setState({ status: "degraded", items: [], error: "当前为离线兜底内容，面板图未加载" });
      return;
    }

    let alive = true;
    setState({ status: "loading", items: [], error: "" });
    fetchPanels()
      .then((items) => {
        if (alive) setState({ status: "ready", items: items, error: "" });
      })
      .catch((e) => {
        if (alive) setState({ status: "degraded", items: [], error: errorText(e) });
      });
    return () => {
      alive = false;
    };
  }, [appStatus]);

  return state;
}
