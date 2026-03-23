"use client";

import { useEffect, useState } from "react";
import { Search, ChevronDown, ChevronUp } from "lucide-react";

interface User {
  id: string;
  displayName: string;
  email: string;
  role: string;
  language: string;
  level: string;
  lastActivity: string | null;
  lessonsCount: number;
  active: boolean;
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchUsers = () => {
    setLoading(true);
    fetch("/api/admin/users")
      .then((res) => res.json())
      .then(setUsers)
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handlePatch = async (
    userId: string,
    body: Record<string, unknown>
  ) => {
    await fetch("/api/admin/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, ...body }),
    });
    fetchUsers();
  };

  const filtered = users.filter((u) => {
    const matchesSearch =
      u.displayName.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase());
    const matchesRole = roleFilter === "all" || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const roles = Array.from(new Set(users.map((u) => u.role)));

  return (
    <div className="p-8 space-y-6">
      <h1 className="text-2xl font-bold text-text-primary">Użytkownicy</h1>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary"
          />
          <input
            type="text"
            placeholder="Szukaj po nazwie lub emailu..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-bg-card border border-border rounded-lg text-text-primary text-sm placeholder:text-text-secondary focus:outline-none focus:border-primary"
          />
        </div>
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="bg-bg-card border border-border rounded-lg px-3 py-2 text-text-primary text-sm focus:outline-none focus:border-primary"
        >
          <option value="all">Wszystkie role</option>
          {roles.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <p className="text-text-secondary">Ładowanie...</p>
      ) : (
        <div className="bg-bg-card border border-border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-text-secondary text-left">
                <th className="px-4 py-3 font-medium">Nazwa</th>
                <th className="px-4 py-3 font-medium">Email</th>
                <th className="px-4 py-3 font-medium">Rola</th>
                <th className="px-4 py-3 font-medium">Język</th>
                <th className="px-4 py-3 font-medium">Poziom</th>
                <th className="px-4 py-3 font-medium">Ostatnia aktywność</th>
                <th className="px-4 py-3 font-medium">Lekcje</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((user) => (
                <>
                  <tr
                    key={user.id}
                    className="border-b border-border hover:bg-bg-card-hover cursor-pointer transition-colors"
                    onClick={() =>
                      setExpandedId(expandedId === user.id ? null : user.id)
                    }
                  >
                    <td className="px-4 py-3 text-text-primary">
                      {user.displayName}
                    </td>
                    <td className="px-4 py-3 text-text-secondary">
                      {user.email}
                    </td>
                    <td className="px-4 py-3 text-text-secondary">
                      {user.role}
                    </td>
                    <td className="px-4 py-3 text-text-secondary">
                      {user.language}
                    </td>
                    <td className="px-4 py-3 text-text-secondary">
                      {user.level}
                    </td>
                    <td className="px-4 py-3 text-text-secondary">
                      {user.lastActivity
                        ? new Date(user.lastActivity).toLocaleDateString(
                            "pl-PL"
                          )
                        : "—"}
                    </td>
                    <td className="px-4 py-3 text-text-secondary">
                      {user.lessonsCount}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                          user.active
                            ? "bg-green-900/40 text-green-400"
                            : "bg-red-900/40 text-red-400"
                        }`}
                      >
                        {user.active ? "Aktywny" : "Nieaktywny"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-text-secondary">
                      {expandedId === user.id ? (
                        <ChevronUp size={16} />
                      ) : (
                        <ChevronDown size={16} />
                      )}
                    </td>
                  </tr>
                  {expandedId === user.id && (
                    <tr key={`${user.id}-actions`} className="border-b border-border">
                      <td colSpan={9} className="px-4 py-4">
                        <div className="flex gap-3">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handlePatch(user.id, {
                                active: !user.active,
                              });
                            }}
                            className="px-3 py-1.5 rounded-lg text-sm bg-bg-card-hover text-text-primary border border-border hover:border-primary transition-colors"
                          >
                            {user.active ? "Dezaktywuj" : "Aktywuj"}
                          </button>
                          <select
                            defaultValue={user.role}
                            onChange={(e) => {
                              e.stopPropagation();
                              handlePatch(user.id, { role: e.target.value });
                            }}
                            onClick={(e) => e.stopPropagation()}
                            className="px-3 py-1.5 rounded-lg text-sm bg-bg-card-hover text-text-primary border border-border focus:outline-none focus:border-primary"
                          >
                            <option value="admin">admin</option>
                            <option value="adult">adult</option>
                            <option value="child">child</option>
                          </select>
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <p className="text-text-secondary text-sm p-4 text-center">
              Brak wyników.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
