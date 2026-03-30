import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { getAgeGroup, calculateAge, KIDS_AGENT_PROMPT_TEMPLATE } from "@/lib/kids";
import { getKidsPersona, KIDS_LESSON_DURATION } from "@/config/kids-agents";
import { getRandomKidsTopic } from "@/config/kids-topics";
import type { AgeGroup } from "@/types/kids";

const LANG_NAME_PL: Record<string, string> = {
  en: "angielski", es: "hiszpański", no: "norweski", fr: "francuski",
  de: "niemiecki", it: "włoski", sv: "szwedzki", pt: "portugalski",
  hu: "węgierski", fi: "fiński", ko: "koreański", ja: "japoński",
  zh: "chiński", ru: "rosyjski", pl: "polski", da: "duński",
  nl: "niderlandzki", tr: "turecki", ro: "rumuński", cs: "czeski",
};

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const cookieStore = await cookies();
  const activeChildId = cookieStore.get("godoj_active_child_id")?.value;
  if (!activeChildId) return NextResponse.json({ error: "No active child" }, { status: 400 });

  const { data: child } = await supabase
    .from("child_profiles")
    .select("*")
    .eq("id", activeChildId)
    .eq("parent_id", user.id)
    .single();

  if (!child) return NextResponse.json({ error: "Child not found" }, { status: 404 });

  const ageGroup = getAgeGroup(child.date_of_birth) as AgeGroup;
  const duration = KIDS_LESSON_DURATION[ageGroup] ?? 10;
  const persona = getKidsPersona(child.target_language);
  const langNamePl = LANG_NAME_PL[child.target_language] ?? child.target_language;

  // Get recent topics to avoid repetition
  const { data: recentLessons } = await supabase
    .from("child_lessons")
    .select("topic")
    .eq("child_id", activeChildId)
    .order("started_at", { ascending: false })
    .limit(5);
  const recentTopics = (recentLessons ?? []).map((l) => l.topic).filter(Boolean);

  const topic = getRandomKidsTopic(ageGroup, recentTopics);

  // Find kids agent for language — prefer audience='kids', fall back to any
  let agentConfig = null;
  const { data: kidsAgent } = await supabase
    .from("agents_config")
    .select("id, elevenlabs_agent_id, voice_name")
    .eq("language", child.target_language)
    .eq("audience", "kids")
    .eq("is_active", true)
    .limit(1)
    .single();

  if (kidsAgent) {
    agentConfig = kidsAgent;
  } else {
    // Fall back to any active agent for this language
    const { data: fallback } = await supabase
      .from("agents_config")
      .select("id, elevenlabs_agent_id, voice_name")
      .eq("language", child.target_language)
      .eq("is_active", true)
      .limit(1)
      .single();
    agentConfig = fallback;
  }

  if (!agentConfig) {
    return NextResponse.json(
      { error: `Brak tutora dla języka: ${langNamePl}` },
      { status: 400 }
    );
  }

  // Get signed URL from ElevenLabs
  const signedUrlResponse = await fetch(
    `https://api.elevenlabs.io/v1/convai/conversation/get-signed-url?agent_id=${agentConfig.elevenlabs_agent_id}`,
    {
      method: "GET",
      headers: { "xi-api-key": process.env.ELEVENLABS_API_KEY! },
    }
  );

  if (!signedUrlResponse.ok) {
    const errorText = await signedUrlResponse.text();
    console.error("ElevenLabs kids signed URL error:", errorText);
    return NextResponse.json(
      { error: "Nie udało się połączyć z tutorem" },
      { status: 502 }
    );
  }

  const { signed_url } = await signedUrlResponse.json();

  // Build kids system prompt
  const age = calculateAge(child.date_of_birth);
  const systemPromptOverride = KIDS_AGENT_PROMPT_TEMPLATE
    .replace(/\{\{agent_name\}\}/g, persona.name)
    .replace(/\{\{target_language\}\}/g, langNamePl)
    .replace(/\{\{native_language\}\}/g, "polski")
    .replace(/\{\{child_name\}\}/g, child.name)
    .replace(/\{\{level\}\}/g, ageGroup)
    .replace(/\{\{level_label\}\}/g, `${age} lat, temat: ${topic}`)
    .replace(/\{\{topic\}\}/g, topic);

  // Create lesson record
  const { data: lesson, error: lessonError } = await supabase
    .from("child_lessons")
    .insert({
      child_id: activeChildId,
      parent_id: user.id,
      language: child.target_language,
      agent_id: agentConfig.id,
      topic,
    })
    .select("id")
    .single();

  if (lessonError) {
    console.error("Kids lesson creation error:", lessonError);
    return NextResponse.json({ error: "Nie udało się utworzyć lekcji" }, { status: 500 });
  }

  return NextResponse.json({
    signed_url,
    lesson_id: lesson.id,
    topic,
    duration,
    agent_name: persona.name,
    agent_emoji: persona.emoji,
    child_name: child.name,
    age_group: ageGroup,
    target_language: child.target_language,
    language_name: langNamePl,
    system_prompt_override: systemPromptOverride,
  });
}
