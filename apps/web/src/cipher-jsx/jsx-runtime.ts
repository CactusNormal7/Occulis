import { Fragment, jsx as reactJsx, jsxs as reactJsxs } from "react/jsx-runtime";
import { dressProps } from "./text.js";

/**
 * Le runtime JSX du client : celui de React, plus la possibilité de chiffrer les textes
 * (`./text.ts`). Branché par `esbuild.jsxImportSource` dans `vite.config.ts`.
 */
export { Fragment };

export const jsx: typeof reactJsx = (type, props, key) =>
  reactJsx(type, dressProps(type, props), key);

export const jsxs: typeof reactJsxs = (type, props, key) =>
  reactJsxs(type, dressProps(type, props), key);
