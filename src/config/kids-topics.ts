import type { AgeGroup } from "@/types/kids";

export const KIDS_TOPICS: Record<AgeGroup, string[]> = {
  "4-6": [
    "zwierzęta domowe",
    "kolory",
    "liczby 1-10",
    "jedzenie i owoce",
    "rodzina",
    "zabawki",
    "części ciała",
    "ubrania",
    "dźwięki zwierząt",
    "pory roku",
  ],
  "7-9": [
    "szkoła i klasa",
    "sport i gry",
    "hobby",
    "pogoda",
    "podróże i transport",
    "zwierzęta w zoo",
    "ulubione jedzenie",
    "bajki i postacie",
    "przyjaciele",
    "weekend i zabawy",
    "muzyka",
    "przygody w naturze",
  ],
  "10-12": [
    "technologia i gadżety",
    "gry wideo",
    "muzyka i artyści",
    "filmy i seriale",
    "social media",
    "sport i drużyny",
    "szkoła i przedmioty",
    "podróże marzeń",
    "przyroda i ekologia",
    "przyszłość i zawody",
    "przyjaciele i relacje",
    "kultura i tradycje",
  ],
};

export function getRandomKidsTopic(ageGroup: AgeGroup, recentTopics: string[] = []): string {
  const pool = KIDS_TOPICS[ageGroup];
  const available = pool.filter((t) => !recentTopics.includes(t));
  const source = available.length > 0 ? available : pool;
  return source[Math.floor(Math.random() * source.length)];
}
