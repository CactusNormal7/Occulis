import { type Locale, messagesFor } from "@occulis/i18n";
import { BACKGROUND, CAMP, FONT, INK, INK_ALPHA, hexColor } from "@occulis/ui/tokens";

/**
 * L'envoi des messages transactionnels (vérification d'adresse, réinitialisation,
 * changement d'adresse, suppression, avis de sécurité), par Resend.
 *
 * Resend plutôt qu'un SMTP : un Worker n'a pas de socket sortant, seulement `fetch`.
 * MailChannels, qui rendait ce service gratuitement aux Workers, a fermé son offre en
 * 2024 — d'où un fournisseur explicite et une clé à provisionner.
 *
 * Sans clé configurée, l'envoi est **journalisé au lieu d'être émis**. C'est ce qui
 * permet aux tests et à `wrangler dev` de traverser les parcours de vérification et de
 * réinitialisation sans compte Resend ni message réellement expédié.
 */
export interface Letter {
  readonly to: string;
  readonly subject: string;
  /** La version texte, toujours envoyée : certains clients n'affichent qu'elle. */
  readonly text: string;
  readonly html: string;
}

export async function sendLetter(env: Env, letter: Letter): Promise<void> {
  if (env.RESEND_API_KEY === undefined || env.RESEND_API_KEY.length === 0) {
    console.log(`[mail] ${letter.to} — ${letter.subject}\n${letter.text}`);
    return;
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: env.MAIL_FROM ?? DEFAULT_SENDER,
      to: [letter.to],
      subject: letter.subject,
      text: letter.text,
      html: letter.html,
      ...(env.MAIL_REPLY_TO === undefined || env.MAIL_REPLY_TO.length === 0 ? {} : { reply_to: env.MAIL_REPLY_TO }),
    }),
  });

  // Un échec d'envoi ne doit pas faire échouer l'inscription : le compte existe, et un
  // second message peut toujours être demandé. On le signale sans le propager.
  // Le corps est journalisé avec le statut : c'est lui qui dit *pourquoi* Resend refuse
  // (domaine non vérifié, expéditeur non autorisé, clé révoquée), et le statut seul
  // — presque toujours 403 — ne permet pas de les distinguer.
  if (!response.ok) {
    const reason = await response.text().catch(() => "");
    console.error(`[mail] failed ${response.status} for ${letter.to}: ${reason}`);
  }
}

const DEFAULT_SENDER = "Occulis <no-reply@0kl.fr>";

export function verificationLetter(locale: Locale, to: string, url: string): Letter {
  const m = messagesFor(locale).mail;
  return compose(locale, to, { ...m.verification, action: { label: m.verification.action, url } });
}

export function resetLetter(locale: Locale, to: string, url: string): Letter {
  const m = messagesFor(locale).mail;
  return compose(locale, to, { ...m.reset, action: { label: m.reset.action, url } });
}

/** Envoyé à l'**ancienne** adresse : c'est elle qui doit consentir au changement. */
export function changeEmailLetter(locale: Locale, to: string, newEmail: string, url: string): Letter {
  const m = messagesFor(locale).mail.changeEmail;
  return compose(locale, to, {
    subject: m.subject,
    preheader: m.preheader(newEmail),
    title: m.title,
    paragraphs: m.paragraphs(newEmail),
    action: { label: m.action, url },
    footnote: m.footnote,
  });
}

export function deleteAccountLetter(locale: Locale, to: string, url: string): Letter {
  const m = messagesFor(locale).mail;
  return compose(locale, to, { ...m.deleteAccount, action: { label: m.deleteAccount.action, url } });
}

export function passwordChangedLetter(locale: Locale, to: string, securityUrl: string): Letter {
  const m = messagesFor(locale).mail;
  return compose(locale, to, { ...m.passwordChanged, action: { label: m.passwordChanged.action, url: securityUrl } });
}

export function providerLinkedLetter(locale: Locale, to: string, provider: string, securityUrl: string): Letter {
  const m = messagesFor(locale).mail.providerLinked;
  return compose(locale, to, {
    subject: m.subject(provider),
    preheader: m.preheader,
    title: m.title(provider),
    paragraphs: m.paragraphs(provider),
    action: { label: m.action, url: securityUrl },
    footnote: m.footnote,
  });
}

interface Content {
  readonly subject: string;
  /** La ligne d'aperçu que les clients affichent sous l'objet, avant ouverture. */
  readonly preheader: string;
  readonly title: string;
  readonly paragraphs: readonly string[];
  readonly action: { readonly label: string; readonly url: string };
  readonly footnote: string;
}

function compose(locale: Locale, to: string, content: Content): Letter {
  return { to, subject: content.subject, text: plainText(locale, content), html: html(locale, content) };
}

function plainText(locale: Locale, content: Content): string {
  return [
    content.title,
    "",
    ...content.paragraphs.flatMap((paragraph) => [paragraph, ""]),
    `${content.action.label}${locale === "fr" ? " :" : ":"}`,
    content.action.url,
    "",
    content.footnote,
    "",
    "— Occulis",
  ].join("\n");
}

// Les couleurs sont précomposées sur le fond (`hexColor`) : un courrier ne peut compter
// ni sur la transparence ni sur les propriétés CSS.
const COLORS = {
  background: hexColor(BACKGROUND),
  ink: hexColor(INK),
  soft: hexColor(INK, INK_ALPHA.soft),
  dim: hexColor(INK, INK_ALPHA.dim),
  line: hexColor(INK, INK_ALPHA.faint),
  accent: hexColor(CAMP.A),
} as const;

/**
 * Le gabarit HTML. Tableaux et styles en ligne, parce que c'est ce que les clients de
 * messagerie savent rendre — pas de feuille de style, pas de flexbox, pas d'image (le
 * logo est un mot-symbole en texte, fidèle à la DA filaire et jamais bloqué).
 *
 * **Tout ce qui vient de l'extérieur est échappé** : une adresse électronique peut
 * contenir des caractères HTML, et un lien peut porter des `&`.
 */
function html(locale: Locale, content: Content): string {
  const m = messagesFor(locale).mail;
  const c = COLORS;
  const font = escapeHtml(FONT.mono);
  const paragraphs = content.paragraphs
    .map(
      (paragraph) =>
        `<p style="margin:0 0 16px;font-size:14px;line-height:1.6;color:${c.soft};">${escapeHtml(paragraph)}</p>`,
    )
    .join("");
  const url = escapeHtml(content.action.url);
  return `<!doctype html>
<html lang="${locale}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="dark">
<meta name="supported-color-schemes" content="dark">
<title>${escapeHtml(content.subject)}</title>
</head>
<body style="margin:0;padding:0;background:${c.background};">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(content.preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${c.background};">
<tr><td align="center" style="padding:40px 16px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;font-family:${font};">
<tr><td style="padding:0 0 28px;font-size:13px;letter-spacing:5px;color:${c.ink};">OCCULIS</td></tr>
<tr><td style="border:1px solid ${c.line};padding:32px 28px;">
<h1 style="margin:0 0 20px;font-size:20px;font-weight:normal;letter-spacing:0.04em;color:${c.ink};">${escapeHtml(content.title)}</h1>
${paragraphs}
<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 24px;">
<tr><td style="border:1px solid ${c.accent};">
<a href="${url}" style="display:inline-block;padding:12px 22px;font-family:${font};font-size:12px;letter-spacing:0.16em;text-transform:uppercase;color:${c.accent};text-decoration:none;">${escapeHtml(content.action.label)}</a>
</td></tr>
</table>
<p style="margin:0 0 6px;font-size:12px;color:${c.dim};">${escapeHtml(m.copyLink)}</p>
<p style="margin:0;font-size:12px;line-height:1.5;word-break:break-all;"><a href="${url}" style="color:${c.soft};">${url}</a></p>
</td></tr>
<tr><td style="padding:24px 4px 0;font-size:12px;line-height:1.6;color:${c.dim};">${escapeHtml(content.footnote)}</td></tr>
<tr><td style="padding:16px 4px 0;font-size:11px;color:${c.dim};">${escapeHtml(m.automatic)}</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;
}

const ESCAPES: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };

export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ESCAPES[character] ?? character);
}
