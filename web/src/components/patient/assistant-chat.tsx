"use client";

import { useState, type FormEvent } from "react";
import { motion } from "framer-motion";
import { Send, ExternalLink, Bot, User, AlertTriangle } from "lucide-react";
import { GlassCard } from "@/components/glass-card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { EvidenceSource } from "@/lib/types";

interface ChatEntry {
  role: "user" | "assistant" | "error";
  content: string;
  sources?: EvidenceSource[];
}

const SUGGESTIONS = [
  "What are the side effects of ibuprofen?",
  "Can I take warfarin and amoxicillin together?",
  "What does DrugBank say about metformin?",
];

export function AssistantChat() {
  const [entries, setEntries] = useState<ChatEntry[]>([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(false);

  async function send(message: string) {
    if (!message.trim() || loading) return;
    const history = entries
      .filter((e) => e.role === "user" || e.role === "assistant")
      .map((e) => ({ role: e.role, content: e.content }));

    setEntries((prev) => [...prev, { role: "user", content: message }]);
    setDraft("");
    setLoading(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, history }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        const detail =
          (typeof data?.detail === "object" ? data?.detail?.detail : data?.detail) ??
          data?.error ??
          "Something went wrong.";
        setEntries((prev) => [...prev, { role: "error", content: detail }]);
        return;
      }
      setEntries((prev) => [
        ...prev,
        { role: "assistant", content: data.answer, sources: data.sources },
      ]);
    } catch {
      setEntries((prev) => [
        ...prev,
        { role: "error", content: "Could not reach the assistant. Please try again." },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    send(draft);
  }

  return (
    <div className="flex flex-col gap-4">
      {entries.length === 0 && (
        <GlassCard className="flex flex-col gap-3 p-6">
          <p className="text-sm text-muted-foreground">
            Ask a medicine-related question. Answers are grounded in a real evidence corpus
            (PubMed, DrugBank, FDA/DailyMed) and cite their sources — not general knowledge.
          </p>
          <div className="flex flex-wrap gap-2">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => send(s)}
                className="rounded-full border border-border px-3 py-1.5 text-xs text-muted-foreground hover:border-primary/40 hover:text-foreground"
              >
                {s}
              </button>
            ))}
          </div>
        </GlassCard>
      )}

      <div className="flex flex-col gap-3">
        {entries.map((entry, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            className={cn("flex gap-3", entry.role === "user" && "flex-row-reverse")}
          >
            {entry.role !== "user" && (
              <div
                className={cn(
                  "flex size-8 shrink-0 items-center justify-center rounded-full",
                  entry.role === "error" ? "bg-risk-high/15 text-risk-high" : "brand-gradient-bg text-white",
                )}
              >
                {entry.role === "error" ? <AlertTriangle className="size-4" /> : <Bot className="size-4" />}
              </div>
            )}
            {entry.role === "user" && (
              <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                <User className="size-4" />
              </div>
            )}
            <GlassCard
              className={cn(
                "max-w-[80%] p-4",
                entry.role === "user" && "bg-primary/10",
                entry.role === "error" && "border-risk-high/30",
              )}
            >
              <p className="text-sm whitespace-pre-wrap text-foreground">{entry.content}</p>
              {entry.sources && entry.sources.length > 0 && (
                <ul className="mt-3 flex flex-col gap-1 border-t border-border pt-3">
                  {entry.sources.map((s, si) => (
                    <li key={si}>
                      <a
                        href={s.url}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-1.5 text-xs text-muted-foreground underline decoration-muted-foreground/40 underline-offset-2 hover:text-foreground hover:decoration-foreground"
                      >
                        <ExternalLink className="size-3 shrink-0" />
                        {s.title} <span className="font-mono">[{s.source}]</span>
                      </a>
                    </li>
                  ))}
                </ul>
              )}
            </GlassCard>
          </motion.div>
        ))}
        {loading && (
          <div className="flex items-center gap-2 pl-11 text-sm text-muted-foreground">
            <span className="size-1.5 animate-pulse rounded-full bg-current" />
            Thinking…
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="flex items-end gap-2">
        <Textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Ask about a drug, symptom, or interaction…"
          className="min-h-12 flex-1 resize-none"
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send(draft);
            }
          }}
        />
        <Button type="submit" size="icon" disabled={loading || !draft.trim()}>
          <Send className="size-4" />
        </Button>
      </form>
    </div>
  );
}
