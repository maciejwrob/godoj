"use client";

import { useEffect, useState } from "react";
import { Users, BookOpen, Clock, Mic } from "lucide-react";

interface DashboardData {
  activeUsers: number;
  lessonsThisMonth: number;
  minutesThisMonth: number;
  recentLessons: {
    id: string;
    userName: string;
    agentName: string;
    duration: number;
    createdAt: string;
  }[];
}

const ELEVENLABS_QUOTA_MIN = 250;

export default function AdminDashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/dashboard")
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

  const quotaPercent = Math.round(
    (data.minutesThisMonth / ELEVENLABS_QUOTA_MIN) * 100
  );

  const stats = [
    {
      label: "Aktywni użytkownicy",
      value: data.activeUsers,
      icon: Users,
    },
    {
      label: "Lekcje w tym miesiącu",
      value: data.lessonsThisMonth,
      icon: BookOpen,
    },
    {
      label: "Minuty w tym miesiącu",
      value: `${data.minutesThisMonth}`,
      icon: Clock,
    },
    {
      label: "Limit ElevenLabs",
      value: `${data.minutesThisMonth} / ${ELEVENLABS_QUOTA_MIN} min`,
      icon: Mic,
      subtitle: `${quotaPercent}% wykorzystano`,
    },
  ];

  return (
    <div className="p-8 space-y-8">
      <h1 className="text-2xl font-bold text-text-primary">
        Panel administracyjny
      </h1>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="bg-bg-card border border-border rounded-xl p-5"
          >
            <div className="flex items-center gap-3 mb-2">
              <stat.icon size={20} className="text-primary" />
              <span className="text-text-secondary text-sm">{stat.label}</span>
            </div>
            <p className="text-2xl font-bold text-text-primary">{stat.value}</p>
            {stat.subtitle && (
              <p className="text-xs text-text-secondary mt-1">
                {stat.subtitle}
              </p>
            )}
          </div>
        ))}
      </div>

      {/* Recent lessons */}
      <div className="bg-bg-card border border-border rounded-xl p-5">
        <h2 className="text-lg font-semibold text-text-primary mb-4">
          Ostatnie lekcje
        </h2>
        {data.recentLessons.length === 0 ? (
          <p className="text-text-secondary text-sm">Brak lekcji.</p>
        ) : (
          <div className="space-y-3">
            {data.recentLessons.map((lesson) => (
              <div
                key={lesson.id}
                className="flex items-center justify-between py-2 border-b border-border last:border-0"
              >
                <div>
                  <p className="text-text-primary text-sm font-medium">
                    {lesson.userName}
                  </p>
                  <p className="text-text-secondary text-xs">
                    {lesson.agentName}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-text-primary text-sm">
                    {lesson.duration} min
                  </p>
                  <p className="text-text-secondary text-xs">
                    {new Date(lesson.createdAt).toLocaleDateString("pl-PL")}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
