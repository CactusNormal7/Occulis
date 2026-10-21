/// <reference types="vite/client" />

// Le pré-rendu (règles de spéculation, `criticalHead()`) : absent du lib.dom de TypeScript.
interface Document {
  readonly prerendering?: boolean;
}
