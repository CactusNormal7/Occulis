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
    console.error(`[mail] échec ${response.status} pour ${letter.to} : ${reason}`);
  }
}

const DEFAULT_SENDER = "Occulis <no-reply@0kl.fr>";

export function verificationLetter(to: string, url: string): Letter {
  return compose(to, {
    subject: "Confirmez votre adresse — Occulis",
    preheader: "Un clic pour ouvrir le jeu en ligne.",
    title: "Bienvenue sur Occulis",
    paragraphs: [
      "Votre compte est créé. Il reste à confirmer cette adresse : c'est elle qui ouvre la file d'attente et les parties en ligne.",
    ],
    action: { label: "Confirmer mon adresse", url },
    footnote: "Si vous n'êtes pas à l'origine de cette inscription, ignorez ce message : aucun compte ne sera activé.",
  });
}

export function resetLetter(to: string, url: string): Letter {
  return compose(to, {
    subject: "Réinitialisation de votre mot de passe — Occulis",
    preheader: "Ce lien expire dans une heure.",
    title: "Nouveau mot de passe",
    paragraphs: [
      "Une réinitialisation a été demandée pour ce compte. Choisissez un nouveau mot de passe depuis le lien ci-dessous ; il expire dans une heure.",
      "Toutes vos sessions ouvertes seront fermées une fois le mot de passe changé.",
    ],
    action: { label: "Choisir un mot de passe", url },
    footnote: "Si vous n'êtes pas à l'origine de cette demande, ignorez ce message : votre mot de passe reste inchangé.",
  });
}

/** Envoyé à l'**ancienne** adresse : c'est elle qui doit consentir au changement. */
export function changeEmailLetter(to: string, newEmail: string, url: string): Letter {
  return compose(to, {
    subject: "Changement d'adresse demandé — Occulis",
    preheader: `Remplacer cette adresse par ${newEmail} ?`,
    title: "Changer d'adresse",
    paragraphs: [
      `Une demande a été faite pour remplacer l'adresse de votre compte par ${newEmail}.`,
      "Si vous confirmez, un second message partira vers la nouvelle adresse pour la vérifier. Rien ne change tant que les deux n'ont pas été confirmées.",
    ],
    action: { label: "Confirmer le changement", url },
    footnote:
      "Si vous n'avez rien demandé, ignorez ce message et changez votre mot de passe : quelqu'un a pu accéder à votre session.",
  });
}

export function deleteAccountLetter(to: string, url: string): Letter {
  return compose(to, {
    subject: "Suppression de votre compte — Occulis",
    preheader: "Confirmez pour supprimer définitivement votre compte.",
    title: "Supprimer le compte",
    paragraphs: [
      "Vous avez demandé la suppression de votre compte. Une fois confirmée, elle est définitive : votre adresse, vos sessions et vos connexions sont effacées, et votre pseudo est remplacé dans l'historique des parties.",
      "Le lien n'agit que dans le navigateur où vous êtes connecté, et expire dans 24 heures.",
    ],
    action: { label: "Supprimer définitivement", url },
    footnote: "Si vous n'êtes pas à l'origine de cette demande, ignorez ce message et changez votre mot de passe.",
  });
}

export function passwordChangedLetter(to: string, securityUrl: string): Letter {
  return compose(to, {
    subject: "Votre mot de passe a changé — Occulis",
    preheader: "Un avis de sécurité, rien à faire si c'était vous.",
    title: "Mot de passe changé",
    paragraphs: [
      "Le mot de passe de votre compte vient d'être changé, et les autres sessions ont été fermées.",
      "Si c'était vous, il n'y a rien à faire.",
    ],
    action: { label: "Voir mes sessions", url: securityUrl },
    footnote:
      "Si ce n'était pas vous, demandez immédiatement une réinitialisation depuis l'écran de connexion : elle fermera toutes les sessions.",
  });
}

export function providerLinkedLetter(to: string, provider: string, securityUrl: string): Letter {
  return compose(to, {
    subject: `Connexion ${provider} ajoutée — Occulis`,
    preheader: "Un avis de sécurité, rien à faire si c'était vous.",
    title: `${provider} est lié à votre compte`,
    paragraphs: [`Vous pouvez désormais vous connecter à Occulis avec ${provider}.`, "Si c'était vous, il n'y a rien à faire."],
    action: { label: "Gérer mes connexions", url: securityUrl },
    footnote: "Si ce n'était pas vous, retirez cette connexion depuis votre profil et changez votre mot de passe.",
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

function compose(to: string, content: Content): Letter {
  return { to, subject: content.subject, text: plainText(content), html: html(content) };
}

function plainText(content: Content): string {
  return [
    content.title,
    "",
    ...content.paragraphs.flatMap((paragraph) => [paragraph, ""]),
    `${content.action.label} :`,
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
function html(content: Content): string {
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
<html lang="fr">
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
<p style="margin:0 0 6px;font-size:12px;color:${c.dim};">Ou copiez ce lien dans votre navigateur :</p>
<p style="margin:0;font-size:12px;line-height:1.5;word-break:break-all;"><a href="${url}" style="color:${c.soft};">${url}</a></p>
</td></tr>
<tr><td style="padding:24px 4px 0;font-size:12px;line-height:1.6;color:${c.dim};">${escapeHtml(content.footnote)}</td></tr>
<tr><td style="padding:16px 4px 0;font-size:11px;color:${c.dim};">Message automatique envoyé par Occulis — inutile d'y répondre.</td></tr>
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
