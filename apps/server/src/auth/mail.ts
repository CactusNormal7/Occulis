/**
 * L'envoi des messages transactionnels (vérification d'adresse, réinitialisation de
 * mot de passe), par Resend.
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
  readonly body: string;
}

export async function sendLetter(env: Env, letter: Letter): Promise<void> {
  if (env.RESEND_API_KEY === undefined || env.RESEND_API_KEY.length === 0) {
    console.log(`[mail] ${letter.to} — ${letter.subject}\n${letter.body}`);
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
      text: letter.body,
    }),
  });

  // Un échec d'envoi ne doit pas faire échouer l'inscription : le compte existe, et un
  // second message peut toujours être demandé. On le signale sans le propager.
  if (!response.ok) {
    console.error(`[mail] échec ${response.status} pour ${letter.to}`);
  }
}

const DEFAULT_SENDER = "Occulis <no-reply@0kl.fr>";

export function verificationLetter(to: string, url: string): Letter {
  return {
    to,
    subject: "Confirmez votre adresse — Occulis",
    body: `Bienvenue sur Occulis.\n\nConfirmez votre adresse en ouvrant ce lien :\n${url}\n\nSi vous n'êtes pas à l'origine de cette inscription, ignorez ce message.`,
  };
}

export function resetLetter(to: string, url: string): Letter {
  return {
    to,
    subject: "Réinitialisation de votre mot de passe — Occulis",
    body: `Une réinitialisation a été demandée pour ce compte.\n\nChoisissez un nouveau mot de passe ici :\n${url}\n\nCe lien expire dans une heure. Si vous n'êtes pas à l'origine de cette demande, ignorez ce message : votre mot de passe reste inchangé.`,
  };
}
