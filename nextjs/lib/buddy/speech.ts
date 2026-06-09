// nextjs/lib/buddy/speech.ts
import { extractFollowups, splitAnswerSegments } from './stream'

// Turn a raw answer (with [[spot:…]]/[[chips:…]] markers and **bold**) into
// clean prose for text-to-speech. Markers and markdown are stripped; only the
// spoken text remains.
export function speechText(content: string): string {
  const { rest } = extractFollowups(content)
  // Empty allowed-set => spot markers are dropped (not rendered), text kept.
  const { segments } = splitAnswerSegments(rest, new Set())
  return segments
    .filter((s): s is { type: 'text'; text: string } => s.type === 'text')
    .map((s) => s.text)
    .join(' ')
    .replace(/\*\*/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}
