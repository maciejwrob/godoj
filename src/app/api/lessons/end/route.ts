import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic();

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { lesson_id, transcript, duration_seconds } = await request.json();

    // Get lesson, profile, and user data
    const [{ data: lesson }, { data: profile }, { data: userData }] = await Promise.all([
      supabase
        .from("lessons")
        .select("language, level_at_start")
        .eq("id", lesson_id)
        .single(),
      supabase
        .from("user_profiles")
        .select("current_level, target_language")
        .eq("user_id", user.id)
        .limit(1)
        .single(),
      supabase
        .from("users")
        .select("display_name, native_language")
        .eq("id", user.id)
        .single(),
    ]);
    const userName = userData?.display_name ?? "User";
    const nativeLang = userData?.native_language ?? "en";
    const isPolish = nativeLang === "pl";

    if (!lesson) {
      return NextResponse.json(
        { error: "Lekcja nie znaleziona" },
        { status: 404 }
      );
    }

    const langNames: Record<string, string> = {
      es: "hiszpański", en: "angielski", no: "norweski", fr: "francuski",
      it: "włoski", sv: "szwedzki", de: "niemiecki", fi: "fiński",
      pt: "portugalski", hu: "węgierski", ko: "koreański",
    };
    const langName = langNames[lesson.language] ?? lesson.language;

    // Count user messages in transcript for quality assessment
    const userMsgCount = (transcript || "").split('\n').filter((line: string) => line.match(/^(User|Student|Uczeń|You):/i)).length;
    const durationMin = Math.round(duration_seconds / 60);
    const isTooShort = duration_seconds < 60 || userMsgCount < 2;

    // Analyze transcript via Claude
    const CEFR_ORDER = ["A1", "A2", "B1", "B2", "C1"];
    const currentIdx = CEFR_ORDER.indexOf(lesson.level_at_start);
    const nextLevel = currentIdx < CEFR_ORDER.length - 1 ? CEFR_ORDER[currentIdx + 1] : lesson.level_at_start;
    const prevLevel = currentIdx > 0 ? CEFR_ORDER[currentIdx - 1] : lesson.level_at_start;

    const analysisResponse = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1000,
      messages: [
        {
          role: "user",
          content: `You are a language learning expert. Analyze the following conversation transcript.
Address the user directly by name (${userName}). Be warm and motivating.
${isPolish ? 'Write ALL text outputs (summary, reasoning, translations) in Polish.' : 'Write ALL text outputs (summary, reasoning, translations) in English.'}

Language studied: ${langName}
Student level: ${lesson.level_at_start}
Duration: ${durationMin} minutes
Number of student utterances: ${userMsgCount}
Transcript:
${transcript || "No transcript"}

${isTooShort ? `IMPORTANT: This lesson was very short (${durationMin} min, ${userMsgCount} student messages). Set fluency_score to null — there is not enough data to assess fluency. In summary, encourage the student to try a longer conversation next time.` : ''}

FLUENCY SCORING RUBRIC (be strict and consistent):
- 1.0-1.5: Cannot form basic sentences, mostly unintelligible
- 2.0-2.5: Fragments only, major grammar errors, very limited vocabulary
- 3.0-3.5: Can form basic sentences with errors, limited but functional vocabulary for the level
- 4.0-4.5: Good sentence structure, minor errors, vocabulary appropriate for level, natural flow
- 5.0: Near-native fluency for the level, complex structures, natural conversation flow

IMPORTANT: Score relative to the student's CURRENT level (${lesson.level_at_start}). An A1 student using basic phrases correctly = 3.5-4.0. Don't inflate scores — a score of 4.5+ means truly exceptional performance for their level.

LEVEL ASSESSMENT RULES:
- You can ONLY recommend: "${lesson.level_at_start}" (stay), "${nextLevel}" (up one), or "${prevLevel}" (down one)
- Recommend UP only if: student consistently uses structures ABOVE their current level, vocabulary is rich, and they show comfort with complexity beyond ${lesson.level_at_start}
- Recommend DOWN only if: student clearly struggles with basics of ${lesson.level_at_start}
- When in doubt, recommend staying at "${lesson.level_at_start}" — this is the safe default
- A single good lesson is NOT enough to recommend promotion. Be conservative.

Prepare the analysis in JSON format (no markdown, raw JSON only):
{
  "fluency_score": ${isTooShort ? 'null' : '(1.0-5.0, following the rubric above strictly)'},
  "topics_covered": ["topic1", "topic2"],
  "new_vocabulary": [
    {"word": "word in target language", "translation": "translation in ${isPolish ? 'Polish' : 'English'}", "context": "sentence from conversation"}
  ],
  "struggled_phrases": ["Specific structure/word with CORRECT form + translation in ${isPolish ? 'Polish' : 'English'}. Do NOT copy raw transcript. E.g.: 'It makes it difficult — make + object + adjective structure'"],
  "level_assessment": {
    "current": "${lesson.level_at_start}",
    "recommended": "${lesson.level_at_start}" or "${nextLevel}" or "${prevLevel}",
    "reasoning": "brief explanation in ${isPolish ? 'Polish' : 'English'}"
  },
  "summary_pl": "2-3 sentences in ${isPolish ? 'Polish' : 'English'}: what the user did well and what to work on",
  "next_lesson_context": "1-2 sentences of context for the next lesson"
}`,
        },
      ],
    });

    const analysisText =
      analysisResponse.content[0].type === "text"
        ? analysisResponse.content[0].text
        : "{}";

    const cleaned = analysisText.replace(/```json\n?|\n?```/g, "").trim();
    let summary;
    try {
      summary = JSON.parse(cleaned);
    } catch {
      summary = {
        fluency_score: 3.0,
        topics_covered: [],
        new_vocabulary: [],
        struggled_phrases: [],
        level_assessment: {
          current: lesson.level_at_start,
          recommended: lesson.level_at_start,
          reasoning: "Nie udało się przeanalizować transkryptu",
        },
        summary_pl: "Lekcja ukończona. Kontynuuj ćwiczenia!",
        next_lesson_context: "",
      };
    }

    // ── XP Calculation ──
    const XP_THRESHOLDS: Record<string, number> = {
      A1: 500,   // A1 → A2
      A2: 1000,  // A2 → B1
      B1: 1500,  // B1 → B2
      B2: 2000,  // B2 → C1
      C1: 9999,  // max level
    };

    const fluencyForXP = summary.fluency_score ?? 0;
    const newWordsCount = summary.new_vocabulary?.length ?? 0;
    const currentStrk = (await supabase.from("streaks").select("current_streak").eq("user_id", user.id).single()).data?.current_streak ?? 0;

    const xpBase = Math.max(1, durationMin) * 5;          // 5 XP per minute
    const xpFluency = Math.round(fluencyForXP * 10);      // up to 50 XP
    const xpVocab = newWordsCount * 5;                     // 5 XP per new word
    const xpStreak = currentStrk >= 3 ? 10 : 0;           // streak bonus
    const xpEarned = xpBase + xpFluency + xpVocab + xpStreak;

    // ── Level progression logic ──
    const recommendedLevel = summary.level_assessment?.recommended;
    // Clamp recommendation to ±1 level (safety net)
    const CEFR_MAP: Record<string, number> = { A1: 0, A2: 1, B1: 2, B2: 3, C1: 4 };
    const CEFR_REVERSE = ["A1", "A2", "B1", "B2", "C1"];
    let clampedRecommendation = lesson.level_at_start;
    if (recommendedLevel && CEFR_MAP[recommendedLevel] !== undefined) {
      const diff = CEFR_MAP[recommendedLevel] - CEFR_MAP[lesson.level_at_start];
      const clampedIdx = CEFR_MAP[lesson.level_at_start] + Math.max(-1, Math.min(1, diff));
      clampedRecommendation = CEFR_REVERSE[Math.max(0, Math.min(4, clampedIdx))];
    }

    // Update lesson record
    await supabase
      .from("lessons")
      .update({
        ended_at: new Date().toISOString(),
        duration_seconds,
        fluency_score: summary.fluency_score,
        summary_json: summary,
        transcript: transcript || null,
        level_at_end: lesson.level_at_start, // stays same until XP-gated promotion
        level_recommended: clampedRecommendation,
        xp_earned: xpEarned,
      })
      .eq("id", lesson_id);

    // ── Check if level should change (XP threshold + consistent recommendations) ──
    const { data: currentProfile } = await supabase
      .from("user_profiles")
      .select("current_level, xp_current, xp_total")
      .eq("user_id", user.id)
      .eq("target_language", lesson.language)
      .single();

    const profileXP = (currentProfile?.xp_current ?? 0) + xpEarned;
    const profileXPTotal = (currentProfile?.xp_total ?? 0) + xpEarned;
    const xpThreshold = XP_THRESHOLDS[lesson.level_at_start] ?? 9999;

    let newLevel = lesson.level_at_start;
    let resetXP = false;

    if (clampedRecommendation !== lesson.level_at_start && profileXP >= xpThreshold) {
      // Check last 3 lessons for consistent recommendations
      const { data: recentLessons } = await supabase
        .from("lessons")
        .select("level_recommended")
        .eq("user_id", user.id)
        .eq("language", lesson.language)
        .order("started_at", { ascending: false })
        .limit(3);

      const recommendations = (recentLessons ?? []).map(l => l.level_recommended).filter(Boolean);
      const upVotes = recommendations.filter(r => r === clampedRecommendation).length;

      // Promotion: need 2 of last 3 lessons recommending higher level + XP threshold met
      if (clampedRecommendation > lesson.level_at_start && upVotes >= 2) {
        newLevel = clampedRecommendation;
        resetXP = true;
        console.log(`[XP] Level UP: ${lesson.level_at_start} → ${newLevel} (XP: ${profileXP}/${xpThreshold}, votes: ${upVotes}/3)`);
      }
      // Demotion: need 3 of last 3 lessons recommending lower level (stricter)
      else if (clampedRecommendation < lesson.level_at_start && upVotes >= 3) {
        newLevel = clampedRecommendation;
        resetXP = true;
        console.log(`[XP] Level DOWN: ${lesson.level_at_start} → ${newLevel} (votes: ${upVotes}/3)`);
      }
    }

    // Update profile XP and level
    await supabase
      .from("user_profiles")
      .update({
        current_level: newLevel,
        xp_current: resetXP ? 0 : profileXP,
        xp_total: profileXPTotal,
        ...(resetXP ? { level_confirmed_at: new Date().toISOString() } : {}),
      })
      .eq("user_id", user.id)
      .eq("target_language", lesson.language);

    // Update lesson's level_at_end if level actually changed
    if (newLevel !== lesson.level_at_start) {
      await supabase.from("lessons").update({ level_at_end: newLevel }).eq("id", lesson_id);
    }

    // Add vocabulary (deduplicate — increment times_used if exists)
    if (summary.new_vocabulary?.length > 0) {
      for (const v of summary.new_vocabulary as { word: string; translation: string; context?: string }[]) {
        const { data: existing } = await supabase
          .from("vocabulary")
          .select("id, times_used")
          .eq("user_id", user.id)
          .eq("language", lesson.language)
          .eq("word", v.word)
          .limit(1)
          .single();

        if (existing) {
          await supabase.from("vocabulary").update({
            times_used: (existing.times_used ?? 1) + 1,
            last_seen_at: new Date().toISOString(),
            context_sentence: v.context ?? undefined,
          }).eq("id", existing.id);
        } else {
          await supabase.from("vocabulary").insert({
            user_id: user.id,
            language: lesson.language,
            word: v.word,
            translation: v.translation,
            context_sentence: v.context ?? null,
            lesson_id,
          });
        }
      }
    }

    // Update streaks (use admin client to bypass RLS)
    const adminDb = createAdminClient();
    const now = new Date();
    const today = now.toISOString().split("T")[0];
    const lessonMinutes = Math.max(1, Math.round(duration_seconds / 60));

    // Calculate Monday of current week
    const dayOfWeek = now.getDay(); // 0=Sun, 1=Mon...
    const mondayOffset = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    const monday = new Date(now);
    monday.setDate(monday.getDate() - mondayOffset);
    const weekStart = monday.toISOString().split("T")[0];

    const { data: streak } = await adminDb
      .from("streaks")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (streak) {
      const lastDate = streak.last_lesson_date;
      const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];

      // Calculate streak
      let newStreak = streak.current_streak;
      if (lastDate === today) {
        // Already had lesson today — ensure streak is at least 1
        newStreak = Math.max(1, newStreak);
      } else if (lastDate === yesterday) {
        // Consecutive day — increment
        newStreak = Math.max(1, newStreak) + 1;
      } else if (!lastDate) {
        // First ever lesson
        newStreak = 1;
      } else {
        // Gap > 1 day — reset to 1
        newStreak = 1;
      }

      // Weekly minutes: reset if new week, otherwise add
      const isNewWeek = !streak.week_start || streak.week_start < weekStart;
      const weeklyMinutes = isNewWeek ? lessonMinutes : (streak.weekly_minutes_done ?? 0) + lessonMinutes;

      console.log("Streak calc:", { lastDate, today, yesterday, oldStreak: streak.current_streak, newStreak, lessonMinutes, weeklyMinutes, isNewWeek });

      const { error: streakError } = await adminDb
        .from("streaks")
        .update({
          current_streak: newStreak,
          longest_streak: Math.max(newStreak, streak.longest_streak ?? 0),
          last_lesson_date: today,
          weekly_minutes_done: weeklyMinutes,
          week_start: isNewWeek ? weekStart : streak.week_start,
        })
        .eq("user_id", user.id);

      if (streakError) console.error("Streak update error:", streakError);
      else console.log("Streak saved:", { newStreak, weeklyMinutes });
    } else {
      // Create streaks row if missing
      await adminDb.from("streaks").insert({
        user_id: user.id,
        current_streak: 1,
        longest_streak: 1,
        last_lesson_date: today,
        weekly_minutes_goal: 30,
        weekly_minutes_done: lessonMinutes,
        week_start: weekStart,
      });
    }

    return NextResponse.json({
      summary,
      xp: {
        earned: xpEarned,
        current: resetXP ? 0 : profileXP,
        total: profileXPTotal,
        threshold: xpThreshold,
        levelChanged: newLevel !== lesson.level_at_start,
        newLevel,
      },
    });
  } catch (error) {
    console.error("End lesson error:", error);
    return NextResponse.json(
      { error: "Wystąpił błąd podczas analizy lekcji" },
      { status: 500 }
    );
  }
}
