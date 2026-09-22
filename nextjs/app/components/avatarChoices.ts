import type { AvatarChoice } from '@/lib/firebase/useUserProfile';

/** Die drei Charaktere — gespeichert wird nur die Nummer, der Name ist die
 *  Bildunterschrift. Dieselben Namen wie im Avatar-Fenster des Profils
 *  (avatarChoice1–3 in lib/i18n/translations.ts), in beiden Sprachen gleich.
 *  Eine Liste fuer /welcome und die Tour. */
export const AVATAR_CHOICES: { id: AvatarChoice; label: string }[] = [
  { id: 1, label: 'Spot Scout' },
  { id: 2, label: 'Spice Diva' },
  { id: 3, label: 'Chef Slice' },
];

export const avatarSrc = (id: AvatarChoice) => `/pics/avatar/${id}.webp?v=4`;
