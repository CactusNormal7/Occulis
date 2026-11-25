// Met à jour les fiches des composants (components/<Nom>/README.md) lues sur l'artifact :
// le fichier source, la note de source et les props, repris du .vue et de l'index.d.ts écrit
// par build-dts.mjs. Le résumé en anglais et le reste de la fiche sont gardés tels quels.
// Usage : node .design-sync/scripts/build-readmes.mjs <copie lue> <dossier>
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const [, , live, out] = process.argv;
const REPO = fileURLToPath(new URL("../../", import.meta.url));
const SRC = path.join(REPO, "packages/ui/src/components");
const dts = fs.readFileSync(path.join(out, "project/components/index.d.ts"), "utf8");
const sections = Object.fromEntries(dts.split(/^\/\/ ---- /m).slice(1).map((s) => [s.slice(0, s.indexOf(".")), s.slice(s.indexOf("\n") + 1).trim()]));
for (const name of fs.readdirSync(path.join(live, "project/components"))) {
  const file = path.join(live, "project/components", name, "README.md");
  if (!fs.existsSync(file)) continue;
  let md = fs.readFileSync(file, "utf8");
  const sec = sections[name];
  if (!sec) { console.error("no section", name); continue; }
  md = md.replace(/\*\*Source:\*\* `[^`]+`/, `**Source:** \`packages/ui/src/components/${name}.vue\``);
  const script = /<script setup[^>]*>([\s\S]*?)<\/script>/.exec(fs.readFileSync(path.join(SRC, name + ".vue"), "utf8"))[1];
  const doc = /^\s*\/\*\*([\s\S]*?)\*\//.exec(script)?.[1];
  if (doc) {
    const quote = doc.split("\n").map((l) => l.replace(/^\s*\* ?/, "").trim()).filter((l, i, a) => l || (i > 0 && i < a.length - 1)).map((l) => "> " + l).join("\n").replace(/^(> \n)+|(\n> )+$/g, "");
    md = md.replace(/## Source note\n\n(?:>.*\n)+/, `## Source note\n\n${quote}\n`);
  }
  const iface = /export interface \w+Props(?:<[^>]+>)? \{[\s\S]*?\n\}/.exec(sec)[0];
  const slots = /\/\*\* Emplacements : (.*?)\. \*\//.exec(sec)?.[1];
  const hasProps = iface.split("\n").length > 2;
  const body = hasProps
    ? "Vue props from the source (comments in French, as written); in a template, write them in kebab-case and bind `modelValue` with `v-model`:\n\n```ts\n" + iface + "\n```\n"
    : "No props.\n";
  md = md.replace(/## Props\n[\s\S]*$/, `## Props\n\n${body}${slots ? `\nSlots: ${slots}.\n` : ""}`);
  fs.mkdirSync(path.join(out, "project/components", name), { recursive: true });
  fs.writeFileSync(path.join(out, "project/components", name, "README.md"), md);
}
