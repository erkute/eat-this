/** Flüchtige Beobachtung im aktuellen Dokument; keine Kennung und kein Verlauf. */
const listeners = new Set<(name: string) => void>();
export function subscribeInsightEvents(listener: (name: string) => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
export function publishInsightEvent(name: string) {
  for (const listener of listeners) {
    try {
      listener(name);
    } catch {
      /* Messung darf die Produktaktion nicht unterbrechen. */
    }
  }
}
