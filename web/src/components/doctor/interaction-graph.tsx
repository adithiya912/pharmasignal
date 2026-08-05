"use client";

import { useMemo, useState } from "react";
import { useTheme } from "next-themes";
import {
  ReactFlow,
  Background,
  Controls,
  MarkerType,
  type Node,
  type Edge,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { ExternalLink } from "lucide-react";
import { GlassCard } from "@/components/glass-card";
import { cn } from "@/lib/utils";
import { useHasMounted } from "@/hooks/use-has-mounted";
import type { GraphResponse, InteractionEvidenceTier } from "@/lib/types";

// xyflow's SVG elements don't reliably resolve CSS custom properties for
// edge label fills (verified: --xy-* vars set via inline style work on
// its HTML/CSS chrome like Controls and even plain node styles, but
// var(--...) on an edge label's rect/text fill renders as white
// regardless of the referenced token) — literal colors keyed off the
// resolved theme instead, matching --card/--muted-foreground per mode.
const EDGE_LABEL_COLORS = {
  dark: { bg: "#1c2636", text: "#a9b6c2" },
  light: { bg: "#e7eaf0", text: "#48505c" },
} as const;

const evidenceColor: Record<InteractionEvidenceTier, string> = {
  major: "var(--risk-high)",
  moderate: "var(--risk-medium)",
  weak: "var(--risk-low)",
};

function layoutNodes(ids: string[], highlight: Set<string>): Node[] {
  const radius = Math.max(160, ids.length * 22);
  const center = { x: radius + 40, y: radius + 40 };
  return ids.map((id, i) => {
    const angle = (2 * Math.PI * i) / ids.length;
    const isHighlighted = highlight.has(id.toLowerCase());
    return {
      id,
      position: {
        x: center.x + radius * Math.cos(angle) - 45,
        y: center.y + radius * Math.sin(angle) - 18,
      },
      data: { label: id },
      style: {
        width: 90,
        borderRadius: 9999,
        border: isHighlighted ? "2px solid var(--brand-start)" : "1px solid var(--glass-border)",
        background: isHighlighted ? "var(--brand-start)" : "var(--card)",
        color: isHighlighted ? "white" : "var(--foreground)",
        fontSize: 11,
        fontFamily: "var(--font-data)",
        textAlign: "center" as const,
        padding: "6px 4px",
      },
    };
  });
}

function layoutEdges(graph: GraphResponse, mode: "dark" | "light"): Edge[] {
  const { bg, text } = EDGE_LABEL_COLORS[mode];
  return graph.edges.map((e) => ({
    id: `${e.source}-${e.target}`,
    source: e.source,
    target: e.target,
    label: e.evidence,
    animated: e.evidence === "major",
    style: { stroke: evidenceColor[e.evidence], strokeWidth: e.evidence === "major" ? 2.5 : 1.5 },
    labelStyle: { fill: text, fontSize: 10 },
    labelBgStyle: { fill: bg },
    labelBgPadding: [4, 2] as [number, number],
    labelBgBorderRadius: 4,
    markerEnd: { type: MarkerType.ArrowClosed, color: evidenceColor[e.evidence] },
  }));
}

function pubmedUrl(ref: string): string | null {
  const match = ref.match(/^PMID:(\d+)$/);
  return match ? `https://pubmed.ncbi.nlm.nih.gov/${match[1]}/` : null;
}

interface InteractionGraphProps {
  graph: GraphResponse;
  /** Drug names to highlight (e.g. a report's extracted drugs), lowercase-insensitive. */
  highlightDrugs?: string[];
  compact?: boolean;
}

export function InteractionGraph({ graph, highlightDrugs = [], compact = false }: InteractionGraphProps) {
  const { resolvedTheme } = useTheme();
  const mounted = useHasMounted();
  const mode: "dark" | "light" = mounted && resolvedTheme === "light" ? "light" : "dark";

  const highlight = useMemo(() => new Set(highlightDrugs.map((d) => d.toLowerCase())), [highlightDrugs]);
  const nodeIds = useMemo(() => graph.nodes.map((n) => n.id), [graph.nodes]);
  const nodes = useMemo(() => layoutNodes(nodeIds, highlight), [nodeIds, highlight]);
  const edges = useMemo(() => layoutEdges(graph, mode), [graph, mode]);
  const [selected, setSelected] = useState<string | null>(null);

  const connectedEdges = selected
    ? graph.edges.filter((e) => e.source === selected || e.target === selected)
    : [];

  return (
    <div className={cn("flex flex-col gap-4", !compact && "lg:flex-row")}>
      <GlassCard
        className={cn("overflow-hidden p-0", compact ? "h-72 w-full" : "h-[520px] flex-1")}
      >
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodeClick={(_, node) => setSelected(node.id)}
          onPaneClick={() => setSelected(null)}
          fitView
          proOptions={{ hideAttribution: true }}
          style={
            {
              // xyflow's own light/dark heuristic doesn't know about this
              // app's next-themes toggle, so drive its CSS vars from the
              // same tokens the rest of the app uses instead of relying
              // on colorMode="system" (which follows the OS, not the
              // in-app theme switch).
              "--xy-controls-button-background-color": "var(--card)",
              "--xy-controls-button-color": "var(--foreground)",
              "--xy-controls-button-border-color": "var(--border)",
            } as React.CSSProperties
          }
        >
          <Background gap={24} />
          {!compact && <Controls showInteractive={false} />}
        </ReactFlow>
      </GlassCard>

      {!compact && (
        <GlassCard className="flex w-full flex-col gap-3 p-5 lg:w-80">
          {!selected ? (
            <p className="text-sm text-muted-foreground">
              Click a drug to see its documented interactions. Edge color/thickness reflects
              evidence strength — coral for major, amber for moderate, sage for weak.
            </p>
          ) : (
            <>
              <h3 className="font-mono text-sm font-medium text-foreground">{selected}</h3>
              {connectedEdges.length === 0 ? (
                <p className="text-sm text-muted-foreground">No documented interactions in this graph.</p>
              ) : (
                <ul className="flex flex-col gap-3">
                  {connectedEdges.map((e, i) => {
                    const other = e.source === selected ? e.target : e.source;
                    const url = pubmedUrl(e.source_ref);
                    return (
                      <li key={i} className="border-t border-border pt-3 first:border-0 first:pt-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-mono text-xs text-foreground">{other}</span>
                          <span
                            className="rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase"
                            style={{ borderColor: evidenceColor[e.evidence], color: evidenceColor[e.evidence] }}
                          >
                            {e.evidence}
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">{e.mechanism}</p>
                        {url ? (
                          <a
                            href={url}
                            target="_blank"
                            rel="noreferrer"
                            className="mt-1 flex items-center gap-1 text-xs text-foreground underline decoration-muted-foreground/40 underline-offset-2 hover:decoration-foreground"
                          >
                            <ExternalLink className="size-3" />
                            {e.source_ref}
                          </a>
                        ) : (
                          <p className="mt-1 font-mono text-xs text-muted-foreground">{e.source_ref}</p>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </>
          )}
        </GlassCard>
      )}
    </div>
  );
}
