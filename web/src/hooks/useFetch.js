import { useEffect, useState } from "react";
import {
  fetchScenes,
  fetchResources,
  fetchInstruments,
  fetchTasks,
} from "../api/client.js";
import { MOCK, INSTRUMENT_OPS, TASK_INDEX } from "../data/mock.js";

// 兜底数据：mock 字段名已与接口口径一致（Day 20 改名），两源同构
function fallbackData() {
  return {
    scenes: MOCK.scenes,
    resources: MOCK.resources,
    instruments: INSTRUMENT_OPS,
    tasks: TASK_INDEX,
  };
}

const EMPTY = { scenes: [], resources: [], instruments: [], tasks: [] };

// 全量拉取四路数据：全部成功 → ready（真数据）；任一失败 → fallback（整体落 mock）
// status: "loading" | "ready" | "fallback"
export function useAppData() {
  const [state, setState] = useState({
    status: "loading",
    data: EMPTY,
    error: "",
  });

  useEffect(() => {
    let alive = true;
    Promise.all([fetchScenes(), fetchResources(), fetchInstruments(), fetchTasks()])
      .then(([scenes, resources, instruments, tasks]) => {
        if (alive) {
          setState({
            status: "ready",
            data: { scenes, resources, instruments, tasks },
            error: "",
          });
        }
      })
      .catch((e) => {
        if (alive) {
          setState({
            status: "fallback",
            data: fallbackData(),
            error: e && e.message ? e.message : "未知错误",
          });
        }
      });
    return () => {
      alive = false;
    };
  }, []);

  return state;
}
