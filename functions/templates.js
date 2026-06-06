'use strict';

function esc(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// Shared assets (absolute URLs, must be live on eatthisdot.com)
const LOGO  = 'https://www.eatthisdot.com/pics/eat-email.png';
const PHOTO = 'https://www.eatthisdot.com/pics/about/0477e049b54b21c5fb7ea43d5a97ac2b.webp';
const SITE  = 'https://www.eatthisdot.com';
const FROM_DOMAIN = 'eatthisdot.com';

// ─── Shared building blocks ───────────────────────────────────────────────────

function shell(content) {
  return `<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<meta name="color-scheme" content="light">
</head>
<body style="margin:0;padding:0;background-color:#0a0a0a;font-family:-apple-system,BlinkMacSystemFont,'Helvetica Neue',Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased;">

<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#0a0a0a;">
<tr><td align="center" style="padding:36px 16px 48px;">
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:520px;">

  <!-- Logo -->
  <tr><td align="center" style="padding-bottom:20px;">
    <a href="${SITE}" style="text-decoration:none;">
      <img src="${LOGO}" alt="EAT THIS" width="104" style="display:block;width:104px;height:104px;object-fit:contain;border:0;">
    </a>
  </td></tr>

  <!-- Card -->
  <tr><td style="background-color:#ffffff;border-radius:3px;overflow:hidden;">

    <!-- Hero photo -->
    <table width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr><td style="padding:0;font-size:0;line-height:0;">
        <img src="${PHOTO}" alt="" width="520" style="display:block;width:100%;height:200px;object-fit:cover;object-position:center 30%;border:0;">
      </td></tr>
    </table>

    <!-- Orange stripe -->
    <table width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr><td style="background-color:#FF3B00;height:3px;font-size:0;line-height:0;">&nbsp;</td></tr>
    </table>

    <!-- Content -->
    <table width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr><td style="padding:36px 40px 40px;">
        <p style="margin:0 0 10px;font-size:10px;font-weight:700;color:#FF3B00;letter-spacing:3px;text-transform:uppercase;">EAT THIS</p>
        ${content}
      </td></tr>
    </table>

  </td></tr>

  <!-- Footer -->
  <tr><td align="center" style="padding:24px 0 0;">
    <p style="margin:0 0 4px;font-size:11px;color:#3a3a3a;letter-spacing:2px;text-transform:uppercase;font-weight:700;">EAT THIS</p>
    <p style="margin:0;font-size:11px;color:#444;">
      <a href="${SITE}" style="color:#444;text-decoration:none;">${FROM_DOMAIN}</a>
      &nbsp;·&nbsp;Berlin
    </p>
  </td></tr>

</table>
</td></tr>
</table>
</body>
</html>`;
}

function ctaButton(label, link) {
  return `<table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:20px;">
    <tr><td>
      <a href="${link}" style="display:block;background-color:#0a0a0a;color:#ffffff;text-decoration:none;font-size:13px;font-weight:700;letter-spacing:2px;text-transform:uppercase;text-align:center;padding:16px 24px;border-radius:2px;">${label}</a>
    </td></tr>
  </table>`;
}

function linkFallback(link) {
  return `<p style="margin:0;font-size:11px;color:#aaa;text-align:center;line-height:1.7;">
    Kein Button? Kopiere diesen Link in deinen Browser:<br>
    <a href="${link}" style="color:#FF3B00;word-break:break-all;text-decoration:none;">${link}</a>
  </p>`;
}

const divider = `<table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:28px;">
  <tr><td style="border-top:1px solid #ebebeb;font-size:0;line-height:0;">&nbsp;</td></tr>
</table>`;

const dividerTop = `<table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:24px;margin-bottom:20px;">
  <tr><td style="border-top:1px solid #ebebeb;font-size:0;line-height:0;">&nbsp;</td></tr>
</table>`;

function noteBox(text, warning = false) {
  const bg  = warning ? '#fff8f6' : '#f7f7f7';
  const br  = warning ? '1px solid #ffe0d9' : '1px solid #ebebeb';
  const col = warning ? '#b03a2e' : '#888';
  return `<table width="100%" cellpadding="0" cellspacing="0" border="0">
    <tr><td style="background-color:${bg};border:${br};border-radius:2px;padding:14px 16px;">
      <p style="margin:0;font-size:12px;color:${col};line-height:1.7;">${text}</p>
    </td></tr>
  </table>`;
}

// ─── Templates ────────────────────────────────────────────────────────────────

function getVerificationTemplate(displayName, link) {
  return shell(`
    <h1 style="margin:0 0 12px;font-size:32px;font-weight:900;color:#0a0a0a;line-height:1.05;letter-spacing:-1px;">Fast&nbsp;fertig.</h1>
    <p style="margin:0 0 28px;font-size:15px;color:#555;line-height:1.65;">
      Hey ${esc(displayName)} — ein Klick noch, dann zeigen wir dir, was du in Berlin essen musst.
    </p>
    ${divider}
    ${ctaButton('E-Mail bestätigen', link)}
    ${linkFallback(link)}
    ${dividerTop}
    ${noteBox('Nicht du? Kein Stress — einfach ignorieren.')}
  `);
}

function getPasswordResetTemplate(displayName, link) {
  return shell(`
    <h1 style="margin:0 0 12px;font-size:32px;font-weight:900;color:#0a0a0a;line-height:1.05;letter-spacing:-1px;">Passwort&nbsp;vergessen?</h1>
    <p style="margin:0 0 28px;font-size:15px;color:#555;line-height:1.65;">
      Kein Problem, ${esc(displayName)}. Klick unten und leg ein neues fest — dauert 30 Sekunden.
    </p>
    ${divider}
    ${ctaButton('Neues Passwort festlegen', link)}
    ${linkFallback(link)}
    ${dividerTop}
    ${noteBox('⚠️ &nbsp;Nicht du? Dann ignoriere diese Mail — dein Passwort bleibt unverändert.', true)}
  `);
}

function getEmailChangeTemplate(displayName, oldEmail, newEmail, link) {
  return shell(`
    <h1 style="margin:0 0 12px;font-size:32px;font-weight:900;color:#0a0a0a;line-height:1.05;letter-spacing:-1px;">Neue Adresse,<br>kurze Bestätigung.</h1>
    <p style="margin:0 0 24px;font-size:15px;color:#555;line-height:1.65;">
      Hey ${esc(displayName)} — du hast eine neue E-Mail-Adresse eingetragen. Bestätige kurz, dann ist alles aktualisiert.
    </p>
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:28px;">
      <tr><td style="background-color:#f7f7f7;border:1px solid #ebebeb;border-radius:2px;padding:18px 20px;">
        <p style="margin:0 0 10px;font-size:10px;color:#aaa;font-weight:700;letter-spacing:2px;text-transform:uppercase;">Bisher</p>
        <p style="margin:0 0 18px;font-size:14px;color:#888;word-break:break-all;">${esc(oldEmail)}</p>
        <p style="margin:0 0 10px;font-size:10px;color:#aaa;font-weight:700;letter-spacing:2px;text-transform:uppercase;">Neu</p>
        <p style="margin:0;font-size:14px;color:#0a0a0a;font-weight:700;word-break:break-all;">${esc(newEmail)}</p>
      </td></tr>
    </table>
    ${divider}
    ${ctaButton('Änderung bestätigen', link)}
    ${linkFallback(link)}
    ${dividerTop}
    ${noteBox('⚠️ &nbsp;Nicht du? Schreib uns sofort: <a href="mailto:hello@eatthisdot.com" style="color:#FF3B00;text-decoration:none;">hello@eatthisdot.com</a>', true)}
  `);
}

function getMfaTemplate(displayName) {
  return shell(`
    <h1 style="margin:0 0 12px;font-size:32px;font-weight:900;color:#0a0a0a;line-height:1.05;letter-spacing:-1px;">Doppelt&nbsp;gesichert.</h1>
    <p style="margin:0 0 28px;font-size:15px;color:#555;line-height:1.65;">
      Hey ${esc(displayName)} — die Zwei-Faktor-Authentifizierung für dein Konto ist jetzt aktiv.
    </p>
    ${divider}
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:24px;">
      <tr><td style="background-color:#f7f7f7;border:1px solid #ebebeb;border-radius:2px;padding:20px;">
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:14px;">
          <tr>
            <td width="24" valign="top" style="font-size:14px;line-height:1.4;padding-top:2px;color:#0a0a0a;font-weight:700;">✓</td>
            <td style="font-size:14px;color:#333;line-height:1.6;font-weight:600;">Zweite Sicherheitsstufe aktiv</td>
          </tr>
        </table>
        <table width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td width="24" valign="top" style="font-size:14px;line-height:1.4;padding-top:2px;color:#aaa;">→</td>
            <td style="font-size:13px;color:#777;line-height:1.6;">Bei der nächsten Anmeldung bekommst du einen Code aufs Handy.</td>
          </tr>
        </table>
      </td></tr>
    </table>
    ${noteBox('⚠️ &nbsp;Nicht du? Sofort Bescheid geben: <a href="mailto:hello@eatthisdot.com" style="color:#FF3B00;text-decoration:none;">hello@eatthisdot.com</a> — und Passwort ändern.', true)}
  `);
}

function getNewsletterConfirmTemplate() {
  return shell(`
    <h1 style="margin:0 0 12px;font-size:32px;font-weight:900;color:#0a0a0a;line-height:1.05;letter-spacing:-1px;">Du bist dabei.</h1>
    <p style="margin:0 0 28px;font-size:15px;color:#555;line-height:1.65;">
      Wir schicken dir die besten Spots, neue Karten und Updates — direkt in dein Postfach. Kein Spam, versprochen.
    </p>
    ${divider}
    ${ctaButton('Zur Website', 'https://www.eatthisdot.com')}
    ${dividerTop}
    ${noteBox('Du willst keine Mails mehr? Antworte einfach auf diese E-Mail mit "Abmelden".')}
  `);
}

module.exports = {
  getVerificationTemplate,
  getPasswordResetTemplate,
  getEmailChangeTemplate,
  getMfaTemplate,
  getNewsletterConfirmTemplate,
};
