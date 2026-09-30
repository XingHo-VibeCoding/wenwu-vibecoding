export default function OpItem({ op }) {
  return (
    <li className="ins-item">
      <div className="ins-item-head">
        <span className="ins-tag">{op.t}</span>
        <h3>{op.title}</h3>
      </div>
      <ol className="ins-steps">
        {op.steps.map((s, i) => (
          <li key={i}>{s}</li>
        ))}
      </ol>
      <p className="ins-src">出处：{op.src}</p>
    </li>
  );
}
