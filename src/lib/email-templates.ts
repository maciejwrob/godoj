const BASE_STYLES = `
  body { margin: 0; padding: 0; background-color: #0F172A; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
  .wrapper { background-color: #0F172A; padding: 40px 20px; }
  .card { max-width: 480px; margin: 0 auto; background-color: #1E293B; border-radius: 16px; overflow: hidden; }
  .card-body { padding: 40px 32px; }
  .logo { text-align: center; margin-bottom: 24px; }
  .logo img { width: 48px; height: 48px; border-radius: 12px; display: inline-block; vertical-align: middle; margin-right: 8px; }
  .logo-text { color: #1A73E8; font-size: 28px; font-weight: 800; text-decoration: none; letter-spacing: -0.02em; vertical-align: middle; }
  .heading { color: #FFFFFF; font-size: 24px; font-weight: 700; text-align: center; margin: 0 0 16px 0; }
  .text { color: #94A3B8; font-size: 15px; line-height: 1.6; text-align: center; margin: 0 0 32px 0; }
  .btn-wrapper { text-align: center; margin-bottom: 24px; }
  .btn { display: inline-block; background-color: #1A73E8; color: #FFFFFF !important; font-size: 16px; font-weight: 700; text-decoration: none; padding: 14px 40px; border-radius: 12px; }
  .link-fallback { color: #64748B; font-size: 12px; text-align: center; margin: 0 0 8px 0; }
  .link-url { color: #475569; font-size: 11px; text-align: center; word-break: break-all; margin: 0; }
  .footer { padding: 24px 32px; border-top: 1px solid rgba(255,255,255,0.05); }
  .footer-text { color: #475569; font-size: 12px; text-align: center; margin: 0; }
`;

export function magicLinkEmail(magicLinkUrl: string): string {
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><style>${BASE_STYLES}</style></head>
<body>
<div class="wrapper">
  <div class="card">
    <div class="card-body">
      <div class="logo">
        <img src="https://godoj.co/logo.png" alt="Godoj" /><span class="logo-text">Godoj</span>
      </div>
      <h1 class="heading">Zaloguj sie</h1>
      <p class="text">Kliknij ponizszy przycisk zeby sie zalogowac do Godoj. Link jest wazny przez 24 godziny.</p>
      <div class="btn-wrapper">
        <a href="${magicLinkUrl}" class="btn">Zaloguj sie do Godoj</a>
      </div>
      <p class="link-fallback">Jesli przycisk nie dziala, skopiuj ten link:</p>
      <p class="link-url">${magicLinkUrl}</p>
    </div>
    <div class="footer">
      <p class="footer-text">Godoj — Gadoj. Ucz sie. Plynnie.</p>
    </div>
  </div>
</div>
</body></html>`;
}

export function invitationEmail(inviteUrl: string, adminName: string): string {
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><style>${BASE_STYLES}</style></head>
<body>
<div class="wrapper">
  <div class="card">
    <div class="card-body">
      <div class="logo">
        <img src="https://godoj.co/logo.png" alt="Godoj" /><span class="logo-text">Godoj</span>
      </div>
      <h1 class="heading">Zaproszenie do Godoj</h1>
      <p class="text">${adminName} zaprasza Cie do nauki jezykow z AI!<br><br>Godoj to aplikacja do nauki jezykow przez rozmowe z inteligentnymi tutorami AI. Dolacz i zacznij mowic!</p>
      <div class="btn-wrapper">
        <a href="${inviteUrl}" class="btn">Dolacz do Godoj</a>
      </div>
      <p class="link-fallback">Jesli przycisk nie dziala, skopiuj ten link:</p>
      <p class="link-url">${inviteUrl}</p>
    </div>
    <div class="footer">
      <p class="footer-text">Godoj — Gadoj. Ucz sie. Plynnie.</p>
    </div>
  </div>
</div>
</body></html>`;
}
