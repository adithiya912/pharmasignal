import type { ReactNode } from "react";
import type { Assessment, RiskLevel } from "@/lib/types";

/** Shared by the patient case-history view and the doctor triage
 * queue — built once here so both reuse the exact same rendering
 * instead of duplicating it. */

export const riskTone: Record<RiskLevel, "sage" | "amber" | "coral"> = {
  low: "sage",
  medium: "amber",
  high: "coral",
};

export const riskBadgeClass: Record<RiskLevel, string> = {
  low: "bg-signal-sage/15 text-signal-sage border-signal-sage/30",
  medium: "bg-signal-amber/15 text-signal-amber border-signal-amber/30",
  high: "bg-signal-coral/15 text-signal-coral border-signal-coral/40",
};

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5 sm:flex-row sm:gap-4">
      <span className="w-24 shrink-0 pt-0.5 text-xs tracking-wide text-card-foreground/50 uppercase">
        {label}
      </span>
      <div className="flex-1">{children}</div>
    </div>
  );
}

export function EntityList({ items }: { items: string[] }) {
  if (items.length === 0) {
    return <span className="font-data text-sm text-card-foreground/35">none detected</span>;
  }
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((item, i) => (
        <span
          key={`${item}-${i}`}
          className="rounded border border-card-foreground/15 bg-card-foreground/5 px-1.5 py-0.5 font-data text-sm"
        >
          {item}
        </span>
      ))}
    </div>
  );
}

/** ml-services formats contributing_sources as "Title [Source] url" —
 * split it back apart so the URL can be a real link. */
function parseSource(raw: string): { title: string; sourceType: string; url: string } | null {
  const match = raw.match(/^(.*)\s\[(.+)\]\s(\S+)$/);
  if (!match) return null;
  return { title: match[1], sourceType: match[2], url: match[3] };
}

export function RiskBadge({ level }: { level: RiskLevel }) {
  return (
    <span
      className={`inline-block rounded-full border px-2.5 py-0.5 text-xs font-medium tracking-wide uppercase ${riskBadgeClass[level]}`}
    >
      {level} risk
    </span>
  );
}

export function AssessmentDetail({ assessment }: { assessment: Assessment }) {
  const { riskScore, extracted } = assessment;
  return (
    <div className="flex flex-col gap-4">
      <div>
        <RiskBadge level={riskScore.risk_level} />
        <p className="mt-2 text-[0.95rem] leading-relaxed text-card-foreground">{riskScore.explanation}</p>
      </div>

      {riskScore.contributing_reports.length > 0 && (
        <Field label="Basis">
          <EntityList items={riskScore.contributing_reports} />
        </Field>
      )}

      {riskScore.contributing_sources.length > 0 && (
        <Field label="Evidence">
          <ul className="flex flex-col gap-1">
            {riskScore.contributing_sources.map((raw, i) => {
              const parsed = parseSource(raw);
              return (
                <li key={i} className="text-sm">
                  {parsed ? (
                    <a
                      href={parsed.url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-card-foreground underline decoration-card-foreground/30 underline-offset-2 hover:decoration-card-foreground"
                    >
                      {parsed.title}{" "}
                      <span className="font-data text-xs text-card-foreground/50">[{parsed.sourceType}]</span>
                    </a>
                  ) : (
                    <span>{raw}</span>
                  )}
                </li>
              );
            })}
          </ul>
        </Field>
      )}

      <details className="group mt-1 border-t border-card-foreground/10 pt-3">
        <summary className="cursor-pointer text-xs tracking-wide text-card-foreground/50 uppercase select-none">
          Extracted details
        </summary>
        <div className="mt-3 flex flex-col gap-3">
          <Field label="Drugs">
            <EntityList items={extracted.drugs} />
          </Field>
          <Field label="Symptoms">
            <EntityList items={extracted.symptoms} />
          </Field>
          <Field label="Dosages">
            <EntityList items={extracted.dosages} />
          </Field>
          <Field label="Duration">
            <span className="font-data text-sm">{extracted.duration || "—"}</span>
          </Field>
          <Field label="Severity (extracted)">
            <span className="font-data text-sm capitalize">{extracted.severity}</span>
          </Field>
        </div>
      </details>
    </div>
  );
}
