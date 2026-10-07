// 数据来源：CloudBase 云函数网关（Day 17 起上线，6 个读接口，网关已内置 CORS）
// 地址整串复制自 api-contract.md §1.1（网关域名含环境 ID 段与 .ap-shanghai 地域段），严禁手打
const API_BASE =
  "https://wenwu-331122-d6gyrwmum2a734671-1498887015.ap-shanghai.app.tcloudbase.com/api";

const TIMEOUT_MS = 8000;

// ============================================================
// 全局统一错误类（Day 23 新增）
// ------------------------------------------------------------
// 为什么要有它：以前每处调用各自 throw new Error(中文串)，导致
//   ① 前端拿到的错误"没有类型"，无法判断是输入错/网络错/服务端错；
//   ② 文案散落在多处，改口径要改好多地方，容易漏。
// 现在统一为 ApiError：错误种类用 kind 表达，中文文案用 message 承载。
//
// kind 三类（对应清单要求的"三类错误"）：
//   "input"  输入错   —— 用户填的东西不对（400/404/405 + 网关拦下的错误路径）
//   "network" 网络错  —— 请求发不出去 / 超时 / 响应不是合法 JSON
//   "server" 服务端错 —— 后端自己出问题（任意 5xx，如 500 缺 GRANT、config_error）
// ============================================================
export class ApiError extends Error {
  constructor(kind, message, detail) {
    super(message);
    this.name = "ApiError";
    this.kind = kind;
    this.detail = detail || null;
  }
}

// 按 HTTP 状态码判定错误种类：5xx 归服务端，其余（4xx）归输入
function kindOfStatus(status) {
  return status >= 500 ? "server" : "input";
}

// 解析响应体（拿不到就返回 null，不抛）
async function readBody(res) {
  try {
    return await res.json();
  } catch (e) {
    return null;
  }
}

// 把「网络层异常」统一转成 network 型 ApiError
// 覆盖：AbortError（超时中断）、TypeError（DNS/断网/CORS）
function toNetworkError(e, what) {
  var timeout =
    e && (e.name === "AbortError" || String(e.message || "").indexOf("abort") > -1);
  if (timeout) {
    return new ApiError("network", "请求超时（超过 " + TIMEOUT_MS / 1000 + " 秒未响应）：" + what, e);
  }
  return new ApiError("network", "网络请求失败（" + what + "），请检查网络后重试", e);
}

// 从响应体里取中文提示：后端 message 优先，取不到再兜底
function messageFromBody(body, fallback) {
  return body && body.message ? body.message : fallback;
}

// 统一 GET 列表：超时中断 + ok:false 转异常（透传后端中文 message）+ 网络错误转中文
// 所有列表接口响应形状统一为 { ok: true, count, items }（契约 §4.2 / §4.3）
async function fetchList(path) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  let res;
  try {
    res = await fetch(API_BASE + path, { signal: ctrl.signal });
  } catch (e) {
    clearTimeout(timer);
    throw toNetworkError(e, path);
  }
  clearTimeout(timer);

  const body = await readBody(res);
  if (body === null) {
    throw new ApiError("network", "响应不是合法 JSON（" + path + "）");
  }
  if (!res.ok || body.ok !== true || !Array.isArray(body.items)) {
    throw new ApiError(
      kindOfStatus(res.status),
      messageFromBody(body, "接口返回异常（" + path + "）"),
      { status: res.status, error: body && body.error }
    );
  }
  return body.items;
}

export const fetchScenes = () => fetchList("/scenes");
export const fetchResources = () => fetchList("/resources");
export const fetchInstruments = () => fetchList("/instruments");
export const fetchTasks = () => fetchList("/tasks");

// 删除一条任务（DELETE /api/tasks/:id，契约 §4.6）
// 成功形状为 { ok: true, deleted: { id, label } }，与列表接口的 items 不同，故不复用 fetchList
export async function deleteTask(id) {
  const what = "删除任务 " + id;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  let res;
  try {
    res = await fetch(API_BASE + "/tasks/" + id, {
      method: "DELETE",
      signal: ctrl.signal,
    });
  } catch (e) {
    clearTimeout(timer);
    throw toNetworkError(e, what);
  }
  clearTimeout(timer);

  const body = await readBody(res);
  if (body === null) {
    throw new ApiError("network", "响应不是合法 JSON（" + what + "）");
  }
  if (!res.ok || body.ok !== true) {
    throw new ApiError(
      kindOfStatus(res.status),
      messageFromBody(body, "删除失败（任务 " + id + "）"),
      { status: res.status, error: body && body.error }
    );
  }
  return body.deleted;
}

// 错误分类展示用小工具：把 ApiError.kind 转成中文标签（前端组件可直接用）
export function kindLabel(kind) {
  if (kind === "input") return "输入有误";
  if (kind === "network") return "网络异常";
  if (kind === "server") return "服务端异常";
  return "未知错误";
}

// 统一取"可展示的中文错误信息"：ApiError 直接用 message，其它异常兜底
export function errorText(e) {
  if (e && e instanceof ApiError) return e.message;
  if (e && e.message) return String(e.message);
  return "未知错误";
}
