/**
 * Le registre des rulesets vit dans `@occulis/core` (`rulesets/`) : le client doit
 * appliquer la version de la partie qu'il joue, donc le connaître aussi. Ce module ne
 * fait que le réexposer au serveur.
 */
export { CURRENT_RULESET_VERSION, rulesetFor } from "@occulis/core";
