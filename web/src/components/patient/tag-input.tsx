"use client";

import { useState, type KeyboardEvent } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface TagInputProps {
  value: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
  suggestions?: string[];
}

/**
 * Free-text tag entry with optional quick-pick suggestions. Not a
 * database-backed autocomplete — PharmaSignal doesn't have a full drug
 * catalog to search against, so this stays honest: suggestions are just
 * the small seeded list (the same SEED_DRUGS used by the interaction
 * checker), typing anything else is always allowed.
 */
export function TagInput({ value, onChange, placeholder, suggestions = [] }: TagInputProps) {
  const [draft, setDraft] = useState("");

  function addTag(raw: string) {
    const tag = raw.trim();
    if (!tag) return;
    if (value.some((v) => v.toLowerCase() === tag.toLowerCase())) {
      setDraft("");
      return;
    }
    onChange([...value, tag]);
    setDraft("");
  }

  function removeTag(tag: string) {
    onChange(value.filter((v) => v !== tag));
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addTag(draft);
    } else if (e.key === "Backspace" && !draft && value.length > 0) {
      removeTag(value[value.length - 1]);
    }
  }

  const availableSuggestions = suggestions.filter(
    (s) => !value.some((v) => v.toLowerCase() === s.toLowerCase()),
  );

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2 rounded-lg border border-input bg-background/40 p-2.5">
        {value.map((tag) => (
          <span
            key={tag}
            className="flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 font-mono text-sm text-foreground"
          >
            {tag}
            <button
              type="button"
              onClick={() => removeTag(tag)}
              aria-label={`Remove ${tag}`}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="size-3" />
            </button>
          </span>
        ))}
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={() => addTag(draft)}
          placeholder={value.length === 0 ? placeholder : ""}
          aria-label={placeholder}
          className="min-w-32 flex-1 bg-transparent py-1 text-sm outline-none placeholder:text-muted-foreground"
        />
      </div>
      {availableSuggestions.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {availableSuggestions.slice(0, 8).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => addTag(s)}
              className={cn(
                "rounded-full border border-border px-2.5 py-1 text-xs text-muted-foreground",
                "hover:border-primary/40 hover:text-foreground",
              )}
            >
              + {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
