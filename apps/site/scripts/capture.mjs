/**
 * Produit les images du site depuis le vrai rendu : les trois visuels du plateau
 * (AVIF et WebP, 720 et 1440 px), l'image de partage (`og.png`) et les icônes.
 *
 *   pnpm --filter @occulis/site capture
 *
 * Lance `astro dev`, photographie les pages `/capture/<image>/` (qui n'existent qu'en
 * développement) avec le Chrome installé sur la machine — playwright-core ne télécharge
 * aucun navigateur —, puis arrête le serveur. Les images sont versionnées : le build ne
 * dépend ni de Chrome ni de ce script. À relancer quand le rendu, la carte ou le scénario
 * du hero (`src/island/script.ts`) change.
 */
import { spawn } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright-core";
import sharp from "sharp";
import { DEFAULT_THEME, THEMES, hexColor } from "../../../packages/ui/src/tokens.ts";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const IMAGES = new URL("../public/images/", import.meta.url);
const PUBLIC = new URL("../public/", import.meta.url);
// Astro ne lance qu'un serveur de développement par projet : on réutilise celui qui
// tourne déjà (`pnpm --filter @occulis/site dev`), sinon on en démarre un.
const PORT = 4321;
const ORIGIN = `http://localhost:${PORT}`;
const BOARD_IMAGES = ["fog", "summit", "ghosts"];

async function running() {
  try {
    return (await fetch(`${ORIGIN}/capture/summit/`)).ok;
  } catch {
    return false;
  }
}

async function startServer() {
  if (await running()) return undefined;
  const server = spawn("pnpm", ["exec", "astro", "dev", "--port", String(PORT)], {
    cwd: ROOT,
    stdio: "ignore",
  });
  for (let attempt = 0; attempt < 60; attempt += 1) {
    await new Promise((resolve) => setTimeout(resolve, 500));
    if (await running()) return server;
  }
  server.kill();
  throw new Error("astro dev n'a pas répondu.");
}

async function boardShot(page, name) {
  await page.goto(`${ORIGIN}/capture/${name}/`);
  await page.waitForSelector(".board.is-live");
  // Le canevas apparaît en fondu (`--occ-slow`) : on attend qu'il soit posé.
  await page.waitForTimeout(700);
  return page.locator(".board").screenshot({ omitBackground: false });
}

/** Le pixel art ne se lisse pas : réduction au plus proche voisin. */
async function writeVariants(png, name) {
  for (const width of [1440, 720]) {
    const resized = sharp(png).resize({ width, kernel: "nearest" });
    await writeFile(
      new URL(`board-${name}-${width}.avif`, IMAGES),
      await resized.clone().avif({ quality: 62, effort: 7 }).toBuffer(),
    );
    await writeFile(
      new URL(`board-${name}-${width}.webp`, IMAGES),
      await resized.clone().webp({ quality: 82 }).toBuffer(),
    );
  }
}

/** L'œil des pièces (`@occulis/board/paint`) : un losange d'os percé d'une pupille de vide. */
function faviconSvg() {
  const { background, ink } = THEMES[DEFAULT_THEME];
  const bg = hexColor(background);
  const bone = hexColor(ink);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" shape-rendering="crispEdges">
  <rect width="32" height="32" fill="${bg}"/>
  <path d="M16 4 L28 16 L16 28 L4 16 Z" fill="${bone}"/>
  <path d="M16 12 L20 16 L16 20 L12 16 Z" fill="${bg}"/>
</svg>
`;
}

const server = await startServer();
try {
  await mkdir(IMAGES, { recursive: true });
  const browser = await chromium.launch({ channel: "chrome" });
  try {
    const board = await browser.newPage({
      viewport: { width: 1200, height: 800 },
      deviceScaleFactor: 2,
    });
    for (const name of BOARD_IMAGES) await writeVariants(await boardShot(board, name), name);

    const og = await browser.newPage({
      viewport: { width: 1200, height: 630 },
      deviceScaleFactor: 1,
    });
    await og.goto(`${ORIGIN}/capture/og/`);
    await og.waitForSelector(".board.is-live");
    await og.evaluate(() => document.fonts.ready);
    await og.waitForTimeout(700);
    const ogPng = await og.screenshot({ clip: { x: 0, y: 0, width: 1200, height: 630 } });
    await writeFile(
      new URL("og.png", PUBLIC),
      await sharp(ogPng).png({ palette: true, quality: 90 }).toBuffer(),
    );
  } finally {
    await browser.close();
  }

  const svg = faviconSvg();
  await writeFile(new URL("favicon.svg", PUBLIC), svg);
  await writeFile(
    new URL("apple-touch-icon.png", PUBLIC),
    await sharp(Buffer.from(svg), { density: 540 }).resize(180, 180).png().toBuffer(),
  );
  // Un PNG de 32 px dans un conteneur ICO : ce que lisent les navigateurs qui ignorent le SVG.
  const png32 = await sharp(Buffer.from(svg), { density: 96 }).resize(32, 32).png().toBuffer();
  const header = Buffer.alloc(22);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(1, 4);
  header.writeUInt8(32, 6);
  header.writeUInt8(32, 7);
  header.writeUInt16LE(1, 10);
  header.writeUInt16LE(32, 12);
  header.writeUInt32LE(png32.length, 14);
  header.writeUInt32LE(22, 18);
  await writeFile(new URL("favicon.ico", PUBLIC), Buffer.concat([header, png32]));
  console.log("Images écrites dans public/ et public/images/.");
} finally {
  server?.kill();
}
