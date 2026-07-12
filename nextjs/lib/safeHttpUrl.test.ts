import { describe, expect, it } from 'vitest'
import { safeHttpUrl } from './safeHttpUrl'

describe('safeHttpUrl', () => {
  it.each([
    ['https://example.com/photo?id=1', 'https://example.com/photo?id=1'],
    ['http://example.com', 'http://example.com/'],
    ['HTTPS://EXAMPLE.COM/a', 'https://example.com/a'],
  ])('accepts and normalizes web URL %s', (input, expected) => {
    expect(safeHttpUrl(input)).toBe(expected)
  })

  it.each([
    null,
    undefined,
    '',
    '/relative/path',
    'javascript:alert(1)',
    'data:text/html,hello',
    'ftp://example.com/file',
    'not a URL',
  ])('rejects non-HTTP value %s', (input) => {
    expect(safeHttpUrl(input)).toBeNull()
  })
})
