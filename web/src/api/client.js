// 数据来源：CloudBase 云函数网关（Day 17 起上线，6 个读接口，网关已内置 CORS）
// 地址整串复制自 api-contract.md §1.1（网关域名含环境 ID 段与 .ap-shanghai 地域段），严禁手打
const API_BASE =
  "https://wenwu-331122-d6gyrwmum2a734671-1498887015.ap-shanghai.app.tcloudbase.com/api";

const TIMEOUT_MS = 8000;

// 统一 GET 列表：超时中断 + ok:false 转异常（取中文 message）+ 网络错误转中文
// 所有列表接口响应形状统一为 { ok: true, count, items }（契约 §4.2 / §4.3）
async function fetchList(path) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  let res;
  try {
    res = await fetch(API_BASE + path, { signal: ctrl.signal });
  } catch (e) {
    clearTimeout(timer);
    throw new Error("网络请求失败（" + path + "）");
  }
  clearTimeout(timer);
  let body;
  try {
    body = await res.json();
  } catch (e) {
    throw new Error("响应不是合法 JSON（" + path + "）");
  }
  if (!res.ok || !body || body.ok !== true || !Array.isArray(body.items)) {
    throw new Error(
      body && body.message ? body.message : "接口返回异常（" + path + "）"
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
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  let res;
  try {
    res = await fetch(API_BASE + "/tasks/" + id, {
      method: "DELETE",
      signal: ctrl.signal
    });
  } catch (e) {
    clearTimeout(timer);
    throw new Error("网络请求失败（删除任务 " + id + "）");
  }
  clearTimeout(timer);
  let body;
  try {
    body = await res.json();
  } catch (e) {
    throw new Error("响应不是合法 JSON（删除任务 " + id + "）");
  }
  if (!res.ok || !body || body.ok !== true) {
    throw new Error(
      body && body.message ? body.message : "删除失败（任务 " + id + "）"
    );
  }
  return body.deleted;
}
