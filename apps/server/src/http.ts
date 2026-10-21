/**
 * Le corps JSON d'une requête, en objet. Illisible ou d'une autre forme (`null`, tableau,
 * nombre), il vaut `{}` : chaque route valide ensuite ses champs, et refuse un champ
 * manquant comme un champ invalide — au lieu de lever, ce qu'un corps `null` faisait en
 * le déstructurant.
 */
export async function readBody(request: Request): Promise<Readonly<Record<string, unknown>>> {
  const body: unknown = await request.json().catch(() => undefined);
  return typeof body === "object" && body !== null && !Array.isArray(body)
    ? (body as Record<string, unknown>)
    : {};
}
