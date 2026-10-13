import { useState } from "react";

// 单台仪器的「面板图 + 按键说明」卡片（Day 28 板块 4）
//
// 两个刻意的设计：
//   1) 默认收起 —— 6 台全展开会让设备页变得很长；点卡片头展开本台。
//   2) 图可点开原图 —— 面板缩略显示时丝印小字物理上读不出（示波器最小字仅 1.1pt），
//      新标签打开原始 WebP 才能放大看清，这是零成本方案（不新增依赖、不加接口）。
export default function PanelCard({ panel }) {
  const [open, setOpen] = useState(false);
  const [imgBroken, setImgBroken] = useState(false);

  const keys = panel.keys || [];
  const noDesc = keys.length > 0 && keys.every((k) => !k.function_desc);
  const bodyId = "panel-body-" + panel.device_type;

  return (
    <li className="panel-card">
      <button
        type="button"
        className="panel-head"
        aria-expanded={open}
        aria-controls={bodyId}
        onClick={() => setOpen(!open)}
      >
        <span className="panel-title">{panel.device_name}</span>
        <span className="panel-meta">
          {panel.image_desc} · {keys.length} 个按键/部件
        </span>
        <span className="panel-toggle" aria-hidden="true">
          {open ? "收起" : "展开"}
        </span>
      </button>

      {open && (
        <div className="panel-body" id={bodyId}>
          <figure className="panel-fig">
            {imgBroken ? (
              <p className="panel-imgfail">
                面板图暂时无法加载（图片可能尚未上传到线上，或当前网络取不到）。
              </p>
            ) : (
              <a
                className="panel-zoom"
                href={panel.image_path}
                target="_blank"
                rel="noreferrer"
                title="在新标签打开原图，可放大看面板上的小字"
              >
                <img
                  src={panel.image_path}
                  alt={panel.device_name + panel.image_desc + "示意图"}
                  loading="lazy"
                  onError={() => setImgBroken(true)}
                />
              </a>
            )}
            <figcaption className="panel-cap">
              出处：{panel.source}
              {imgBroken ? "" : " ｜ 点图可在新标签打开原图"}
            </figcaption>
          </figure>

          <table className="panel-keys">
            <thead>
              <tr>
                <th scope="col">编号</th>
                <th scope="col">按键 / 部件</th>
                <th scope="col">功能说明</th>
              </tr>
            </thead>
            <tbody>
              {keys.map((k) => (
                <tr key={k.order_no}>
                  <td className="panel-key-no">{k.order_no}</td>
                  <td className="panel-key-name">{k.key_name}</td>
                  <td className="panel-key-desc">{k.function_desc || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {noDesc && (
            <p className="panel-note">
              该手册只给出按键名称、未附功能说明，故「功能说明」列为空（不代为补充）。
            </p>
          )}
        </div>
      )}
    </li>
  );
}
