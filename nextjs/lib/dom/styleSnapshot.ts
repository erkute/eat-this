/* Inline-Style eines Elements merken und exakt zurückschreiben — inklusive
   `!important`. Gebraucht von den beiden Bar-Locks (Login-Modal, Must-Eat-Sheet),
   die html/body auf dem Telefon vorübergehend einfärben, damit Safaris
   durchscheinende Leisten die richtige Farbe sehen. */
export type StyleSnapshot = {
  priority: string;
  value: string;
};

export function snapshotStyle(style: CSSStyleDeclaration, prop: string): StyleSnapshot {
  return {
    priority: style.getPropertyPriority(prop),
    value: style.getPropertyValue(prop),
  };
}

export function restoreStyle(style: CSSStyleDeclaration, prop: string, snapshot: StyleSnapshot) {
  if (snapshot.value) {
    style.setProperty(prop, snapshot.value, snapshot.priority);
  } else {
    style.removeProperty(prop);
  }
}
