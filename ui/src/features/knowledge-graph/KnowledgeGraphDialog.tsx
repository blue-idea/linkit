import type { KnowledgeGraph } from './index';

export function KnowledgeGraphDialog({ graph, onClose, onSelect }: {
  graph: KnowledgeGraph;
  onClose: () => void;
  onSelect: (bookmarkId: string) => void;
}) {
  const nodeById = new Map(graph.nodes.map((node) => [node.id, node]));
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 px-4">
    <div role="dialog" aria-modal="true" aria-label="Knowledge network" className="glass-strong w-full max-w-2xl rounded-mac-xl p-5 ring-glow">
      <div className="mb-3 flex justify-between"><div><h2 className="text-[16px] font-semibold text-ink-100">Knowledge network</h2>
        <p className="text-[11px] text-ink-400">Static rule graph · AI falls back to shared tags and collections.</p></div>
        <button aria-label="Close knowledge network" onClick={onClose} className="text-ink-400">×</button></div>
      <svg role="img" aria-label="Bookmark relationship graph" viewBox="0 0 400 320" className="w-full rounded-xl bg-ink-900/50 hairline">
        {graph.edges.map((edge) => {
          const source = nodeById.get(edge.sourceId); const target = nodeById.get(edge.targetId);
          if (!source || !target) return null;
          const x = (source.x + target.x) / 2; const y = (source.y + target.y) / 2;
          return <g key={`${edge.sourceId}:${edge.targetId}`}><line x1={source.x} y1={source.y} x2={target.x} y2={target.y}
            stroke="rgba(124,107,255,.55)" strokeWidth="1.5" />
            <text x={x} y={y} fill="#94a3b8" fontSize="8" textAnchor="middle">{edge.label}</text></g>;
        })}
        {graph.nodes.map((node) => <g key={node.id} transform={`translate(${node.x},${node.y})`}>
          <circle r={node.center ? 28 : 22} fill={node.center ? '#2563eb' : '#172033'} stroke="#7c6bff" strokeWidth="1.5" />
          <foreignObject x={node.center ? -38 : -34} y={node.center ? -16 : -14} width={node.center ? 76 : 68} height={32}>
            <button aria-label={`Open ${node.label}`} onClick={() => onSelect(node.id)}
              className="h-full w-full overflow-hidden text-ellipsis bg-transparent px-1 text-center text-[8px] leading-tight text-white">
              {node.label}
            </button>
          </foreignObject>
        </g>)}
      </svg>
      <div className="mt-3 flex flex-wrap gap-3 text-[10px] text-ink-400"><span>Shared tag</span><span>Shared collection</span><span>AI related</span></div>
    </div>
  </div>;
}
