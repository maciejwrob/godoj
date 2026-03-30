"use client";

import { createContext, useContext } from "react";
import type { ChildProfile, AgeGroup, KidsTheme } from "@/types/kids";

interface KidsContextType {
  child: ChildProfile;
  ageGroup: AgeGroup;
  theme: KidsTheme;
  switchBackToParent: () => void;
}

export const KidsContext = createContext<KidsContextType | null>(null);

export function useKids(): KidsContextType {
  const ctx = useContext(KidsContext);
  if (!ctx) throw new Error("useKids must be used within KidsLayoutClient");
  return ctx;
}
