export function magicLinkEmail(magicLinkUrl: string): string {
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
      <h1 style="color:#dee5ff;font-size:20px;font-weight:700;text-align:center;margin:0 0 16px 0;">Cze&#347;&#263;!</h1>
      <p style="color:#a3aac4;font-size:14px;line-height:1.6;text-align:center;margin:0 0 32px 0;">Kliknij poni&#380;szy przycisk &#380;eby si&#281; zalogowa&#263; do Godoj. Link jest wa&#380;ny przez 24 godziny.</p>
      <div style="text-align:center;margin-bottom:24px;">
        <a href="${magicLinkUrl}" style="display:inline-block;background-color:#1A73E8;color:#FFFFFF;font-size:16px;font-weight:700;text-decoration:none;padding:16px 32px;border-radius:12px;">Zaloguj si&#281; do Godoj</a>
      </div>
      <p style="color:#6d758c;font-size:12px;text-align:center;margin:0 0 8px 0;">Je&#347;li przycisk nie dzia&#322;a, skopiuj ten link:</p>
      <p style="color:#84adff;font-size:11px;text-align:center;word-break:break-all;margin:0;">${magicLinkUrl}</p>
    </div>
    <div style="padding:24px 32px;border-top:1px solid #192540;">
      <p style="color:#6d758c;font-size:12px;text-align:center;margin:0;">Godoj.co &#8212; Godoj po swojemu. Ucz si&#281;. M&#243;w. P&#322;ynnie.</p>
    </div>
  </div>
</div>
</body></html>`;
}

export function invitationEmail(inviteUrl: string, adminName: string): string {
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
      <h1 style="color:#dee5ff;font-size:20px;font-weight:700;text-align:center;margin:0 0 16px 0;">Zaproszenie do Godoj.co</h1>
      <p style="color:#a3aac4;font-size:14px;line-height:1.6;text-align:center;margin:0 0 32px 0;">${adminName} zaprasza Ci&#281; do nauki j&#281;zyk&#243;w z AI!<br><br>Godoj.co to aplikacja do nauki j&#281;zyk&#243;w przez rozmow&#281; z inteligentnymi tutorami AI. Do&#322;&#261;cz i zacznij m&#243;wi&#263;!</p>
      <div style="text-align:center;margin-bottom:24px;">
        <a href="${inviteUrl}" style="display:inline-block;background-color:#1A73E8;color:#FFFFFF;font-size:16px;font-weight:700;text-decoration:none;padding:16px 32px;border-radius:12px;">Do&#322;&#261;cz do Godoj</a>
      </div>
      <p style="color:#6d758c;font-size:12px;text-align:center;margin:0 0 8px 0;">Je&#347;li przycisk nie dzia&#322;a, skopiuj ten link:</p>
      <p style="color:#84adff;font-size:11px;text-align:center;word-break:break-all;margin:0;">${inviteUrl}</p>
    </div>
    <div style="padding:24px 32px;border-top:1px solid #192540;">
      <p style="color:#6d758c;font-size:12px;text-align:center;margin:0;">Godoj.co &#8212; Godoj po swojemu. Ucz si&#281;. M&#243;w. P&#322;ynnie.</p>
    </div>
  </div>
</div>
</body></html>`;
}
