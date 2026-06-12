import { dripEmail } from "@/lib/email-templates";
import { nativeGreeting } from "@/config/native-greetings";

// ─────────────────────────────────────────────────────────────────────────────
// Onboarding drip campaign — full PL/EN copy.
// Schedule (days counted from trial_started_at, trial = 14 days):
//   welcome              — immediately after onboarding (sent from the action)
//   nudge_day1           — day 1+, 0 lessons
//   nudge_day3           — day 3+, 0 lessons
//   nudge_day7           — day 7+, 0 lessons
//   congrats_first_lesson— after 1st completed lesson (next cron run)
//   inactive_3d          — 1+ lessons, no lesson for 3+ days
//   trial_3days          — 3 days before trial end (≈ day 11)
//   trial_1day           — 1 day before trial end (≈ day 13)
//   trial_expired        — trial over (day 14) + one-click 7-day extension
// One email per user per day max; each key sent once ever (drip_emails).
// ─────────────────────────────────────────────────────────────────────────────

export type DripKey =
  | "welcome"
  | "nudge_day1"
  | "nudge_day3"
  | "nudge_day7"
  | "congrats_first_lesson"
  | "inactive_3d"
  | "trial_3days"
  | "trial_1day"
  | "trial_expired";

type Ctx = {
  name: string;
  locale: "pl" | "en";
  nativeLang?: string | null;
  appUrl: string;
  extendUrl?: string;
  trialDaysLeft?: number;
};

export function buildDripEmail(key: DripKey, ctx: Ctx): { subject: string; html: string } {
  const { name, locale, appUrl } = ctx;
  const pl = locale === "pl";
  const dash = `${appUrl}/app/dashboard`;

  switch (key) {
    case "welcome": {
      // First line in the user's NATIVE language — personal touch
      const lead = nativeGreeting(ctx.nativeLang, name);
      return {
        subject: pl ? "Witaj w Godoj — Twoja pierwsza rozmowa czeka 🎙" : "Welcome to Godoj — your first conversation is waiting 🎙",
        html: dripEmail({
          locale,
          lead,
          title: pl ? "Cieszę się, że jesteś!" : "Great to have you here!",
          bodyHtml: pl
            ? `Tu Maciej — zbudowałem Godoj, bo wierzę, że płynność bierze się z mówienia, nie z wkuwania.<br><br>
               Masz teraz <strong>14 dni i 30 minut rozmów za darmo</strong>. Mój przepis na start:<br><br>
               1. Wejdź na dashboard i kliknij <strong>„Rozpocznij lekcję"</strong><br>
               2. Nie przejmuj się błędami — tutor nigdy nie ocenia<br>
               3. 5–10 minut dziennie wystarczy<br><br>
               Pierwsza rozmowa jest zawsze najtrudniejsza. Druga już z górki. 😉`
            : `Maciej here — I built Godoj because I believe fluency comes from speaking, not memorizing.<br><br>
               You now have <strong>14 days and 30 free minutes</strong> of conversations. My recipe to start:<br><br>
               1. Open the dashboard and hit <strong>"Start lesson"</strong><br>
               2. Don't worry about mistakes — the tutor never judges<br>
               3. 5–10 minutes a day is plenty<br><br>
               The first conversation is always the hardest. The second one is all downhill. 😉`,
          ctaText: pl ? "Zacznij pierwszą rozmowę" : "Start your first conversation",
          ctaUrl: dash,
          closing: pl ? "Do usłyszenia,<br>Maciej" : "Talk soon,<br>Maciej",
        }),
      };
    }

    case "nudge_day1":
      return {
        subject: pl ? "Twój tutor czeka (i wcale się nie nudzi) 🎧" : "Your tutor is waiting (and not even bored) 🎧",
        html: dripEmail({
          locale,
          lead: `${pl ? "Cześć" : "Hi"} ${name}!`,
          title: pl ? "Pierwsza rozmowa to 5 minut" : "Your first conversation takes 5 minutes",
          bodyHtml: pl
            ? `Widzę, że konto gotowe, ale jeszcze nie godałeś/aś. Totalnie rozumiem — włączenie mikrofonu i mówienie w obcym języku wymaga odwagi.<br><br>
               Dlatego pierwsza lekcja jest celowo krótka i prowadzona za rękę: tutor wie, że zaczynasz, mówi powoli i podpowiada. Naprawdę nie da się tu „zbłaźnić" — nikt nie słucha poza AI, które nie ocenia.`
            : `Your account is ready, but you haven't spoken yet. Totally get it — turning on the mic and speaking a foreign language takes courage.<br><br>
               That's why the first lesson is deliberately short and guided: the tutor knows you're new, speaks slowly, and gives hints. There's no way to embarrass yourself — nobody's listening except an AI that doesn't judge.`,
          ctaText: pl ? "Spróbuj 5 minut" : "Try 5 minutes",
          ctaUrl: dash,
        }),
      };

    case "nudge_day3":
      return {
        subject: pl ? "Coś Cię blokuje? Napisz mi" : "Is something blocking you? Tell me",
        html: dripEmail({
          locale,
          lead: `${pl ? "Cześć" : "Hi"} ${name}!`,
          title: pl ? "Pytanie od człowieka, nie od bota" : "A question from a human, not a bot",
          bodyHtml: pl
            ? `Tu znowu Maciej. Zarejestrowałeś/aś się 3 dni temu i jeszcze nie odbyłeś/aś rozmowy — a ja chcę wiedzieć dlaczego, bo to dla mnie najcenniejsza informacja na świecie.<br><br>
               Mikrofon nie działa? Nie wiesz od czego zacząć? Boisz się, że poziom za wysoki? <strong>Po prostu odpisz na tego maila</strong> — czytam każdą odpowiedź osobiście.<br><br>
               PS. Twój trial trwa jeszcze ${14 - 3} dni — zostało mnóstwo czasu.`
            : `Maciej again. You signed up 3 days ago and haven't had a conversation yet — and I'd love to know why, because that's the most valuable feedback I can get.<br><br>
               Mic not working? Not sure where to start? Worried the level is too high? <strong>Just reply to this email</strong> — I personally read every answer.<br><br>
               PS. Your trial still has ${14 - 3} days left — plenty of time.`,
          ctaText: pl ? "Wróć do Godoj" : "Back to Godoj",
          ctaUrl: dash,
        }),
      };

    case "nudge_day7":
      return {
        subject: pl ? "Połowa triala za nami — 30 darmowych minut wciąż czeka" : "Halfway through your trial — 30 free minutes still waiting",
        html: dripEmail({
          locale,
          lead: `${pl ? "Cześć" : "Hi"} ${name}!`,
          title: pl ? "Zostało 7 dni triala" : "7 days of trial left",
          bodyHtml: pl
            ? `Krótka matematyka: masz <strong>30 darmowych minut</strong> i 7 dni, żeby je wykorzystać. To 4–5 pełnych rozmów — wystarczająco, żeby sprawdzić, czy ta metoda jest dla Ciebie.<br><br>
               Najgorszy scenariusz? Stwierdzisz, że to nie to. Najlepszy? Odkryjesz, że umiesz powiedzieć więcej, niż myślisz.`
            : `Quick math: you have <strong>30 free minutes</strong> and 7 days to use them. That's 4–5 full conversations — enough to know whether this method works for you.<br><br>
               Worst case? You decide it's not for you. Best case? You find out you can say more than you think.`,
          ctaText: pl ? "Wykorzystaj darmowe minuty" : "Use your free minutes",
          ctaUrl: dash,
        }),
      };

    case "congrats_first_lesson":
      return {
        subject: pl ? "Pierwsza rozmowa za Tobą! 🎉" : "Your first conversation — done! 🎉",
        html: dripEmail({
          locale,
          lead: `${pl ? "Brawo" : "Way to go"}, ${name}!`,
          title: pl ? "Najtrudniejszy krok masz za sobą" : "The hardest step is behind you",
          bodyHtml: pl
            ? `Serio — większość ludzi nigdy nie przechodzi od „uczę się języka" do „mówię w języku". Ty właśnie to zrobiłeś/aś.<br><br>
               Teraz najważniejsza jest <strong>regularność</strong>: 5–10 minut dziennie bije godzinę raz w tygodniu. Tutor pamięta Waszą ostatnią rozmowę i nawiąże do niej.<br><br>
               Jedno pytanie: jak wrażenia? Odpisz szczerze — dobre i złe uwagi są dla mnie złotem.`
            : `Seriously — most people never get from "learning a language" to "speaking a language". You just did.<br><br>
               Now the key is <strong>consistency</strong>: 5–10 minutes a day beats an hour once a week. Your tutor remembers your last conversation and will pick up where you left off.<br><br>
               One question: how was it? Reply honestly — good and bad feedback are both gold to me.`,
          ctaText: pl ? "Kolejna rozmowa" : "Next conversation",
          ctaUrl: dash,
        }),
      };

    case "inactive_3d":
      return {
        subject: pl ? "3 dni ciszy — Twój tutor zaczyna tęsknić 🥲" : "3 quiet days — your tutor misses you 🥲",
        html: dripEmail({
          locale,
          lead: `${pl ? "Cześć" : "Hi"} ${name}!`,
          title: pl ? "Wracaj, zanim język „wystygnie”" : "Come back before the language goes cold",
          bodyHtml: pl
            ? `Badania są bezlitosne: przerwa 3+ dni wyraźnie spowalnia postępy w mówieniu. Dobra wiadomość — wystarczy <strong>jedna 5-minutowa rozmowa</strong>, żeby wrócić do rytmu.<br><br>
               Twój tutor pamięta, na czym skończyliście. Po prostu wejdź i powiedz „cześć".`
            : `The research is brutal: a 3+ day break visibly slows down speaking progress. Good news — <strong>one 5-minute conversation</strong> is enough to get back in rhythm.<br><br>
               Your tutor remembers where you left off. Just come back and say hi.`,
          ctaText: pl ? "Szybka rozmowa (5 min)" : "Quick conversation (5 min)",
          ctaUrl: dash,
        }),
      };

    case "trial_3days":
      return {
        subject: pl ? "Trial kończy się za 3 dni" : "Your trial ends in 3 days",
        html: dripEmail({
          locale,
          lead: `${pl ? "Cześć" : "Hi"} ${name}!`,
          title: pl ? "Zostały 3 dni okresu próbnego" : "3 days left in your trial",
          bodyHtml: pl
            ? `Krótkie, systemowe przypomnienie: Twój okres próbny kończy się za <strong>3 dni</strong>.<br><br>
               Jeśli Godoj Ci pomaga — plany zaczynają się od <strong>45 zł/mies</strong> (promocja beta -50% przez 3 miesiące). Jeśli się wahasz, wykorzystaj pozostałe darmowe minuty i zdecyduj później.`
            : `A quick system reminder: your free trial ends in <strong>3 days</strong>.<br><br>
               If Godoj is working for you — plans start at <strong>$12/mo</strong> (beta -50% promo for 3 months). If you're on the fence, use your remaining free minutes and decide later.`,
          ctaText: pl ? "Zobacz plany" : "See plans",
          ctaUrl: `${appUrl}/app/settings/plans`,
        }),
      };

    case "trial_1day":
      return {
        subject: pl ? "Ostatni dzień triala — jutro koniec" : "Last day of your trial — it ends tomorrow",
        html: dripEmail({
          locale,
          lead: `${pl ? "Cześć" : "Hi"} ${name}!`,
          title: pl ? "Twój trial kończy się jutro" : "Your trial ends tomorrow",
          bodyHtml: pl
            ? `To ostatni moment, żeby wykorzystać darmowe minuty i zdecydować, czy zostajesz.<br><br>
               Promocja beta: <strong>-50% przez pierwsze 3 miesiące</strong> — Starter za 45 zł/mies zamiast 89 zł. Ta oferta zniknie 30.06.`
            : `This is the last moment to use your free minutes and decide if you're staying.<br><br>
               Beta promo: <strong>-50% for the first 3 months</strong> — Starter at $12/mo instead of $24. The offer disappears June 30.`,
          ctaText: pl ? "Wybierz plan" : "Choose a plan",
          ctaUrl: `${appUrl}/app/settings/plans`,
        }),
      };

    case "trial_expired":
      return {
        subject: pl ? "Trial zakończony — ale mam coś dla Ciebie" : "Trial over — but I've got something for you",
        html: dripEmail({
          locale,
          lead: `${pl ? "Cześć" : "Hi"} ${name}!`,
          title: pl ? "Dziękuję, że spróbowałeś/aś Godoj" : "Thanks for giving Godoj a try",
          bodyHtml: pl
            ? `Twój 14-dniowy okres próbny dobiegł końca. Jeśli zabrakło Ci czasu, żeby naprawdę przetestować rozmowy — rozumiem, życie.<br><br>
               Dlatego masz ode mnie <strong>jednorazowe przedłużenie o 7 dni</strong> — jedno kliknięcie poniżej, bez podawania karty:`
            : `Your 14-day trial has ended. If you didn't get enough time to really test the conversations — I get it, life happens.<br><br>
               So here's a <strong>one-time 7-day extension</strong> from me — one click below, no card required:`,
          ctaText: pl ? "Przedłuż trial o 7 dni" : "Extend my trial by 7 days",
          ctaUrl: ctx.extendUrl ?? `${appUrl}/app/settings/plans`,
          closing: pl
            ? `A jeśli już wiesz, że chcesz zostać — <a href="${appUrl}/app/settings/plans" style="color:#84adff;">plany znajdziesz tutaj</a>.<br><br>Maciej`
            : `And if you already know you want to stay — <a href="${appUrl}/app/settings/plans" style="color:#84adff;">plans are here</a>.<br><br>Maciej`,
        }),
      };
  }
}
