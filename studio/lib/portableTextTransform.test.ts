import {describe, expect, it} from 'vitest'
import {htmlToBlocks} from './portableTextTransform'
const text = (b: {children: {text: string}[]}) => b.children.map(c => c.text).join('')
describe('HTML paste', () => {
  it('keeps a list paragraph once, including list semantics', () => {
    const blocks = htmlToBlocks('<ul><li><p>Pizza</p></li></ul>')
    expect(blocks).toHaveLength(1)
    expect(blocks[0]).toMatchObject({listItem: 'bullet', level: 1})
    expect(text(blocks[0])).toBe('Pizza')
  })
  it('preserves nested numbered lists without duplicating their text', () => {
    const blocks = htmlToBlocks('<ul><li>Pizza<ol><li>Pasta<ul><li>Suppe</li></ul></li></ol></li><li>Salat</li></ul>')
    expect(blocks.map(text)).toEqual(['Pizza', 'Pasta', 'Suppe', 'Salat'])
    expect(blocks.map(b => [b.listItem, b.level])).toEqual([['bullet',1],['number',2],['bullet',3],['bullet',1]])
  })
  it('keeps quote paragraphs and inline formatting once', () => {
    const blocks = htmlToBlocks('<blockquote><p>Ein <strong>Zitat</strong></p><p>Fortsetzung</p></blockquote><p>Danach</p>')
    expect(blocks.map(text)).toEqual(['Ein Zitat', 'Fortsetzung', 'Danach'])
    expect(blocks.map(b => b.style)).toEqual(['blockquote','blockquote','normal'])
    expect(blocks[0].children[1].marks).toEqual(['strong'])
  })
  it('retains text in generic wrappers and ignores executable/style content', () => {
    expect(htmlToBlocks('<div>Ein Text</div><script>bad()</script><p>Ende</p>').map(text)).toEqual(['Ein Text','Ende'])
  })
})
