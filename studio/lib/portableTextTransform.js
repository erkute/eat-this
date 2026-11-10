const key = () => Math.random().toString(36).slice(2, 14)

// HTML -> Portable Text
// Handles h1-h4, p, blockquote, li, strong/b, em/i, a[href].
export function htmlToBlocks(html) {
  const doc = new globalThis.DOMParser().parseFromString(html, 'text/html')
  const blocks = []
  const emit = (el, style, list) => {
    const {children, markDefs} = collectSpans(el)
    if (!children.some(span => span.text.trim())) return
    blocks.push({_type: 'block', _key: key(), style, markDefs, children, ...list})
  }
  function visit(parent, style = 'normal', level = 0) {
    let inline = doc.createDocumentFragment()
    const flush = () => { emit(inline, style); inline = doc.createDocumentFragment() }
    for (const node of parent.childNodes) {
      const tag = node.nodeType === 1 ? node.tagName.toLowerCase() : ''
      if (['script', 'style', 'meta'].includes(tag)) continue
      if (tag === 'ul' || tag === 'ol') {
        flush()
        for (const li of node.children) {
          if (li.tagName.toLowerCase() !== 'li') continue
          emit(li, style, {listItem: tag === 'ol' ? 'number' : 'bullet', level: level + 1})
          for (const nested of li.querySelectorAll('ul, ol')) {
            if (nested.parentElement.closest('li') === li) {
              const holder = doc.createElement('div')
              holder.appendChild(nested.cloneNode(true))
              visit(holder, style, level + 1)
            }
          }
        }
      } else if (tag === 'blockquote') {
        flush(); visit(node, 'blockquote', level)
      } else if (/^h[1-4]$/.test(tag) || tag === 'p') {
        flush(); emit(node, tag === 'p' ? style : Number(tag[1]) <= 2 ? 'h2' : 'h3')
      } else if (['div', 'section', 'article', 'main', 'body'].includes(tag)) {
        flush(); visit(node, style, level)
      } else {
        inline.appendChild(node.cloneNode(true))
      }
    }
    flush()
  }
  visit(doc.body)
  return blocks
}

function collectSpans(root) {
  const children = []
  const markDefs = []

  function walk(node, activeMarks) {
    if (node.nodeType === 3) {
      const text = node.nodeValue
      if (!text) return
      children.push({_type: 'span', _key: key(), marks: [...activeMarks], text})
      return
    }
    if (node.nodeType !== 1) return

    const tag = node.tagName.toLowerCase()
    if (tag === 'ul' || tag === 'ol') return
    if (tag === 'p' && children.length) children.push({_type: 'span', _key: key(), marks: [], text: '\n'})
    const nextMarks = [...activeMarks]
    if (tag === 'strong' || tag === 'b') nextMarks.push('strong')
    else if (tag === 'em' || tag === 'i') nextMarks.push('em')
    else if (tag === 'a' && node.getAttribute('href')) {
      const linkKey = key()
      markDefs.push({_key: linkKey, _type: 'link', href: node.getAttribute('href'), blank: true})
      nextMarks.push(linkKey)
    } else if (tag === 'br') {
      children.push({_type: 'span', _key: key(), marks: [...activeMarks], text: '\n'})
      return
    }

    node.childNodes.forEach((c) => walk(c, nextMarks))
  }

  root.childNodes.forEach((c) => walk(c, []))
  return {children, markDefs}
}

// Markdown -> Portable Text
// Block: #/##/### headings, > blockquote, blank line = paragraph break.
// Inline: **bold**, *italic*, _italic_, [text](url).
export function markdownToBlocks(md) {
  const lines = md.replace(/\r\n/g, '\n').split('\n')
  const blocks = []
  let paraBuf = []

  const flushPara = () => {
    if (paraBuf.length === 0) return
    blocks.push(makeBlock(paraBuf.join(' '), 'normal'))
    paraBuf = []
  }

  for (const raw of lines) {
    const line = raw.trim()
    if (line === '') {
      flushPara()
      continue
    }
    let m
    if ((m = line.match(/^###\s+(.*)/))) { flushPara(); blocks.push(makeBlock(m[1], 'h3')); continue }
    if ((m = line.match(/^##\s+(.*)/))) { flushPara(); blocks.push(makeBlock(m[1], 'h2')); continue }
    if ((m = line.match(/^#\s+(.*)/))) { flushPara(); blocks.push(makeBlock(m[1], 'h2')); continue }
    if ((m = line.match(/^>\s+(.*)/))) { flushPara(); blocks.push(makeBlock(m[1], 'blockquote')); continue }
    paraBuf.push(line)
  }
  flushPara()
  return blocks
}

function makeBlock(text, style) {
  const {children, markDefs} = inlineParse(text)
  return {_type: 'block', _key: key(), style, markDefs, children}
}

function inlineParse(text) {
  const children = []
  const markDefs = []
  const tokens = []
  const re = /(\*\*([^*]+)\*\*)|(\*([^*]+)\*)|(_([^_]+)_)|(\[([^\]]+)\]\(([^)]+)\))/g
  let last = 0
  let m
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) tokens.push({type: 'text', text: text.slice(last, m.index)})
    if (m[1]) tokens.push({type: 'bold', text: m[2]})
    else if (m[3]) tokens.push({type: 'italic', text: m[4]})
    else if (m[5]) tokens.push({type: 'italic', text: m[6]})
    else if (m[7]) tokens.push({type: 'link', text: m[8], href: m[9]})
    last = re.lastIndex
  }
  if (last < text.length) tokens.push({type: 'text', text: text.slice(last)})
  if (tokens.length === 0) tokens.push({type: 'text', text})

  for (const tok of tokens) {
    if (tok.type === 'bold') {
      children.push({_type: 'span', _key: key(), marks: ['strong'], text: tok.text})
    } else if (tok.type === 'italic') {
      children.push({_type: 'span', _key: key(), marks: ['em'], text: tok.text})
    } else if (tok.type === 'link') {
      const linkKey = key()
      markDefs.push({_key: linkKey, _type: 'link', href: tok.href, blank: true})
      children.push({_type: 'span', _key: key(), marks: [linkKey], text: tok.text})
    } else {
      children.push({_type: 'span', _key: key(), marks: [], text: tok.text})
    }
  }
  return {children, markDefs}
}
