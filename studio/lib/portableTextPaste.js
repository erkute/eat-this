import React from 'react'
import {PortableTextInput} from 'sanity'

const key = () => Math.random().toString(36).slice(2, 14)

// HTML -> Portable Text
// Handles h1-h4, p, blockquote, li, strong/b, em/i, u, a[href].
function htmlToBlocks(html) {
  const doc = new DOMParser().parseFromString(html, 'text/html')
  const blocks = []
  const nodes = doc.body.querySelectorAll('h1, h2, h3, h4, p, blockquote, li')

  nodes.forEach((el) => {
    const tag = el.tagName.toLowerCase()
    let style = 'normal'
    if (tag === 'h1' || tag === 'h2') style = 'h2'
    else if (tag === 'h3' || tag === 'h4') style = 'h3'
    else if (tag === 'blockquote') style = 'blockquote'

    const {children, markDefs} = collectSpans(el)
    if (children.length === 0) return
    blocks.push({_type: 'block', _key: key(), style, markDefs, children})
  })

  if (blocks.length === 0) {
    const text = doc.body.textContent.trim()
    if (text) blocks.push(makeBlock(text, 'normal'))
  }
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
    const nextMarks = [...activeMarks]
    if (tag === 'strong' || tag === 'b') nextMarks.push('strong')
    else if (tag === 'em' || tag === 'i') nextMarks.push('em')
    else if (tag === 'u') nextMarks.push('underline')
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
function markdownToBlocks(md) {
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

// Paste handler: prefers text/html, falls back to markdown in text/plain.
export function onPortableTextPaste({event}) {
  const clipboard = event?.clipboardData
  if (!clipboard) return undefined

  const html = clipboard.getData('text/html') || ''
  const plain = clipboard.getData('text/plain') || ''

  let blocks = []
  if (html.trim()) blocks = htmlToBlocks(html)
  if (blocks.length === 0 && plain.trim()) blocks = markdownToBlocks(plain)
  if (blocks.length === 0) return undefined

  event.preventDefault?.()
  return Promise.resolve({insert: blocks})
}

export function PortableTextInputWithPaste(props) {
  return React.createElement(PortableTextInput, {...props, onPaste: onPortableTextPaste})
}
