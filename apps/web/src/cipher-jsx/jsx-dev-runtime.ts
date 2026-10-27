import { Fragment, jsxDEV as reactJsxDEV } from "react/jsx-dev-runtime";
import { dressProps } from "./text.js";

/** Le pendant de `jsx-runtime.ts` pour le serveur de développement. */
export { Fragment };

export const jsxDEV: typeof reactJsxDEV = (type, props, key, isStatic, source, self) =>
  reactJsxDEV(type, dressProps(type, props), key, isStatic, source, self);
