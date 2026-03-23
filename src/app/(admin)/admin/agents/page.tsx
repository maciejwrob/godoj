"use client";

import { useEffect, useState } from "react";
import { Plus, Pencil, X, Save } from "lucide-react";

interface Agent {
  id: string;
  name: string;
  language: string;
  audience: string;
  elevenLabsId: string;
  active: boolean;
}

type AgentForm = Omit<Agent, "id"> & { id?: string };

const emptyForm: AgentForm = {
  name: "",
  language: "",
  audience: "",
  elevenLabsId: "",
  active: true,
};

export default function AdminAgentsPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [form, setForm] = useState<AgentForm>(emptyForm);

  const fetchAgents = () => {
    setLoading(true);
    fetch("/api/admin/agents")
      .then((res) => res.json())
      .then(setAgents)
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchAgents();
  }, []);

  const handleToggle = async (agent: Agent) => {
    await fetch("/api/admin/agents", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: agent.id, active: !agent.active }),
    });
    fetchAgents();
  };

  const handleEdit = (agent: Agent) => {
    setEditingId(agent.id);
    setShowNew(false);
    setForm({ ...agent });
  };

  const handleCancel = () => {
    setEditingId(null);
    setShowNew(false);
    setForm(emptyForm);
  };

  const handleSave = async () => {
    const method = editingId ? "PATCH" : "POST";
    const body = editingId ? { id: editingId, ...form } : form;

    await fetch("/api/admin/agents", {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    handleCancel();
    fetchAgents();
  };

  const updateForm = (field: keyof AgentForm, value: string | boolean) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const renderForm = () => (
    <div className="bg-bg-card border border-border rounded-xl p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-text-primary font-semibold">
          {editingId ? "Edytuj agenta" : "Nowy agent"}
        </h3>
        <button onClick={handleCancel} className="text-text-secondary hover:text-text-primary">
          <X size={18} />
        </button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <input
          placeholder="Nazwa"
          value={form.name}
          onChange={(e) => updateForm("name", e.target.value)}
          className="px-3 py-2 bg-bg-dark border border-border rounded-lg text-text-primary text-sm placeholder:text-text-secondary focus:outline-none focus:border-primary"
        />
        <input
          placeholder="Język (np. en, de)"
          value={form.language}
          onChange={(e) => updateForm("language", e.target.value)}
          className="px-3 py-2 bg-bg-dark border border-border rounded-lg text-text-primary text-sm placeholder:text-text-secondary focus:outline-none focus:border-primary"
        />
        <select
          value={form.audience}
          onChange={(e) => updateForm("audience", e.target.value)}
          className="px-3 py-2 bg-bg-dark border border-border rounded-lg text-text-primary text-sm focus:outline-none focus:border-primary"
        >
          <option value="">Odbiorcy</option>
          <option value="adult">Dorośli</option>
          <option value="child">Dzieci</option>
        </select>
        <input
          placeholder="ElevenLabs Agent ID"
          value={form.elevenLabsId}
          onChange={(e) => updateForm("elevenLabsId", e.target.value)}
          className="px-3 py-2 bg-bg-dark border border-border rounded-lg text-text-primary text-sm placeholder:text-text-secondary focus:outline-none focus:border-primary"
        />
      </div>
      <button
        onClick={handleSave}
        className="flex items-center gap-2 px-4 py-2 bg-primary text-text-primary rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
      >
        <Save size={16} />
        Zapisz
      </button>
    </div>
  );

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-text-primary">Agenci</h1>
        {!showNew && !editingId && (
          <button
            onClick={() => {
              setShowNew(true);
              setForm(emptyForm);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-text-primary rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
          >
            <Plus size={16} />
            Dodaj agenta
          </button>
        )}
      </div>

      {(showNew || editingId) && renderForm()}

      {loading ? (
        <p className="text-text-secondary">Ładowanie...</p>
      ) : agents.length === 0 ? (
        <p className="text-text-secondary">Brak agentów.</p>
      ) : (
        <div className="grid gap-4">
          {agents.map((agent) => (
            <div
              key={agent.id}
              className="bg-bg-card border border-border rounded-xl p-5 flex items-center justify-between"
            >
              <div className="space-y-1">
                <p className="text-text-primary font-medium">{agent.name}</p>
                <p className="text-text-secondary text-sm">
                  Język: {agent.language} &middot; Odbiorcy: {agent.audience}
                </p>
                <p className="text-text-secondary text-xs font-mono">
                  EL ID: {agent.elevenLabsId}
                </p>
              </div>
              <div className="flex items-center gap-3">
                {/* Active toggle */}
                <button
                  onClick={() => handleToggle(agent)}
                  className={`relative w-10 h-5 rounded-full transition-colors ${
                    agent.active ? "bg-primary" : "bg-border"
                  }`}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-text-primary transition-transform ${
                      agent.active ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
                <button
                  onClick={() => handleEdit(agent)}
                  className="p-2 rounded-lg text-text-secondary hover:text-text-primary hover:bg-bg-card-hover transition-colors"
                >
                  <Pencil size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
