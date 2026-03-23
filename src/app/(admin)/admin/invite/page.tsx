"use client";

import { useEffect, useState } from "react";
import { Send, RefreshCw } from "lucide-react";

interface Invitation {
  id: string;
  email: string;
  role: string;
  parentId: string | null;
  status: "pending" | "accepted" | "expired";
  createdAt: string;
}

interface ParentOption {
  id: string;
  displayName: string;
}

export default function AdminInvitePage() {
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [parents, setParents] = useState<ParentOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("adult");
  const [parentId, setParentId] = useState("");

  const fetchInvitations = () => {
    setLoading(true);
    fetch("/api/admin/invitations")
      .then((res) => res.json())
      .then((data) => {
        setInvitations(data.invitations ?? []);
        setParents(data.parents ?? []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchInvitations();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await fetch("/api/admin/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          role,
          parentId: parentId || null,
        }),
      });
      setEmail("");
      setRole("adult");
      setParentId("");
      fetchInvitations();
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleResend = async (invitationId: string) => {
    await fetch("/api/admin/invite", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ resendId: invitationId }),
    });
    fetchInvitations();
  };

  const statusBadge = (status: Invitation["status"]) => {
    const styles: Record<string, string> = {
      pending: "bg-yellow-900/40 text-yellow-400",
      accepted: "bg-green-900/40 text-green-400",
      expired: "bg-red-900/40 text-red-400",
    };
    const labels: Record<string, string> = {
      pending: "Oczekujące",
      accepted: "Zaakceptowane",
      expired: "Wygasłe",
    };
    return (
      <span
        className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${styles[status]}`}
      >
        {labels[status]}
      </span>
    );
  };

  return (
    <div className="p-8 space-y-8">
      <h1 className="text-2xl font-bold text-text-primary">Zaproszenia</h1>

      {/* Invitation form */}
      <form
        onSubmit={handleSubmit}
        className="bg-bg-card border border-border rounded-xl p-5 space-y-4"
      >
        <h2 className="text-lg font-semibold text-text-primary">
          Nowe zaproszenie
        </h2>
        <div className="flex flex-wrap gap-3">
          <input
            type="email"
            required
            placeholder="Adres email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="flex-1 min-w-[200px] px-3 py-2 bg-bg-dark border border-border rounded-lg text-text-primary text-sm placeholder:text-text-secondary focus:outline-none focus:border-primary"
          />
          <select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="px-3 py-2 bg-bg-dark border border-border rounded-lg text-text-primary text-sm focus:outline-none focus:border-primary"
          >
            <option value="adult">Dorosły</option>
            <option value="child">Dziecko</option>
          </select>
          {role === "child" && (
            <select
              value={parentId}
              onChange={(e) => setParentId(e.target.value)}
              className="px-3 py-2 bg-bg-dark border border-border rounded-lg text-text-primary text-sm focus:outline-none focus:border-primary"
            >
              <option value="">Rodzic (opcjonalnie)</option>
              {parents.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.displayName}
                </option>
              ))}
            </select>
          )}
          <button
            type="submit"
            disabled={submitting}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-text-primary rounded-lg text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            <Send size={16} />
            {submitting ? "Wysyłanie..." : "Wyślij"}
          </button>
        </div>
      </form>

      {/* Invitations list */}
      <div className="bg-bg-card border border-border rounded-xl overflow-hidden">
        <h2 className="text-lg font-semibold text-text-primary px-5 pt-5 pb-3">
          Historia zaproszeń
        </h2>
        {loading ? (
          <p className="text-text-secondary text-sm px-5 pb-5">Ładowanie...</p>
        ) : invitations.length === 0 ? (
          <p className="text-text-secondary text-sm px-5 pb-5">
            Brak zaproszeń.
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-text-secondary text-left">
                <th className="px-5 py-3 font-medium">Email</th>
                <th className="px-5 py-3 font-medium">Rola</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 font-medium">Data</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody>
              {invitations.map((inv) => (
                <tr
                  key={inv.id}
                  className="border-b border-border last:border-0"
                >
                  <td className="px-5 py-3 text-text-primary">{inv.email}</td>
                  <td className="px-5 py-3 text-text-secondary">{inv.role}</td>
                  <td className="px-5 py-3">{statusBadge(inv.status)}</td>
                  <td className="px-5 py-3 text-text-secondary">
                    {new Date(inv.createdAt).toLocaleDateString("pl-PL")}
                  </td>
                  <td className="px-5 py-3">
                    {inv.status === "expired" && (
                      <button
                        onClick={() => handleResend(inv.id)}
                        className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs text-text-secondary hover:text-text-primary hover:bg-bg-card-hover transition-colors"
                      >
                        <RefreshCw size={14} />
                        Wyślij ponownie
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
