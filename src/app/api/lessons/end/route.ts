import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import Anthropic from "@anthropic-ai/sdk";
import { recordUsage } from "@/lib/subscription";

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

    // Sub-level system: A1 → A1+ → A2 → A2+ → B1 → B1+ → B2 → B2+ → C1
    // Claude recommends base CEFR levels (A1, A2, B1, B2, C1)
    // Sub-level "+" transitions are purely XP-based
    // CEFR transitions (A1+→A2, etc.) require XP + Claude recommendation
    const baseCEFR = (level: string) => level.replace("+", "");
    const teachingLevel = baseCEFR(lesson.level_at_start); // A1+ → A1 for prompts

    const CEFR_BASE = ["A1", "A2", "B1", "B2", "C1"];
    const currentBaseIdx = CEFR_BASE.indexOf(teachingLevel);
    const nextBase = currentBaseIdx < CEFR_BASE.length - 1 ? CEFR_BASE[currentBaseIdx + 1] : teachingLevel;
    const prevBase = currentBaseIdx > 0 ? CEFR_BASE[currentBaseIdx - 1] : teachingLevel;

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
Student level: ${teachingLevel}
Duration: ${durationMin} minutes
Number of student utterances: ${userMsgCount}
Transcript:
${transcript || "No transcript"}

${isTooShort ? `IMPORTANT: This lesson was very short (${durationMin} min, ${userMsgCount} student messages). Set fluency_score to null — there is not enough data to assess fluency. In summary, encourage the student to try a longer conversation next time.` : ''}

FLUENCY SCORING RUBRIC — score ONLY how well the student communicates at ${teachingLevel}:
- 1.0-1.5: Cannot form basic sentences expected at ${teachingLevel}, mostly unintelligible
- 2.0-2.5: Below expectations for ${teachingLevel}, frequent errors in basic structures
- 3.0: Functional at ${teachingLevel} but with noticeable errors and hesitation
- 3.5: Meets expectations for ${teachingLevel} with some errors
- 4.0: Good performance — correct structures, appropriate vocabulary, some minor imperfections
- 4.5: Very good — natural flow, varied vocabulary, only occasional small errors
- 5.0: Excellent — fluent, natural, error-free or near error-free conversation at ${teachingLevel} or above

CRITICAL SCORING RULES:
- Fluency score measures ONLY conversation quality. It is SEPARATE from level recommendation.
- Do NOT lower the score because "the student needs more practice to advance" — that's what level_assessment is for.
- A conversation with natural flow, correct grammar, and no significant errors = 5.0, period.
- If the student speaks ABOVE their current level, that's still 5.0 (not lower because "it's beyond ${teachingLevel}").
- Reserve 4.0-4.5 ONLY when there are actual errors, hesitations, or unnatural phrasing.
- Reserve scores below 3.0 for genuine struggles.

LEVEL ASSESSMENT RULES:
- You can ONLY recommend: "${teachingLevel}" (stay), "${nextBase}" (up one), or "${prevBase}" (down one)
- Recommend UP only if: student consistently uses structures ABOVE ${teachingLevel}, vocabulary is rich, and they show comfort with complexity beyond ${teachingLevel}
- Recommend DOWN only if: student clearly struggles with basics of ${teachingLevel}
- When in doubt, recommend staying at "${teachingLevel}" — this is the safe default
- A single good lesson is NOT enough to recommend promotion. Be conservative.

Prepare the analysis in JSON format (no markdown, raw JSON only):
{
  "fluency_score": ${isTooShort ? 'null' : `(1.0-5.0, following the rubric above — remember: correct ${teachingLevel} performance = 4.0+)`},
  "topics_covered": ["topic1", "topic2"],
  "new_vocabulary": [
    {"word": "word in target language", "translation": "translation in ${isPolish ? 'Polish' : 'English'}", "context": "sentence from conversation"}
  ],
  "struggled_phrases": ["Specific structure/word with CORRECT form + translation in ${isPolish ? 'Polish' : 'English'}. Do NOT copy raw transcript. E.g.: 'It makes it difficult — make + object + adjective structure'"],
  "level_assessment": {
    "current": "${teachingLevel}",
    "recommended": "${teachingLevel}" or "${nextBase}" or "${prevBase}",
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
    // Sub-level thresholds: XP needed to advance FROM each level
    const XP_THRESHOLDS: Record<string, number> = {
      "A1":  500,   // A1  → A1+
      "A1+": 800,   // A1+ → A2  (requires Claude recommendation)
      "A2":  1000,  // A2  → A2+
      "A2+": 1200,  // A2+ → B1  (requires Claude recommendation)
      "B1":  1500,  // B1  → B1+
      "B1+": 2000,  // B1+ → B2  (requires Claude recommendation)
      "B2":  2500,  // B2  → B2+
      "B2+": 3000,  // B2+ → C1  (requires Claude recommendation)
      "C1":  99999, // max level
    };

    // Full sub-level order
    const LEVEL_ORDER = ["A1", "A1+", "A2", "A2+", "B1", "B1+", "B2", "B2+", "C1"];
    const nextSubLevel = (level: string): string | null => {
      const idx = LEVEL_ORDER.indexOf(level);
      return idx >= 0 && idx < LEVEL_ORDER.length - 1 ? LEVEL_ORDER[idx + 1] : null;
    };
    // "+" levels are pure XP milestones; CEFR transitions need Claude's recommendation
    const isCEFRTransition = (from: string, to: string) =>
      baseCEFR(from) !== baseCEFR(to); // e.g. A1+→A2 changes base CEFR

    const fluencyForXP = summary.fluency_score ?? 0;
    const newWordsCount = summary.new_vocabulary?.length ?? 0;
    const currentStrk = (await supabase.from("streaks").select("current_streak").eq("user_id", user.id).single()).data?.current_streak ?? 0;

    // New XP formula: fluency is the PRIMARY driver
    const xpBase = Math.min(Math.max(1, durationMin) * 5, 50);   // 5 XP/min, cap 50 (10 min)
    const xpFluency = Math.round(fluencyForXP * 20);              // up to 100 XP (main driver!)
    const xpVocab = Math.min(newWordsCount * 3, 30);              // 3 XP/word, cap 30
    const xpStreak = Math.min(currentStrk * 5, 25);               // 5 XP/streak day, cap 25
    const xpEarned = xpBase + xpFluency + xpVocab + xpStreak;
    // Range: ~30 (short weak) to ~205 (long perfect)

    // ── Level progression logic ──
    // Claude recommends base CEFR levels — clamp to ±1
    const recommendedLevel = summary.level_assessment?.recommended;
    const CEFR_MAP: Record<string, number> = { A1: 0, A2: 1, B1: 2, B2: 3, C1: 4 };
    let clampedRecommendation = teachingLevel;
    if (recommendedLevel && CEFR_MAP[recommendedLevel] !== undefined) {
      const diff = CEFR_MAP[recommendedLevel] - CEFR_MAP[teachingLevel];
      const clampedIdx = CEFR_MAP[teachingLevel] + Math.max(-1, Math.min(1, diff));
      clampedRecommendation = CEFR_BASE[Math.max(0, Math.min(4, clampedIdx))];
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
        level_at_end: lesson.level_at_start, // stays same until promotion
        level_recommended: clampedRecommendation,
        xp_earned: xpEarned,
      })
      .eq("id", lesson_id);

    // ── Check if level should change ──
    const { data: currentProfile } = await supabase
      .from("user_profiles")
      .select("current_level, xp_current, xp_total")
      .eq("user_id", user.id)
      .eq("target_language", lesson.language)
      .single();

    const currentLevel = currentProfile?.current_level ?? lesson.level_at_start;
    const profileXP = (currentProfile?.xp_current ?? 0) + xpEarned;
    const profileXPTotal = (currentProfile?.xp_total ?? 0) + xpEarned;
    const xpThreshold = XP_THRESHOLDS[currentLevel] ?? 99999;

    let newLevel = currentLevel;
    let resetXP = false;
    const candidate = nextSubLevel(currentLevel);

    if (candidate && profileXP >= xpThreshold) {
      if (isCEFRTransition(currentLevel, candidate)) {
        // CEFR boundary (A1+→A2, A2+→B1, etc.) — needs Claude recommendation
        const targetBase = baseCEFR(candidate); // "A2", "B1", etc.

        // Check last 3 lessons for consistent recommendations
        const { data: recentLessons } = await supabase
          .from("lessons")
          .select("level_recommended")
          .eq("user_id", user.id)
          .eq("language", lesson.language)
          .order("started_at", { ascending: false })
          .limit(3);

        const recommendations = (recentLessons ?? []).map(l => l.level_recommended).filter(Boolean);
        const upVotes = recommendations.filter(r => r === targetBase).length;

        if (upVotes >= 2) {
          newLevel = candidate;
          resetXP = true;
          console.log(`[XP] CEFR UP: ${currentLevel} → ${newLevel} (XP: ${profileXP}/${xpThreshold}, votes: ${upVotes}/3)`);
        }
      } else {
        // Sub-level transition (A1→A1+, A2→A2+, etc.) — pure XP, automatic!
        newLevel = candidate;
        resetXP = true;
        console.log(`[XP] Sub-level UP: ${currentLevel} → ${newLevel} (XP: ${profileXP}/${xpThreshold})`);
      }
    }

    // Check for demotion (only at CEFR boundaries, very conservative)
    if (newLevel === currentLevel && clampedRecommendation < teachingLevel) {
      const { data: recentLessons } = await supabase
        .from("lessons")
        .select("level_recommended")
        .eq("user_id", user.id)
        .eq("language", lesson.language)
        .order("started_at", { ascending: false })
        .limit(3);
      const recommendations = (recentLessons ?? []).map(l => l.level_recommended).filter(Boolean);
      const downVotes = recommendations.filter(r => r === clampedRecommendation).length;
      if (downVotes >= 3) {
        // Demote to the "+" of the lower CEFR level (e.g. A2→A1+, not A1)
        const prevIdx = LEVEL_ORDER.indexOf(currentLevel);
        if (prevIdx > 0) {
          newLevel = LEVEL_ORDER[prevIdx - 1];
          resetXP = true;
          console.log(`[XP] Level DOWN: ${currentLevel} → ${newLevel} (votes: ${downVotes}/3)`);
        }
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
    if (newLevel !== currentLevel) {
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

    // Record subscription usage (minutes consumed this billing period)
    try {
      await recordUsage(user.id, duration_seconds);
    } catch (usageErr) {
      console.error("Subscription usage recording error:", usageErr);
      // Non-fatal — don't block lesson completion
    }

    return NextResponse.json({
      summary,
      xp: {
        earned: xpEarned,
        current: resetXP ? 0 : profileXP,
        total: profileXPTotal,
        threshold: XP_THRESHOLDS[newLevel] ?? 99999,
        levelChanged: newLevel !== currentLevel,
        previousLevel: currentLevel,
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
