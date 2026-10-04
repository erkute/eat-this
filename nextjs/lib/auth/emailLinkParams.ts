/** Firebase action parameters; `e` is only stripped, never trusted or emitted. */
export const EMAIL_LINK_EMAIL_PARAM = 'e';
export const EMAIL_LINK_PARAMS = ['mode', 'oobCode', 'apiKey', EMAIL_LINK_EMAIL_PARAM] as const;
