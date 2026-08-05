const stack = [
  "Next.js",
  "FastAPI",
  "BioBERT",
  "PyTorch Geometric GNN",
  "Neo4j Aura",
  "Supabase",
  "Clerk",
  "Cloudflare R2",
];

export function TechStack() {
  return (
    <section id="stack" className="border-y border-border px-4 py-12 sm:px-6">
      <div className="mx-auto max-w-6xl">
        <p className="text-center text-xs font-medium tracking-widest text-muted-foreground uppercase">
          The real stack, not a slide
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-x-8 gap-y-3">
          {stack.map((name) => (
            <span key={name} className="font-mono text-sm text-muted-foreground/80">
              {name}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
