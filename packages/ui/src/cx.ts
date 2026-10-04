/** Assemble des noms de classe, en ignorant les valeurs absentes. */
export function cx(...names: (string | false | null | undefined)[]): string {
  return names.filter((name): name is string => typeof name === "string" && name.length > 0).join(" ");
}
