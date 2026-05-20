"use client";

import { useEffect, useState } from "react";
import { Users, BookOpen, Clock, Mic, AlertTriangle, Mail, Shield } from "lucide-react";

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
  beta: {
    registered: number;
    limit: number;
    waitlist: number;
    avgPerUser: number;
    topUser: { name: string; email: string; minutes: number } | null;
  };
  magicLinks: {
    sent: number;
    delivered: number;
    clicked: number;
    bounced: number;
    followedUp: number;
    unresolved: { email: string; language: string; sentAt: string }[];
  };
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

  return (
    <div className="p-8 space-y-8">
      <h1 className="text-2xl font-bold text-text-primary">
        Panel administracyjny
      </h1>

      {/* Beta Status Card */}
      <div className="bg-bg-card border border-border rounded-xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <Shield size={20} className="text-primary" />
          <h2 className="text-lg font-semibold text-text-primary">Beta status</h2>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          <div>
            <p className="text-text-secondary text-xs">Zarejestrowani</p>
            <p className="text-xl font-bold text-text-primary">{data.beta.registered} / {data.beta.limit}</p>
          </div>
          <div>
            <p className="text-text-secondary text-xs">Waitlist</p>
            <p className="text-xl font-bold text-text-primary">{data.beta.waitlist} osób</p>
          </div>
          <div>
            <p className="text-text-secondary text-xs">ElevenLabs (miesiąc)</p>
            <p className={`text-xl font-bold ${quotaPercent > 80 ? "text-red-400" : "text-text-primary"}`}>
              {data.minutesThisMonth} / {ELEVENLABS_QUOTA_MIN} min
            </p>
            <p className="text-xs text-text-secondary">{quotaPercent}% wykorzystano</p>
          </div>
          <div>
            <p className="text-text-secondary text-xs">Średnio na usera</p>
            <p className="text-xl font-bold text-text-primary">{data.beta.avgPerUser} min</p>
          </div>
          <div>
            <p className="text-text-secondary text-xs">Top user</p>
            {data.beta.topUser ? (
              <>
                <p className="text-sm font-bold text-text-primary">{data.beta.topUser.name}</p>
                <p className="text-xs text-text-secondary">{data.beta.topUser.minutes} min</p>
              </>
            ) : (
              <p className="text-sm text-text-secondary">—</p>
            )}
          </div>
        </div>
      </div>

      {/* Main stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Aktywni użytkownicy (7d)", value: data.activeUsers, icon: Users },
          { label: "Lekcje w tym miesiącu", value: data.lessonsThisMonth, icon: BookOpen },
          { label: "Minuty w tym miesiącu", value: `${data.minutesThisMonth}`, icon: Clock },
          { label: "Limit ElevenLabs", value: `${data.minutesThisMonth} / ${ELEVENLABS_QUOTA_MIN} min`, icon: Mic, subtitle: `${quotaPercent}%` },
        ].map((stat) => (
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
              <p className="text-xs text-text-secondary mt-1">{stat.subtitle}</p>
            )}
          </div>
        ))}
      </div>

      {/* Magic Link Issues (24h) */}
      <div className="bg-bg-card border border-border rounded-xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <Mail size={20} className="text-primary" />
          <h2 className="text-lg font-semibold text-text-primary">Magic link issues (24h)</h2>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 mb-4">
          <div>
            <p className="text-text-secondary text-xs">Wysłane</p>
            <p className="text-xl font-bold text-text-primary">{data.magicLinks.sent}</p>
          </div>
          <div>
            <p className="text-text-secondary text-xs">Dostarczone</p>
            <p className="text-xl font-bold text-text-primary">{data.magicLinks.delivered}</p>
          </div>
          <div>
            <p className="text-text-secondary text-xs">Kliknięte</p>
            <p className="text-xl font-bold text-text-primary">{data.magicLinks.clicked}</p>
          </div>
          <div>
            <p className="text-text-secondary text-xs">Bounce</p>
            <p className={`text-xl font-bold ${data.magicLinks.bounced > 0 ? "text-red-400" : "text-text-primary"}`}>{data.magicLinks.bounced}</p>
          </div>
          <div>
            <p className="text-text-secondary text-xs">Follow-upy</p>
            <p className="text-xl font-bold text-text-primary">{data.magicLinks.followedUp}</p>
          </div>
        </div>

        {data.magicLinks.unresolved.length > 0 && (
          <div className="mt-4 border-t border-border pt-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle size={14} className="text-amber-400" />
              <span className="text-sm font-medium text-amber-400">
                {data.magicLinks.unresolved.length} osób nie kliknęło po follow-upie
              </span>
            </div>
            <div className="space-y-1">
              {data.magicLinks.unresolved.map((u, i) => (
                <p key={i} className="text-xs text-text-secondary">
                  {u.email} ({u.language}, {new Date(u.sentAt).toLocaleString("pl-PL")})
                </p>
              ))}
            </div>
          </div>
        )}
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
