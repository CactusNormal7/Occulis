import { BACKGROUND, INK, THEMES, THEME_NAMES, cssColor, hexColor } from "./tokens.js";

/**
 * Le bloc que chaque page HTML porte en tête de `<head>`, avant toute feuille et tout
 * script : c'est lui qui décide de la première image peinte.
 *
 * - `color-scheme: dark` et le fond posés en ligne : sans eux, le navigateur peint en
 *   blanc le temps de charger la feuille, et entre deux pages. Une variable `--occ-bg`
 *   n'y suffit pas — elle n'existe qu'une fois la feuille arrivée.
 * - `@view-transition` : un fondu entre deux pages du site plutôt qu'une coupure.
 * - La police pixel (`FONT.pixel`) : déclarée et préchargée ici, avant toute feuille. Sa
 *   requête part avec le HTML au lieu d'attendre que le CSS la découvre, et
 *   `font-display: block` retient le texte jusqu'à elle : un écran ne paraît jamais
 *   dans la police de secours pour basculer ensuite.
 * - Le thème choisi (`THEMES`) : un script en ligne le relit du stockage et le pose sur
 *   `<html data-theme>` avant la première image, et le fond de chaque thème est écrit en
 *   ligne. Sans cela, une page s'ouvrirait dans le thème par défaut pour basculer ensuite.
 * - Les règles de spéculation : un lien interne survolé est préchargé. Le profil et le
 *   back-office sont même **pré-rendus** : leur écran dépend de données, et le fondu entre
 *   pages partirait sinon vers un écran encore vide (`apps/web/src/load/page.tsx`). Leur
 *   canal de présence attend l'activation de la page (`net/channel.ts`) : pré-rendre ne
 *   doit pas annoncer le joueur sur une page qu'il n'a pas ouverte. Le jeu, lui, reste
 *   préchargé seulement — sa page ouvre bien plus qu'un canal.
 *
 * - L'icône d'onglet (`favicon()`) : un SVG en ligne, dessiné ici pour que ses couleurs
 *   viennent de `tokens.ts` comme le reste, et qu'aucune page ne l'oublie.
 *
 * Injecté au build par `apps/web/vite.config.ts` : le HTML ne contient aucune couleur
 * écrite à la main, et ce fichier n'en contient aucune qui ne vienne de `tokens.ts`.
 */
/** La clé de stockage du thème choisi, partagée par toutes les pages du site. */
export const THEME_STORAGE_KEY = "occulis.theme";

/** L'adresse fixe de la police pixel, servie depuis `apps/web/public/fonts/`. */
export const PIXEL_FONT_URL = "/fonts/tiny5-latin.woff2";

/**
 * L'œil d'Occulis, en pixels sur une grille de 16 : chaque `#` est un pixel d'os sur le
 * vide. Lu ligne à ligne et fusionné en segments horizontaux pour garder le SVG court.
 */
const FAVICON_PIXELS = [
  "................",
  "................",
  "................",
  "................",
  ".....######.....",
  "...##......##...",
  "..#....##....#..",
  ".#....####....#.",
  ".#....####....#.",
  "..#....##....#..",
  "...##......##...",
  ".....######.....",
  "................",
  "................",
  "................",
  "................",
];

/** L'icône d'onglet, en `data:` SVG : aucune requête de plus, aucun fichier à servir. */
export function favicon(): string {
  const runs: string[] = [];
  FAVICON_PIXELS.forEach((row, y) => {
    for (const match of row.matchAll(/#+/g)) {
      runs.push(`M${match.index} ${y}h${match[0].length}v1h-${match[0].length}z`);
    }
  });
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" shape-rendering="crispEdges">` +
    `<rect width="16" height="16" rx="3" fill="${hexColor(BACKGROUND)}"/>` +
    `<path fill="${hexColor(INK)}" d="${runs.join("")}"/></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

export function criticalHead(): string {
  const background = cssColor(BACKGROUND);
  const style = [
    `@font-face{font-family:"Tiny5";src:url(${PIXEL_FONT_URL}) format("woff2");font-display:block}`,
    `html,body{background:${background};color-scheme:dark}`,
    ...THEME_NAMES.map(
      (theme) =>
        `html[data-theme="${theme}"],html[data-theme="${theme}"] body{background:${cssColor(THEMES[theme].background)}}`,
    ),
    "@view-transition{navigation:auto}",
    "@media (prefers-reduced-motion:reduce){@view-transition{navigation:none}}",
  ].join("");
  const speculation = {
    prerender: [{ where: { href_matches: ["/profile/*", "/admin/*"] }, eagerness: "moderate" }],
    prefetch: [
      {
        where: {
          and: [
            { href_matches: "/*" },
            { not: { href_matches: ["/api/*", "/match/*", "/mockups/*"] } },
          ],
        },
        eagerness: "moderate",
      },
    ],
  };
  return [
    '<meta name="color-scheme" content="dark" />',
    `<meta name="theme-color" content="${hexColor(BACKGROUND)}" />`,
    `<link rel="icon" type="image/svg+xml" href="${favicon()}" />`,
    `<link rel="preload" href="${PIXEL_FONT_URL}" as="font" type="font/woff2" crossorigin />`,
    `<script>try{var t=localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEY)});if(${JSON.stringify(THEME_NAMES)}.indexOf(t)>=0)document.documentElement.dataset.theme=t}catch(e){}</script>`,
    `<style>${style}</style>`,
    `<script type="speculationrules">${JSON.stringify(speculation)}</script>`,
  ].join("\n");
}

/**
 * Insère le bloc critique juste après la déclaration d'encodage, qui doit rester dans
 * les premiers octets du document, et donc avant toute feuille et tout script.
 */
export function withCriticalHead(html: string): string {
  const anchor = /<meta charset="[^"]*"\s*\/?>/i.exec(html) ?? /<head>/i.exec(html);
  if (anchor === null) throw new Error("page without <head>: the critical block has nowhere to go");
  const at = anchor.index + anchor[0].length;
  return `${html.slice(0, at)}\n${criticalHead()}${html.slice(at)}`;
}
