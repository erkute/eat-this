import React from 'react'
import {PortableTextInput} from 'sanity'

import {htmlToBlocks, markdownToBlocks} from './portableTextTransform'

// Paste handler: prefers text/html, falls back to markdown in text/plain.
function onPortableTextPaste({event}) {
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
