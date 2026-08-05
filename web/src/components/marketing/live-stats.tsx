"use client";

import { useQuery } from "@tanstack/react-query";
import { FileText, GitMerge, Activity, BookOpenCheck } from "lucide-react";
import { StatTile } from "@/components/stat-tile";
import { Skeleton } from "@/components/ui/skeleton";

interface PublicStatsResponse {
  available: boolean;
  stats?: {
    reportsProcessed: number;
    interactionsFlagged: number;
    activeSignals: number;
    evidenceSourcesCited: number;
  };
}

async function fetchStats(): Promise<PublicStatsResponse> {
  const res = await fetch("/api/public/stats");
  if (!res.ok) return { available: false };
  return res.json();
}

/**
 * Every number here is a real Supabase aggregate (GET /api/public/stats,
 * lib/reports.ts's getPublicAggregateStats) — never a placeholder. If the
 * query fails, this renders an honest "not available" state instead of
 * zeros, per CLAUDE.md's no-fabrication rule.
 */
export function LiveStats() {
  const { data, isLoading } = useQuery({ queryKey: ["public-stats"], queryFn: fetchStats });

  const tiles = [
    { label: "Reports processed", icon: FileText, value: data?.stats?.reportsProcessed },
    { label: "Interactions flagged", icon: GitMerge, value: data?.stats?.interactionsFlagged },
    { label: "Active risk signals", icon: Activity, value: data?.stats?.activeSignals, tone: "medium" as const },
    { label: "Evidence sources cited", icon: BookOpenCheck, value: data?.stats?.evidenceSourcesCited },
  ];

  return (
    <section className="px-4 sm:px-6">
      <div className="mx-auto grid max-w-6xl grid-cols-2 gap-4 lg:grid-cols-4">
        {tiles.map((tile) =>
          isLoading ? (
            <Skeleton key={tile.label} className="h-32 rounded-2xl" />
          ) : (
            <StatTile
              key={tile.label}
              label={tile.label}
              icon={tile.icon}
              tone={data?.available ? tile.tone : undefined}
              value={data?.available && tile.value !== undefined ? tile.value.toLocaleString() : "—"}
              hint={data?.available ? undefined : "Live stats unavailable right now"}
            />
          ),
        )}
      </div>
    </section>
  );
}
