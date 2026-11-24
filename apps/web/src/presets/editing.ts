import type { TeamEntry } from "@occulis/core";

/** L'équipe ouverte dans l'éditeur ; sans `id`, une équipe nouvelle (ou une copie). */
export interface PresetEditing {
  readonly id: string | undefined;
  readonly name: string;
  readonly team: readonly TeamEntry[];
}
