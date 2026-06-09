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
    // Map native language code to English name for Claude prompt instructions
    const nativeLangNames: Record<string, string> = {
      pl: "Polish", en: "English", uk: "Ukrainian", de: "German", fr: "French",
      es: "Spanish", it: "Italian", pt: "Portuguese", ru: "Russian", cs: "Czech",
      sk: "Slovak", hu: "Hungarian", ro: "Romanian", bg: "Bulgarian", hr: "Croatian",
      sl: "Slovenian", nl: "Dutch", sv: "Swedish", no: "Norwegian", da: "Danish",
      fi: "Finnish", el: "Greek", tr: "Turkish", ar: "Arabic", hi: "Hindi",
      ja: "Japanese", ko: "Korean", zh: "Chinese", vi: "Vietnamese", th: "Thai",
      id: "Indonesian", lt: "Lithuanian",
    };
    const commentLang = nativeLangNames[nativeLang] ?? "English";

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

    // Sub-level system: A1 → A1+ → A2 → A2+ → B1 → B1+ → B2 → B2+ → C1 → C1+ → C2 → C2+ → Native
    // Claude recommends base CEFR levels (A1, A2, B1, B2, C1, C2)
    // Sub-level "+" transitions are purely XP-based
    // CEFR transitions (A1+→A2, etc.) require XP + Claude recommendation
    const baseCEFR = (level: string) => level.replace("+", "");
    const teachingLevel = baseCEFR(lesson.level_at_start); // A1+ → A1 for prompts

    const CEFR_BASE = ["A1", "A2", "B1", "B2", "C1", "C2"];
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
Write ALL text outputs (summary, reasoning, translations, comments) in ${commentLang}.

Language studied: ${langName}
Student level: ${teachingLevel}
Duration: ${durationMin} minutes
Number of student utterances: ${userMsgCount}
Transcript:
${transcript || "No transcript"}

${isTooShort ? `IMPORTANT: This lesson was very short (${durationMin} min, ${userMsgCount} student messages). Set fluency_score to null and score_breakdown to null — there is not enough data to assess. In summary, encourage the student to try a longer conversation next time.` : ''}

LESSON SCORING RUBRIC — score how well the student communicates at ${teachingLevel}.
Use precise decimal scores (e.g. 3.7, 4.2, 4.8) — NOT just .0 or .5. Be as granular as the performance warrants.
- 1.0-1.9: Cannot form basic sentences expected at ${teachingLevel}, mostly unintelligible
- 2.0-2.9: Below expectations for ${teachingLevel}, frequent errors in basic structures
- 3.0-3.4: Functional at ${teachingLevel} but with noticeable errors and hesitation
- 3.5-3.9: Meets expectations for ${teachingLevel} with some errors
- 4.0-4.4: Good performance — correct structures, appropriate vocabulary, some minor imperfections
- 4.5-4.9: Very good — natural flow, varied vocabulary, only occasional small errors
- 5.0: Excellent — fluent, natural, error-free or near error-free conversation at ${teachingLevel} or above

CRITICAL SCORING RULES:
- fluency_score is the OVERALL lesson score (weighted average of the 5 sub-scores below). It is SEPARATE from level recommendation.
- Do NOT lower the score because "the student needs more practice to advance" — that's what level_assessment is for.
- 5.0 is NOT reserved for some theoretical perfection — give 5.0 when the conversation flows naturally with no errors, rich vocabulary, and confident expression. If you cannot name a SPECIFIC mistake or hesitation, the score MUST be 5.0.
- A sub-score below 5.0 REQUIRES you to name the specific deficiency in the comment. "Could be more varied" or "room for improvement" without a concrete example = unjustified deduction. Remove it.
- If the student speaks ABOVE their current level, that's still 5.0 (not lower because "it's beyond ${teachingLevel}").
- Reserve 4.0-4.4 ONLY when there are actual, specific errors, hesitations, or unnatural phrasing you can name.
- Reserve scores below 3.0 for genuine struggles.
- NEVER give 4.7 or 4.8 as a "safe almost-perfect" — either you have a concrete reason to deduct (then give the precise score matching the severity) or you don't (then it's 5.0).

SCORE BREAKDOWN — provide 5 sub-scores (each 1.0-5.0, use decimals like 4.2, 4.7) with a SHORT encouraging comment:
- grammar: correctness of structures at ${teachingLevel}
- vocabulary: richness and appropriateness of words used
- fluency: natural flow, lack of hesitation, smooth delivery
- comprehension: how well the student understood the tutor and responded on topic
- courage: willingness to try complex structures, not falling back to native language, taking risks

COMMENT TONE RULES:
- Be warm, encouraging, and specific. Address the student by name (${userName}).
- Always start with what went WELL, then gently suggest what to practice.
- Frame weaknesses as opportunities, not failures. E.g.: "Świetnie próbujesz budować złożone zdania! Popracuj jeszcze nad czasami przeszłymi — to przyjdzie z praktyką." NOT "Dużo błędów w czasach przeszłych."
- Keep each comment to 1 sentence maximum.

LEVEL ASSESSMENT RULES:
- You can ONLY recommend: "${teachingLevel}" (stay), "${nextBase}" (up one), or "${prevBase}" (down one)
- Recommend UP only if: student consistently uses structures ABOVE ${teachingLevel}, vocabulary is rich, and they show comfort with complexity beyond ${teachingLevel}
- Recommend DOWN only if: student clearly struggles with basics of ${teachingLevel}
- When in doubt, recommend staying at "${teachingLevel}" — this is the safe default
- A single good lesson is NOT enough to recommend promotion. Be conservative.

VOCABULARY RULES:
- new_vocabulary MUST contain ONLY words that the STUDENT actually used or attempted in their speech
- Do NOT include words that only the tutor/agent introduced — those belong to the tutor's vocabulary, not the student's
- Look at the "User/Student" lines in the transcript and extract interesting or advanced words THEY produced
- If the student didn't use any notable new vocabulary, return an empty array []

Prepare the analysis in JSON format (no markdown, raw JSON only):
{
  "fluency_score": ${isTooShort ? 'null' : `(1.0-5.0, overall weighted average of sub-scores — remember: correct ${teachingLevel} performance = 4.0+)`},
  "score_breakdown": ${isTooShort ? 'null' : `{
    "grammar": {"score": 1.0-5.0, "comment": "1 sentence in ${commentLang}, warm and encouraging"},
    "vocabulary": {"score": 1.0-5.0, "comment": "..."},
    "fluency": {"score": 1.0-5.0, "comment": "..."},
    "comprehension": {"score": 1.0-5.0, "comment": "..."},
    "courage": {"score": 1.0-5.0, "comment": "..."}
  }`},
  "topics_covered": ["topic1", "topic2"],
  "new_vocabulary": [
    {"word": "word in target language that the STUDENT actually used or attempted", "translation": "translation in ${commentLang}", "context": "the exact sentence FROM THE STUDENT'S speech where they used/attempted this word"}
  ],
  "struggled_phrases": ["Specific structure/word with CORRECT form + translation in ${commentLang}. Do NOT copy raw transcript. E.g.: 'It makes it difficult — make + object + adjective structure'"],
  "level_assessment": {
    "current": "${teachingLevel}",
    "recommended": "${teachingLevel}" or "${nextBase}" or "${prevBase}",
    "reasoning": "brief explanation in ${commentLang}"
  },
  "summary_pl": "2-3 sentences in ${commentLang}: what the user did well and what to work on",
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
        score_breakdown: null,
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
      "C1":  3500,  // C1  → C1+
      "C1+": 4000,  // C1+ → C2  (requires Claude recommendation)
      "C2":  5000,  // C2  → C2+
      "C2+": 6000,  // C2+ → Native (requires Claude recommendation)
      "Native": 99999, // ultimate level — XP still accumulates for stats
    };

    // Full sub-level order
    const LEVEL_ORDER = ["A1", "A1+", "A2", "A2+", "B1", "B1+", "B2", "B2+", "C1", "C1+", "C2", "C2+", "Native"];
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
    const CEFR_MAP: Record<string, number> = { A1: 0, A2: 1, B1: 2, B2: 3, C1: 4, C2: 5 };
    let clampedRecommendation = teachingLevel;
    if (recommendedLevel && CEFR_MAP[recommendedLevel] !== undefined) {
      const diff = CEFR_MAP[recommendedLevel] - CEFR_MAP[teachingLevel];
      const clampedIdx = CEFR_MAP[teachingLevel] + Math.max(-1, Math.min(1, diff));
      clampedRecommendation = CEFR_BASE[Math.max(0, Math.min(CEFR_BASE.length - 1, clampedIdx))];
    }

    // Update lesson record + fetch profile in parallel (independent operations)
    const [, { data: currentProfile }] = await Promise.all([
      supabase
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
        .eq("id", lesson_id),
      supabase
        .from("user_profiles")
        .select("current_level, xp_current, xp_total")
        .eq("user_id", user.id)
        .eq("target_language", lesson.language)
        .single(),
    ]);

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

    // ── Run all post-analysis writes in parallel ──
    // These operations are independent: profile update, lesson level, vocab, streaks, usage
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

    // ── Critical writes (must succeed for correct response) ──
    const profileUpdate = supabase
      .from("user_profiles")
      .update({
        current_level: newLevel,
        xp_current: resetXP ? 0 : profileXP,
        xp_total: profileXPTotal,
        ...(resetXP ? { level_confirmed_at: new Date().toISOString() } : {}),
      })
      .eq("user_id", user.id)
      .eq("target_language", lesson.language);

    const levelUpdate = newLevel !== currentLevel
      ? supabase.from("lessons").update({ level_at_end: newLevel }).eq("id", lesson_id)
      : Promise.resolve({ error: null });

    const [profileRes, levelRes] = await Promise.all([profileUpdate, levelUpdate]);
    if (profileRes.error) console.error("Profile XP update failed:", profileRes.error);
    if (levelRes.error) console.error("Lesson level_at_end update failed:", levelRes.error);

    // ── Non-critical writes (failures logged, never crash the endpoint) ──
    const nonCritical: Promise<void>[] = [];

    // Vocabulary — upsert-style: try insert, on conflict update
    if (summary.new_vocabulary?.length > 0) {
      for (const v of summary.new_vocabulary as { word: string; translation: string; context?: string }[]) {
        nonCritical.push(
          (async () => {
            // Try insert first; if duplicate, update instead
            const { error: insertErr } = await supabase.from("vocabulary").insert({
              user_id: user.id,
              language: lesson.language,
              word: v.word,
              translation: v.translation,
              context_sentence: v.context ?? null,
              lesson_id,
            });
            if (insertErr) {
              // Likely duplicate — update existing row
              const { error: updateErr } = await supabase
                .from("vocabulary")
                .update({
                  times_used: 1, // will be incremented via RPC or raw SQL if needed
                  last_seen_at: new Date().toISOString(),
                  context_sentence: v.context ?? undefined,
                })
                .eq("user_id", user.id)
                .eq("language", lesson.language)
                .eq("word", v.word);
              if (updateErr) console.error("Vocab update failed:", v.word, updateErr);
            }
          })().catch(err => console.error("Vocab insert/update error:", v.word, err))
        );
      }
    }

    // Streaks
    nonCritical.push(
      (async () => {
        const { data: streak } = await adminDb
          .from("streaks")
          .select("*")
          .eq("user_id", user.id)
          .single();

        if (streak) {
          const lastDate = streak.last_lesson_date;
          const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];

          let newStreak = streak.current_streak;
          if (lastDate === today) {
            newStreak = Math.max(1, newStreak);
          } else if (lastDate === yesterday) {
            newStreak = Math.max(1, newStreak) + 1;
          } else if (!lastDate) {
            newStreak = 1;
          } else {
            newStreak = 1;
          }

          const isNewWeek = !streak.week_start || streak.week_start < weekStart;
          const weeklyMinutes = isNewWeek ? lessonMinutes : (streak.weekly_minutes_done ?? 0) + lessonMinutes;

          const { error } = await adminDb
            .from("streaks")
            .update({
              current_streak: newStreak,
              longest_streak: Math.max(newStreak, streak.longest_streak ?? 0),
              last_lesson_date: today,
              weekly_minutes_done: weeklyMinutes,
              week_start: isNewWeek ? weekStart : streak.week_start,
            })
            .eq("user_id", user.id);
          if (error) console.error("Streak update failed:", error);
        } else {
          const { error } = await adminDb.from("streaks").insert({
            user_id: user.id,
            current_streak: 1,
            longest_streak: 1,
            last_lesson_date: today,
            weekly_minutes_goal: 30,
            weekly_minutes_done: lessonMinutes,
            week_start: weekStart,
          });
          if (error) console.error("Streak insert failed:", error);
        }
      })().catch(err => console.error("Streak error:", err))
    );

    // Subscription usage
    nonCritical.push(
      recordUsage(user.id, duration_seconds).catch(err => {
        console.error("Subscription usage recording error:", err);
      })
    );

    // Fire all non-critical writes — failures are logged, never thrown
    await Promise.allSettled(nonCritical);

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
