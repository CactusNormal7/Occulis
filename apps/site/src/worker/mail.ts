import { BACKGROUND, INK, INK_ALPHA, hexColor } from "@occulis/ui/tokens";
import text from "../content/en/mail.json";
import type { ConfirmationMail } from "./beta";

export interface MailEnv {
  readonly RESEND_API_KEY?: string;
  readonly MAIL_FROM: string;
  /** `"on"` : les messages sont journalisés au lieu d'être envoyés (local). */
  readonly MAIL_TO_CONSOLE?: string;
}

const escape = (value: string): string =>
  value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/**
 * Le message de confirmation. Couleurs précomposées en `#rrggbb` (`hexColor`) : une bonne
 * partie des clients de messagerie ignore la transparence. Aucune image, aucune police.
 */
export function confirmationMessage(mail: ConfirmationMail): {
  subject: string;
  html: string;
  text: string;
} {
  const bg = hexColor(BACKGROUND);
  const ink = hexColor(INK);
  const soft = hexColor(INK, INK_ALPHA.soft);
  const confirm = escape(mail.confirmUrl);
  const unsubscribe = escape(mail.unsubscribeUrl);
  const html = `<!doctype html>
<html lang="en"><body style="margin:0;padding:32px 16px;background:${bg};color:${ink};font-family:system-ui,sans-serif;font-size:16px;line-height:1.6">
<div style="max-width:520px;margin:0 auto">
<p style="font-family:ui-monospace,monospace;letter-spacing:0.5em;margin:0 0 32px">OCCULIS</p>
<p>${escape(text.greeting)}</p>
<p>${escape(text.body)}</p>
<p style="margin:32px 0"><a href="${confirm}" style="display:inline-block;padding:12px 24px;background:${ink};color:${bg};text-decoration:none">${escape(text.button)}</a></p>
<p style="color:${soft}">${escape(text.expiry)}</p>
<p style="color:${soft}">${escape(text.ignore)}</p>
<p style="color:${soft};margin-top:32px"><a href="${unsubscribe}" style="color:${soft}">${escape(text.unsubscribe)}</a></p>
</div></body></html>`;
  const plain = [
    text.greeting,
    "",
    text.body,
    mail.confirmUrl,
    "",
    text.expiry,
    text.ignore,
    "",
    `${text.unsubscribe}: ${mail.unsubscribeUrl}`,
  ].join("\n");
  return { subject: text.subject, html, text: plain };
}

export async function sendConfirmation(env: MailEnv, mail: ConfirmationMail): Promise<void> {
  const message = confirmationMessage(mail);
  if (env.MAIL_TO_CONSOLE === "on") {
    console.log(`[mail] à ${mail.to} — ${message.subject}\n${message.text}`);
    return;
  }
  // Hors local, un message qui ne part pas est un échec visible, jamais un succès muet.
  if (env.RESEND_API_KEY === undefined || env.RESEND_API_KEY === "") {
    throw new Error("RESEND_API_KEY manquant : aucun message ne peut partir.");
  }
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: env.MAIL_FROM,
      to: [mail.to],
      subject: message.subject,
      html: message.html,
      text: message.text,
      // Désinscription en un clic depuis le client de messagerie (RFC 8058).
      headers: {
        "List-Unsubscribe": `<${mail.unsubscribeUrl}>`,
        "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
      },
    }),
  });
  if (!response.ok) throw new Error(`Resend a refusé l'envoi : ${response.status}`);
}
