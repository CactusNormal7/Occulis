// Écrit le components/index.d.ts de l'artifact (de la documentation, jamais vérifiée) depuis
// les sources Vue de packages/ui. Construire le paquet d'abord : les types partagés viennent
// de dist/. Les composants de `dtsPropsFor` (config.json) prennent ce contrat écrit à la main.
// Usage : node .design-sync/scripts/build-dts.mjs <fichier>
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const REPO = fileURLToPath(new URL("../../", import.meta.url));
const SRC = path.join(REPO, "packages/ui/src");
const config = JSON.parse(fs.readFileSync(path.join(REPO, ".design-sync/config.json"), "utf8"));
const order = [...fs.readFileSync(path.join(SRC, "index.ts"), "utf8").matchAll(/default as (\w+) \} from "\.\/components\/(\w+)\.vue"/g)].map((m) => m[1]);

function balanced(text, start, open, close) {
  let depth = 0;
  for (let i = start; i < text.length; i++) {
    if (text[i] === open) depth++;
    else if (text[i] === close && !(close === ">" && text[i - 1] === "=") && --depth === 0) return text.slice(start, i + 1);
  }
  throw new Error("unbalanced");
}
const dedent = (s) => {
  const lines = s.split("\n").filter((l, i, a) => l.trim() || (i > 0 && i < a.length - 1));
  const ind = Math.min(...lines.filter((l) => l.trim()).map((l) => l.match(/^ */)[0].length));
  const text = lines.map((l) => "  " + l.slice(ind)).join("\n");
  return /[;}\/,]$/.test(text.trim()) ? text : text + ";";
};

const out = [
  "// Occulis UI — types des composants Vue de packages/ui/src (documentation, non vérifiée).",
  "// Chaque composant s'utilise dans un gabarit : props en kebab-case, `v-model`, emplacements.",
  'import type { DefineComponent } from "vue";',
  "",
];
for (const file of ["icons.d.ts", "types.d.ts", "composables/toast.d.ts", "composables/locale.d.ts"]) {
  let t = fs.readFileSync(path.join(SRC, "..", "dist", file), "utf8").replace(/^\/\/# sourceMappingURL.*$/m, "").replace(/^import .*$/gm, "");
  out.push(`// ---- ${file.replace(".d.ts", ".ts")}`, t.trim(), "");
}
for (const name of order) {
  const src = fs.readFileSync(path.join(SRC, "components", name + ".vue"), "utf8");
  const script = /<script setup[^>]*>([\s\S]*?)<\/script>/.exec(src)?.[1] ?? "";
  const template = /<template>([\s\S]*)<\/template>/.exec(src)?.[1] ?? "";
  const doc = /^\s*(\/\*\*[\s\S]*?\*\/)/.exec(script)?.[1];
  let props = "";
  const dp = script.indexOf("defineProps<");
  if (dp >= 0) {
    const inner = balanced(script, dp + "defineProps".length, "<", ">").slice(1, -1).trim();
    if (inner.startsWith("{")) props = dedent(inner.slice(1, -1).replace(/^\n/, "").trimEnd());
    else {
      const m = new RegExp(`interface ${inner}[^{]*`).exec(script);
      props = m ? dedent(balanced(script, m.index + m[0].length, "{", "}").slice(1, -1).replace(/^\n/, "").trimEnd()) : `  /* ${inner} */`;
    }
  }
  if (config.dtsPropsFor?.[name]) props = "  " + config.dtsPropsFor[name].replace(/\n\s*\/\*\*[^*]*Emplacement[^*]*\*\/\s*$/, "");
  const extra = [];
  for (const m of script.matchAll(/defineModel<([^>]+(?:<[^>]*>)?)>\(([^)]*)\)/g)) {
    const req = /required:\s*true/.test(m[2]);
    if (!props.includes("modelValue")) extra.push(`  /** Liée par \`v-model\`. */\n  modelValue${req ? "" : "?"}: ${m[1]};\n  "onUpdate:modelValue"?: (value: ${m[1]}) => void;`);
  }
  const de = script.indexOf("defineEmits<");
  if (de >= 0) {
    const body = balanced(script, de + "defineEmits".length, "<", ">").slice(1, -1).trim().replace(/^\{|\}$/g, "");
    for (const m of body.matchAll(/(?:(\/\*\*[^]*?\*\/)\s*)?["']?([\w:-]+)["']?\s*:\s*\[([^\]]*)\]/g)) {
      const ev = m[2].replace(/(^|[-:])(\w)/g, (_, __, c) => c.toUpperCase());
      extra.push(`${m[1] ? "  " + m[1] + "\n" : ""}  on${ev}?: (${m[3]}) => void;`);
    }
  }
  const slots = [...new Set([...template.matchAll(/<slot(?:\s+name="([\w-]+)")?/g)].map((m) => m[1] ?? "default"))];
  out.push(`// ---- ${name}.vue`);
  const generic = /<script setup[^>]*generic="([^"]+)"/.exec(src)?.[1];
  out.push(`export interface ${name}Props${generic ? `<${generic}>` : ""} {`);
  if (props.trim()) out.push(props.replace(/^(?! )/gm, "  "));
  out.push(...extra);
  out.push("}");
  if (slots.length) out.push(`/** Emplacements : ${slots.map((s) => "`" + s + "`").join(", ")}. */`);
  if (doc) out.push(doc);
  out.push(`export declare const ${name}: DefineComponent<${name}Props${generic ? "<string>" : ""}>;`, "");
}
fs.writeFileSync(process.argv[2], out.join("\n"));
console.log(order.length, "components");
