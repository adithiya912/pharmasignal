"use client";

import { motion } from "framer-motion";

const nodes = [
  { id: "report", x: 40, y: 130, label: "Patient report" },
  { id: "ner", x: 190, y: 60, label: "BioBERT NER" },
  { id: "gnn", x: 190, y: 200, label: "GNN interaction" },
  { id: "evidence", x: 340, y: 60, label: "PubMed / DrugBank" },
  { id: "risk", x: 340, y: 200, label: "Risk score" },
  { id: "doctor", x: 470, y: 130, label: "Doctor review" },
] as const;

const edges: Array<[string, string]> = [
  ["report", "ner"],
  ["report", "gnn"],
  ["ner", "evidence"],
  ["gnn", "risk"],
  ["evidence", "doctor"],
  ["risk", "doctor"],
];

function point(id: string) {
  const n = nodes.find((n) => n.id === id)!;
  return n;
}

/**
 * Self-contained animated pipeline diagram — no external image asset.
 * Represents the real stages the app runs (see docs/api-contracts.md),
 * not a decorative abstraction.
 */
export function HeroIllustration() {
  return (
    <div className="relative mx-auto w-full max-w-lg">
      <svg viewBox="0 0 520 260" className="w-full overflow-visible" role="img" aria-label="AI pipeline diagram">
        {edges.map(([from, to], i) => {
          const a = point(from);
          const b = point(to);
          return (
            <motion.line
              key={`${from}-${to}`}
              x1={a.x}
              y1={a.y}
              x2={b.x}
              y2={b.y}
              stroke="url(#edge-gradient)"
              strokeWidth={1.5}
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 0.6 }}
              transition={{ duration: 1, delay: 0.15 * i, ease: "easeOut" }}
            />
          );
        })}
        <defs>
          <linearGradient id="edge-gradient" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="var(--brand-start)" />
            <stop offset="100%" stopColor="var(--brand-end)" />
          </linearGradient>
        </defs>

        {nodes.map((node, i) => (
          <g key={node.id}>
            <motion.circle
              cx={node.x}
              cy={node.y}
              r={7}
              fill="var(--card)"
              stroke="url(#edge-gradient)"
              strokeWidth={2}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.4, delay: 0.15 * i }}
            />
            <motion.circle
              cx={node.x}
              cy={node.y}
              r={7}
              fill="var(--brand-start)"
              initial={{ opacity: 0 }}
              animate={{ opacity: [0, 0.5, 0], scale: [1, 2.4, 2.4] }}
              transition={{
                duration: 2,
                delay: 1 + 0.3 * i,
                repeat: Infinity,
                repeatDelay: 3,
              }}
            />
            <text
              x={node.x}
              y={node.y + (node.y < 130 ? -16 : 24)}
              textAnchor="middle"
              className="fill-muted-foreground font-mono text-[9px]"
            >
              {node.label}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}
