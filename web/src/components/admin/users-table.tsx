"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { GlassCard } from "@/components/glass-card";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/empty-state";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { AdminUserSummary } from "@/lib/admin-users";
import type { UserRole } from "@/lib/roles";

const ROLES: UserRole[] = ["patient", "doctor", "admin"];

function userTag(id: string): string {
  return id.replace(/^user_/, "").slice(-6).toUpperCase();
}

export function UsersTable({ initialUsers }: { initialUsers: AdminUserSummary[] }) {
  const [users, setUsers] = useState(initialUsers);
  const [query, setQuery] = useState("");
  const [savingId, setSavingId] = useState<string | null>(null);
  const [errorById, setErrorById] = useState<Record<string, string>>({});

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return users;
    return users.filter((u) => (u.email ?? "").toLowerCase().includes(q) || userTag(u.id).toLowerCase().includes(q));
  }, [users, query]);

  async function changeRole(userId: string, role: UserRole) {
    setSavingId(userId);
    setErrorById((prev) => ({ ...prev, [userId]: "" }));
    try {
      const res = await fetch(`/api/admin/users/${userId}/role`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? "Failed to update role");
      setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, role } : u)));
    } catch (err) {
      setErrorById((prev) => ({ ...prev, [userId]: err instanceof Error ? err.message : "Failed to update role" }));
    } finally {
      setSavingId(null);
    }
  }

  if (users.length === 0) {
    return <EmptyState icon={Search} title="No users yet" description="Registered users will appear here." />;
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="relative max-w-sm">
        <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Filter by email or user tag…"
          className="pl-9"
        />
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={Search} title="No matches" description={`No users match "${query}".`} />
      ) : (
        <GlassCard className="overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted-foreground uppercase">
                <th className="px-4 py-3 font-medium">User</th>
                <th className="px-4 py-3 font-medium">Role</th>
                <th className="px-4 py-3 font-medium">Joined</th>
                <th className="px-4 py-3 font-medium">Last sign-in</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((u) => (
                <tr key={u.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-3">
                    <p className="text-foreground">{u.email ?? "—"}</p>
                    <p className="font-mono text-xs text-muted-foreground">{userTag(u.id)}</p>
                  </td>
                  <td className="px-4 py-3">
                    <Select
                      value={u.role ?? ""}
                      onValueChange={(v) => v && changeRole(u.id, v as UserRole)}
                      disabled={savingId === u.id}
                    >
                      <SelectTrigger className="w-32 capitalize">
                        <SelectValue placeholder="No role" />
                      </SelectTrigger>
                      <SelectContent>
                        {ROLES.map((r) => (
                          <SelectItem key={r} value={r} className="capitalize">
                            {r}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errorById[u.id] && <p className="mt-1 text-xs text-risk-high">{errorById[u.id]}</p>}
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {new Date(u.createdAt).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })}
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {u.lastSignInAt
                      ? new Date(u.lastSignInAt).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })
                      : "Never"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </GlassCard>
      )}
    </div>
  );
}
