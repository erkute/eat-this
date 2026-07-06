import { describe, expect, it } from 'vitest'
import { extractJsonObjectText, extractJsonObjectTextFromBlocks } from './extract-json'

describe('extractJsonObjectText', () => {
  it('returns a clean JSON object unchanged', () => {
    expect(extractJsonObjectText('{"description":"ok"}', 'doc')).toBe('{"description":"ok"}')
  })

  it('extracts JSON from prose and fences', () => {
    const text = 'Die Recherche ist abgeschlossen.\n```json\n{"description":"ok","tip":null}\n```'
    expect(extractJsonObjectText(text, 'doc')).toBe('{"description":"ok","tip":null}')
  })

  it('handles braces inside strings', () => {
    const text = 'Intro {"description":"Falafel {warm}","tip":null} outro'
    expect(extractJsonObjectText(text, 'doc')).toBe('{"description":"Falafel {warm}","tip":null}')
  })

  it('throws a SyntaxError when no object exists', () => {
    expect(() => extractJsonObjectText('Die Recherche ist abgeschlossen.', 'doc')).toThrow(SyntaxError)
  })
})

describe('extractJsonObjectTextFromBlocks', () => {
  it('prefers the last text block containing JSON', () => {
    const blocks = [
      { type: 'text', text: '{"description":"draft"}' },
      { type: 'tool_use' },
      { type: 'text', text: 'Final:\n{"description":"final"}' },
    ]
    expect(extractJsonObjectTextFromBlocks(blocks, 'doc')).toBe('{"description":"final"}')
  })
})
