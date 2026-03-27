type EmailLocale = "pl" | "en";

function resolveEmailLocale(nativeLang?: string | null): EmailLocale {
  if (nativeLang === "pl") return "pl";
  return "en";
}

const emailStrings = {
  pl: {
    greeting: "Cześć!",
    loginBody: "Kliknij poniższy przycisk żeby się zalogować do Godoj. Link jest ważny przez 24 godziny.",
    loginButton: "Zaloguj się do Godoj",
    linkFallback: "Jeśli przycisk nie działa, skopiuj ten link:",
    footer: "Godoj.co — Speak. Learn. Fluently.",
    inviteTitle: "Zaproszenie do Godoj.co",
    inviteBody: (adminName: string) => `${adminName} zaprasza Cię do nauki języków z AI!<br><br>Godoj.co to aplikacja do nauki języków przez rozmowę z inteligentnymi tutorami AI. Dołącz i zacznij mówić!`,
    inviteButton: "Dołącz do Godoj",
  },
  en: {
    greeting: "Hi!",
    loginBody: "Click the button below to log in to Godoj. The link is valid for 24 hours.",
    loginButton: "Log in to Godoj",
    linkFallback: "If the button doesn't work, copy this link:",
    footer: "Godoj.co — Speak. Learn. Fluently.",
    inviteTitle: "Invitation to Godoj.co",
    inviteBody: (adminName: string) => `${adminName} invites you to learn languages with AI!<br><br>Godoj.co is an app for learning languages through conversation with intelligent AI tutors. Join and start speaking!`,
    inviteButton: "Join Godoj",
  },
};

function emailShell(content: string, footer: string): string {
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head>
<body style="margin:0;padding:0;background-color:#060e20;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<div style="background-color:#060e20;padding:40px 20px;">
  <div style="max-width:480px;margin:0 auto;background-color:#0f1930;border-radius:16px;overflow:hidden;border:1px solid #192540;">
    <div style="padding:40px 32px;">
      <div style="text-align:center;margin-bottom:32px;">
        <span style="color:#1A73E8;font-size:24px;font-weight:800;letter-spacing:-0.02em;">&#127897; Godoj.co</span>
      </div>
      <div style="height:1px;background:#192540;margin-bottom:32px;"></div>
      ${content}
    </div>
    <div style="padding:24px 32px;border-top:1px solid #192540;">
      <p style="color:#6d758c;font-size:12px;text-align:center;margin:0;">${footer}</p>
    </div>
  </div>
</div>
</body></html>`;
}

export function magicLinkEmail(magicLinkUrl: string, nativeLang?: string | null): string {
  const locale = resolveEmailLocale(nativeLang);
  const s = emailStrings[locale];
  const content = `
      <h1 style="color:#dee5ff;font-size:20px;font-weight:700;text-align:center;margin:0 0 16px 0;">${s.greeting}</h1>
      <p style="color:#a3aac4;font-size:14px;line-height:1.6;text-align:center;margin:0 0 32px 0;">${s.loginBody}</p>
      <div style="text-align:center;margin-bottom:24px;">
        <a href="${magicLinkUrl}" style="display:inline-block;background-color:#1A73E8;color:#FFFFFF;font-size:16px;font-weight:700;text-decoration:none;padding:16px 32px;border-radius:12px;">${s.loginButton}</a>
      </div>
      <p style="color:#6d758c;font-size:12px;text-align:center;margin:0 0 8px 0;">${s.linkFallback}</p>
      <p style="color:#84adff;font-size:11px;text-align:center;word-break:break-all;margin:0;">${magicLinkUrl}</p>`;
  return emailShell(content, s.footer);
}

export function invitationEmail(inviteUrl: string, adminName: string, nativeLang?: string | null): string {
  const locale = resolveEmailLocale(nativeLang);
  const s = emailStrings[locale];
  const content = `
      <h1 style="color:#dee5ff;font-size:20px;font-weight:700;text-align:center;margin:0 0 16px 0;">${s.inviteTitle}</h1>
      <p style="color:#a3aac4;font-size:14px;line-height:1.6;text-align:center;margin:0 0 32px 0;">${s.inviteBody(adminName)}</p>
      <div style="text-align:center;margin-bottom:24px;">
        <a href="${inviteUrl}" style="display:inline-block;background-color:#1A73E8;color:#FFFFFF;font-size:16px;font-weight:700;text-decoration:none;padding:16px 32px;border-radius:12px;">${s.inviteButton}</a>
      </div>
      <p style="color:#6d758c;font-size:12px;text-align:center;margin:0 0 8px 0;">${s.linkFallback}</p>
      <p style="color:#84adff;font-size:11px;text-align:center;word-break:break-all;margin:0;">${inviteUrl}</p>`;
  return emailShell(content, s.footer);
}
