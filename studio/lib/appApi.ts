// Die Studio-Werkzeuge rufen Routen der App auf (Import, Vorschau, Fotos per
// Link). Lokal ist das der Dev-Server, im deployten Studio die Live-Site;
// SANITY_STUDIO_API_BASE überschreibt beides, z. B. für einen zweiten Port.
const studioEnv = (import.meta as unknown as {
  env: {DEV?: boolean; SANITY_STUDIO_API_BASE?: string}
}).env

export const APP_API_BASE: string =
  studioEnv.SANITY_STUDIO_API_BASE ||
  (studioEnv.DEV ? 'http://localhost:3000' : 'https://www.eatthisdot.com')
