import { readFileSync } from 'fs'
import path from 'path'

// Serves the standalone password-reset page from public/.
// Firebase Auth email links land here with ?mode=resetPassword&oobCode=...
export async function GET() {
  const html = readFileSync(
    path.join(process.cwd(), 'public', 'reset-password.html'),
    'utf-8'
  )
  return new Response(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  })
}
