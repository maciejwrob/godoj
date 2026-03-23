"use client";

import { useEffect, useState } from "react";
import { AlertTriangle } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";

interface DailyUsage {
  date: string;
  minutes: number;
}

interface UserUsage {
  name: string;
  minutes: number;
  avgLesson: number;
  lessonCount: number;
}

interface UsageData {
  daily: DailyUsage[];
  users: UserUsage[];
  totalMinutes: number;
}

const ELEVENLABS_QUOTA_MIN = 250;
const ALERT_THRESHOLD = 200;

export default function AdminUsagePage() {
  const [data, setData] = useState<UsageData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/usage")
      .then((res) => res.json())
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="p-8 text-text-secondary">Ładowanie danych...</div>
    );
  }

  if (!data) {
    return (
      <div className="p-8 text-text-secondary">
        Nie udało się załadować danych.
      </div>
    );
  }

  const showAlert = data.totalMinutes > ALERT_THRESHOLD;

  return (
    <div className="p-8 space-y-8">
      <h1 className="text-2xl font-bold text-text-primary">
        Użycie ElevenLabs
      </h1>

      {/* Alert banner */}
      {showAlert && (
        <div className="flex items-center gap-3 p-4 bg-red-900/30 border border-red-800 rounded-xl">
          <AlertTriangle size={20} className="text-red-400 shrink-0" />
          <p className="text-red-300 text-sm">
            Uwaga! Wykorzystano {data.totalMinutes} z {ELEVENLABS_QUOTA_MIN}{" "}
            minut ({Math.round((data.totalMinutes / ELEVENLABS_QUOTA_MIN) * 100)}
            %). Zbliżasz się do limitu.
          </p>
        </div>
      )}

      {/* Summary */}
      <div className="bg-bg-card border border-border rounded-xl p-5">
        <p className="text-text-secondary text-sm mb-1">
          Zużycie w tym miesiącu
        </p>
        <p className="text-3xl font-bold text-text-primary">
          {data.totalMinutes}{" "}
          <span className="text-lg text-text-secondary font-normal">
            / {ELEVENLABS_QUOTA_MIN} min
          </span>
        </p>
      </div>

      {/* Bar chart — daily minutes */}
      <div className="bg-bg-card border border-border rounded-xl p-5">
        <h2 className="text-lg font-semibold text-text-primary mb-4">
          Dzienne użycie (ostatnie 30 dni)
        </h2>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data.daily}>
              <XAxis
                dataKey="date"
                tick={{ fill: "var(--color-text-secondary)", fontSize: 11 }}
                tickFormatter={(v: string) => {
                  const d = new Date(v);
                  return `${d.getDate()}.${d.getMonth() + 1}`;
                }}
              />
              <YAxis
                tick={{ fill: "var(--color-text-secondary)", fontSize: 11 }}
                unit=" min"
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "var(--color-bg-card)",
                  border: "1px solid var(--color-border)",
                  borderRadius: "8px",
                  color: "var(--color-text-primary)",
                  fontSize: "12px",
                }}
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                labelFormatter={(v: any) =>
                  new Date(String(v)).toLocaleDateString("pl-PL")
                }
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                formatter={(value: any) => [`${value} min`, "Minuty"]}
              />
              <Bar dataKey="minutes" fill="var(--color-primary)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Per-user breakdown */}
      <div className="bg-bg-card border border-border rounded-xl overflow-hidden">
        <h2 className="text-lg font-semibold text-text-primary px-5 pt-5 pb-3">
          Użycie per użytkownik
        </h2>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-text-secondary text-left">
              <th className="px-5 py-3 font-medium">Użytkownik</th>
              <th className="px-5 py-3 font-medium">Minuty</th>
              <th className="px-5 py-3 font-medium">Śr. lekcja</th>
              <th className="px-5 py-3 font-medium">Liczba lekcji</th>
            </tr>
          </thead>
          <tbody>
            {data.users.map((user) => (
              <tr
                key={user.name}
                className="border-b border-border last:border-0"
              >
                <td className="px-5 py-3 text-text-primary">{user.name}</td>
                <td className="px-5 py-3 text-text-secondary">
                  {user.minutes} min
                </td>
                <td className="px-5 py-3 text-text-secondary">
                  {user.avgLesson} min
                </td>
                <td className="px-5 py-3 text-text-secondary">
                  {user.lessonCount}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {data.users.length === 0 && (
          <p className="text-text-secondary text-sm p-5 text-center">
            Brak danych.
          </p>
        )}
      </div>
    </div>
  );
}
