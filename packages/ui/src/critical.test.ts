import { describe, expect, it } from "vitest";
import { PIXEL_FONT_URL, THEME_STORAGE_KEY, criticalHead, withCriticalHead } from "./critical.js";
import { BACKGROUND, THEMES, THEME_NAMES, cssColor } from "./tokens.js";

describe("criticalHead", () => {
  const head = criticalHead();

  it("pose le fond et le thème sombre sans attendre la feuille", () => {
    expect(head).toContain('<meta name="color-scheme" content="dark" />');
    expect(head).toContain(`background:${cssColor(BACKGROUND)}`);
    expect(head).not.toContain("var(");
  });

  it("déclare et précharge la police pixel avant toute feuille", () => {
    expect(head).toContain(`<link rel="preload" href="${PIXEL_FONT_URL}" as="font"`);
    expect(head).toContain('font-family:"Tiny5"');
    expect(head).toContain("font-display:block");
  });

  it("pose le thème choisi et son fond avant la première image", () => {
    expect(head).toContain(`localStorage.getItem("${THEME_STORAGE_KEY}")`);
    for (const theme of THEME_NAMES) {
      expect(head).toContain(`html[data-theme="${theme}"]`);
      expect(head).toContain(cssColor(THEMES[theme].background));
    }
  });

  it("enchaîne les pages par un fondu, sauf mouvement réduit", () => {
    expect(head).toContain("@view-transition{navigation:auto}");
    expect(head).toContain("prefers-reduced-motion:reduce");
  });

  it("ne précharge ni l'API ni les parties", () => {
    const json = head.match(/<script type="speculationrules">(.*)<\/script>/)?.[1];
    const rules = JSON.parse(json ?? "null") as {
      prefetch: { where: unknown; eagerness: string }[];
    };
    expect(rules.prefetch[0]?.eagerness).toBe("moderate");
    expect(JSON.stringify(rules.prefetch[0]?.where)).toContain(
      '"not":{"href_matches":["/api/*","/match/*"',
    );
    expect(head).not.toContain("prerender");
  });

  it("se place après l'encodage, avant la feuille et le script", () => {
    const page = withCriticalHead(
      '<!doctype html><html><head>\n<meta charset="UTF-8" />\n<link rel="stylesheet" href="/a.css" /></head></html>',
    );
    const charset = page.indexOf("<meta charset");
    const block = page.indexOf('name="color-scheme"');
    expect(charset).toBeGreaterThanOrEqual(0);
    expect(block).toBeGreaterThan(charset);
    expect(block).toBeLessThan(page.indexOf("<link"));
    expect(withCriticalHead("<html><head></head></html>")).toContain(
      '<head>\n<meta name="color-scheme"',
    );
    expect(() => withCriticalHead("<p>no head</p>")).toThrow();
  });
});
