// No images — email clients block them. Text logo only. Inline CSS only.

export function magicLinkEmail(magicLinkUrl: string): string {
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head>
<body style="margin:0;padding:0;background-color:#0F172A;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<div style="background-color:#0F172A;padding:40px 20px;">
  <div style="max-width:480px;margin:0 auto;background-color:#1E293B;border-radius:16px;overflow:hidden;">
    <div style="padding:40px 32px;">
      <div style="text-align:center;margin-bottom:24px;">
        <span style="color:#1A73E8;font-size:28px;font-weight:800;letter-spacing:-0.02em;">&#127897; godoj.co</span>
      </div>
      <h1 style="color:#FFFFFF;font-size:24px;font-weight:700;text-align:center;margin:0 0 16px 0;">Cze&#347;&#263;!</h1>
      <p style="color:#94A3B8;font-size:15px;line-height:1.6;text-align:center;margin:0 0 32px 0;">Kliknij poni&#380;szy przycisk &#380;eby si&#281; zalogowa&#263; do Godoj.<br>Link jest wa&#380;ny przez 24 godziny.</p>
      <div style="text-align:center;margin-bottom:24px;">
        <a href="${magicLinkUrl}" style="display:inline-block;background-color:#1A73E8;color:#FFFFFF;font-size:16px;font-weight:700;text-decoration:none;padding:14px 40px;border-radius:12px;">Zaloguj si&#281;</a>
      </div>
      <p style="color:#64748B;font-size:12px;text-align:center;margin:0 0 8px 0;">Je&#347;li przycisk nie dzia&#322;a, skopiuj ten link:</p>
      <p style="color:#475569;font-size:11px;text-align:center;word-break:break-all;margin:0;">${magicLinkUrl}</p>
    </div>
    <div style="padding:24px 32px;border-top:1px solid rgba(255,255,255,0.05);">
      <p style="color:#475569;font-size:12px;text-align:center;margin:0;">godoj.co &#8212; Gadoj. Ucz si&#281;. P&#322;ynnie.</p>
    </div>
  </div>
</div>
</body></html>`;
}

export function invitationEmail(inviteUrl: string, adminName: string): string {
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head>
<body style="margin:0;padding:0;background-color:#0F172A;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<div style="background-color:#0F172A;padding:40px 20px;">
  <div style="max-width:480px;margin:0 auto;background-color:#1E293B;border-radius:16px;overflow:hidden;">
    <div style="padding:40px 32px;">
      <div style="text-align:center;margin-bottom:24px;">
        <span style="color:#1A73E8;font-size:28px;font-weight:800;letter-spacing:-0.02em;">&#127897; godoj.co</span>
      </div>
      <h1 style="color:#FFFFFF;font-size:24px;font-weight:700;text-align:center;margin:0 0 16px 0;">Zaproszenie do Godoj</h1>
      <p style="color:#94A3B8;font-size:15px;line-height:1.6;text-align:center;margin:0 0 32px 0;">${adminName} zaprasza Ci&#281; do nauki j&#281;zyk&#243;w z AI!<br><br>Godoj to aplikacja do nauki j&#281;zyk&#243;w przez rozmow&#281; z inteligentnymi tutorami AI. Do&#322;&#261;cz i zacznij m&#243;wi&#263;!</p>
      <div style="text-align:center;margin-bottom:24px;">
        <a href="${inviteUrl}" style="display:inline-block;background-color:#1A73E8;color:#FFFFFF;font-size:16px;font-weight:700;text-decoration:none;padding:14px 40px;border-radius:12px;">Do&#322;&#261;cz do Godoj</a>
      </div>
      <p style="color:#64748B;font-size:12px;text-align:center;margin:0 0 8px 0;">Je&#347;li przycisk nie dzia&#322;a, skopiuj ten link:</p>
      <p style="color:#475569;font-size:11px;text-align:center;word-break:break-all;margin:0;">${inviteUrl}</p>
    </div>
    <div style="padding:24px 32px;border-top:1px solid rgba(255,255,255,0.05);">
      <p style="color:#475569;font-size:12px;text-align:center;margin:0;">godoj.co &#8212; Gadoj. Ucz si&#281;. P&#322;ynnie.</p>
    </div>
  </div>
</div>
</body></html>`;
}
