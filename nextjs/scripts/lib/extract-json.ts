type TextLikeBlock = {
  type: string
  text?: string
}

function stripFence(text: string): string {
  return text
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/, '')
    .trim()
}

function preview(text: string): string {
  return text.replace(/\s+/g, ' ').trim().slice(0, 120)
}

export function extractJsonObjectText(text: string, docId: string): string {
  const source = stripFence(text)

  for (let start = 0; start < source.length; start++) {
    if (source[start] !== '{') continue

    let depth = 0
    let inString = false
    let escaped = false

    for (let end = start; end < source.length; end++) {
      const char = source[end]

      if (inString) {
        if (escaped) {
          escaped = false
        } else if (char === '\\') {
          escaped = true
        } else if (char === '"') {
          inString = false
        }
        continue
      }

      if (char === '"') {
        inString = true
      } else if (char === '{') {
        depth++
      } else if (char === '}') {
        depth--
        if (depth === 0) {
          const candidate = source.slice(start, end + 1)
          try {
            const parsed = JSON.parse(candidate)
            if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
              return candidate
            }
          } catch {
            break
          }
        }
      }
    }
  }

  throw new SyntaxError(`No JSON object found in response for ${docId}. Response starts: "${preview(source)}"`)
}

export function extractJsonObjectTextFromBlocks(content: TextLikeBlock[], docId: string): string {
  const textBlocks = content.filter((block) => block.type === 'text' && typeof block.text === 'string')
  for (let i = textBlocks.length - 1; i >= 0; i--) {
    const block = textBlocks[i]
    try {
      return extractJsonObjectText(block.text ?? '', docId)
    } catch (err) {
      if (!(err instanceof SyntaxError)) throw err
    }
  }
  throw new Error(`No JSON text block in response for ${docId}`)
}
