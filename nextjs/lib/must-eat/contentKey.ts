/** The Sanity document selects one immutable private card revision. */
export function mustEatContentKey(id: string, version?: string): string {
  if (!version) return id;
  if (!/^[a-f0-9]{64}$/.test(version)) throw new Error('Invalid Must-Eat card revision');
  return `${id}/versions/${version}`;
}
