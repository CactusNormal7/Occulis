// Compile les aperçus Vue de .design-sync/previews en un preview.html par composant, pour
// l'artifact « Design System » (.design-sync/NOTES.md, « Re-sync vers l'artifact »).
// Usage : node .design-sync/scripts/build-previews.mjs <dossier> [hauteurs.json]
// Écrit <dossier>/project/components/<Composant>/preview.html. Vue et la charte sont lus sur
// window.Vue et window.OcculisUI, que la page de l'artifact charge avant l'aperçu. Les
// hauteurs (px, par composant) sont celles de la carte ; 240 par défaut.
import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const REPO = fileURLToPath(new URL("../../", import.meta.url));
// esbuild et le compilateur de Vue arrivent avec Vite : pnpm les expose sous .pnpm/node_modules.
const require = createRequire(path.join(REPO, "node_modules/.pnpm/node_modules/"));
const esbuild = require("esbuild");
const sfc = require("@vue/compiler-sfc");
const OUT = process.argv[2];
const heights = JSON.parse(fs.readFileSync(process.argv[3] || "/dev/null", "utf8") || "{}");

const vuePlugin = {
  name: "vue",
  setup(build) {
    build.onResolve({ filter: /^vue$/ }, () => ({ path: "vue", namespace: "glob" }));
    build.onResolve({ filter: /^@occulis\/(ui|i18n)$/ }, (a) => ({ path: a.path, namespace: "glob" }));
    build.onLoad({ filter: /.*/, namespace: "glob" }, (a) => ({
      contents: a.path === "vue" ? "module.exports = window.Vue" : a.path === "@occulis/ui" ? "module.exports = window.OcculisUI" : "module.exports = {}",
      loader: "js",
    }));
    build.onLoad({ filter: /\.vue$/ }, (a) => {
      const src = fs.readFileSync(a.path, "utf8");
      const { descriptor, errors } = sfc.parse(src, { filename: a.path });
      if (errors.length) throw errors[0];
      const id = path.basename(a.path);
      const script = sfc.compileScript(descriptor, { id, inlineTemplate: true, isProd: true });
      return { contents: script.content, loader: "ts", resolveDir: path.dirname(a.path) };
    });
  },
};

const docs = path.join(REPO, ".design-sync/docs");
const previews = path.join(REPO, ".design-sync/previews");
for (const file of fs.readdirSync(docs).sort()) {
  const name = file.replace(/\.md$/, "");
  const front = fs.readFileSync(path.join(docs, file), "utf8");
  const category = /category:\s*(.+)/.exec(front)?.[1].trim();
  const storiesLine = /stories:\s*(.+)/.exec(front)?.[1];
  if (!storiesLine) { console.error("skip (no stories):", name); continue; }
  const stories = storiesLine.split(",").map((s) => s.trim());
  const imports = stories.map((s, i) => `import S${i} from ${JSON.stringify(path.join(previews, name, s + ".vue"))};`).join("\n");
  const entry = `${imports}
const { createApp, h } = window.Vue;
const { UiRoot, ToastProvider } = window.OcculisUI;
const stories = [${stories.map((s, i) => `[${JSON.stringify(s)}, S${i}]`).join(", ")}];
const label = (n) => n.replace(/([a-z0-9])([A-Z])/g, "$1 $2");
createApp({ render: () => h(UiRoot, null, () => h(ToastProvider, null, () =>
  h("div", { class: "pv" }, stories.map(([n, C]) => h("section", { class: "pv-story", key: n }, [
    h("p", { class: "occ-label pv-name" }, label(n)), h(C)])))))}).mount("#root");
`;
  const res = await esbuild.build({
    stdin: { contents: entry, resolveDir: previews, loader: "js" },
    bundle: true, format: "iife", minify: true, write: false, plugins: [vuePlugin], target: "es2020",
    define: { "process.env.NODE_ENV": '"production"' }, logLevel: "error",
  });
  let js = res.outputFiles[0].text.replace(/<\/script/gi, "<\\/script").replace(/<!--/g, "\\x3C!--");
  const h = heights[name] ?? 240;
  const html = `<!-- @dsCard group="${category}" height=${h} -->
<!doctype html>
<html><head><meta charset="utf-8">
<style>
  html, body { margin: 0; background: var(--occ-bg); color: var(--occ-ink); }
  .pv { display: flex; flex-direction: column; gap: var(--occ-space-6); padding: var(--occ-space-5); }
  .pv-name { margin: 0 0 var(--occ-space-3); color: var(--occ-ink-dim); }
</style></head>
<body><div id="root"></div>
<script>${js}</script>
</body></html>
`;
  fs.mkdirSync(path.join(OUT, "project/components", name), { recursive: true });
  fs.writeFileSync(path.join(OUT, "project/components", name, "preview.html"), html);
}
