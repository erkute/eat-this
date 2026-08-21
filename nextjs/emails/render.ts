import { render } from '@react-email/render';
import type { ReactElement } from 'react';

// React 19's DOM renderer hoists a `<link rel="preload" as="image">` into
// <head> for every <img> it sees. In a browser that is a win; in an inbox it is
// dead weight — no mail client acts on it, and it repeats every artwork URL,
// which inflates the message for nothing.
const PRELOAD = /<link rel="preload"[^>]*\/>/g;

/** Renders an email template to the HTML that actually goes out. */
export async function renderEmail(element: ReactElement): Promise<string> {
  return (await render(element)).replace(PRELOAD, '');
}
