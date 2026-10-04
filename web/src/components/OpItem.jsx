export default function OpItem({ op }) {
  return (
    <li className="ins-item">
      <div className="ins-item-head">
        <span className="ins-tag">{op.device_name}</span>
        <h3>{op.title}</h3>
      </div>
      <ol className="ins-steps">
        {op.step_list.map((s, i) => (
          <li key={i}>{s}</li>
        ))}
      </ol>
      <p className="ins-src">出处：{op.source}</p>
    </li>
  );
}
