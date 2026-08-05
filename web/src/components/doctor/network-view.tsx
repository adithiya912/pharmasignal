"use client";

import { useQuery } from "@tanstack/react-query";
import { InteractionGraph } from "@/components/doctor/interaction-graph";
import { EmptyState } from "@/components/empty-state";
import { Waypoints } from "lucide-react";
import type { GraphResponse } from "@/lib/types";

async function fetchGraph(): Promise<GraphResponse> {
  const res = await fetch("/api/graph");
  if (!res.ok) throw new Error("Could not reach ml-services for the interaction graph.");
  return res.json();
}

export function NetworkView() {
  const { data, isLoading, error } = useQuery({ queryKey: ["graph"], queryFn: fetchGraph });

  if (isLoading) {
    return (
      <div className="flex h-96 items-center justify-center text-sm text-muted-foreground">
        Loading the interaction graph…
      </div>
    );
  }

  if (error || !data) {
    return (
      <EmptyState
        icon={Waypoints}
        title="Could not load the graph"
        description={error instanceof Error ? error.message : "Is ml-services running?"}
      />
    );
  }

  return <InteractionGraph graph={data} />;
}
