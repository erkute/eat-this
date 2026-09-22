import type { AvatarChoice } from '@/lib/firebase/useUserProfile';

/** Die drei Charaktere — gespeichert wird nur die Nummer, der Name ist die
 *  Bildunterschrift. Eine Liste für /welcome und die Tour. */
export const AVATAR_CHOICES: { id: AvatarChoice; de: string; en: string }[] = [
  { id: 1, de: 'Schnüffler', en: 'Sniffer' },
  { id: 2, de: 'Nacht\u00ADschwärmerin', en: 'Night Owl' },
  { id: 3, de: 'Pizza-Pate', en: 'Pizza Boss' },
];

export const avatarSrc = (id: AvatarChoice) => `/pics/avatar/${id}.webp?v=4`;
