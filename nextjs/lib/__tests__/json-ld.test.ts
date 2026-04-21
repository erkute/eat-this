import { describe, it, expect } from 'vitest'
import { serializeJsonLd } from '../json-ld'

describe('serializeJsonLd', () => {
  it('serializes a plain object to JSON string', () => {
    const data = { '@type': 'Restaurant', name: 'Test' }
    const result = serializeJsonLd(data)
    expect(result).toBe('{"@type":"Restaurant","name":"Test"}')
  })

  it('escapes closing script tags to prevent XSS', () => {
    const data = { name: '</script><script>alert(1)</script>' }
    const result = serializeJsonLd(data)
    expect(result).not.toContain('</script>')
    expect(result).toContain('<\\/script>')
  })

  it('handles nested objects', () => {
    const data = { address: { '@type': 'PostalAddress', streetAddress: '123 Main St' } }
    const result = serializeJsonLd(data)
    expect(JSON.parse(result)).toEqual(data)
  })
})
