/**
 * Der Spot-Name ohne angehängten Bezirk: „AERA Charlottenburg" → „AERA".
 * In Sanity tragen Ableger den Bezirk im Namen, damit sie sich unterscheiden;
 * unter einem Must Eat braucht es ihn nicht (Ansage 28.09.2026). Nur ein
 * Bezirk ganz am Ende, als eigenes Wort, und nie der ganze Name.
 */
export function spotNameWithoutDistrict(name: string, district: string | undefined): string {
  if (!district) return name;
  const escaped = district.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const stripped = name.replace(new RegExp(`[\\s,–—-]+${escaped}\\s*$`, 'iu'), '').trim();
  return stripped || name;
}
