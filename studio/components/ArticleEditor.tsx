import {Box, Card, Flex, Stack, Text} from '@sanity/ui'
import {ImageIcon} from '@sanity/icons'
import {useClient, type BlockProps, type BlockStyleProps, type PortableTextInputProps} from 'sanity'
import {PortableTextInputWithPaste} from '../lib/portableTextPaste'

// Bausteine des Artikel-Editors: Im Text soll stehen, was später auf der
// Seite steht — ein Bild als Bild mit Unterschrift, das Fazit als Etikett.

// Sanity gibt dem Editor eine feste Höhe (19em) und lässt den Text darin
// scrollen — für einen ganzen Artikel ein Schlüsselloch. Hier wächst er mit
// dem Text, und die Werkzeugleiste bleibt beim Scrollen oben stehen.
const EDITOR_CSS = `
.et-article-editor [data-testid='pt-editor'][data-fullscreen='false'] {
  height: auto;
  min-height: 24em;
  resize: none;
  overflow: visible;
}
.et-article-editor [data-testid='pt-editor'][data-fullscreen='false'] [data-testid='pt-editor__toolbar-card'] {
  position: sticky;
  top: 0;
}
`

/** Artikeltext: einfügen von HTML/Markdown, wachsende Höhe, feste Leiste. */
export function ArticleTextInput(props: PortableTextInputProps) {
  return (
    <div className="et-article-editor">
      <style>{EDITOR_CSS}</style>
      <PortableTextInputWithPaste {...props} />
    </div>
  )
}

/** „Fazit“: Die Zeile wird zum Etikett über den letzten Absätzen. */
export function ConclusionStyle(props: BlockStyleProps) {
  return (
    <Box
      style={{
        textTransform: 'uppercase',
        letterSpacing: '0.08em',
        fontWeight: 700,
        fontSize: '0.8em',
        paddingTop: '0.75em',
        borderTop: '2px solid var(--card-fg-color)',
      }}
    >
      {props.children}
    </Box>
  )
}

type ImageValue = {asset?: {_ref?: string}; caption?: string; alt?: string}

/** image-<hash>-<w>x<h>-<ext> → CDN-Adresse in passender Breite. */
function imageUrl(ref: string | undefined, projectId: string, dataset: string, width: number): string | null {
  const match = /^image-([a-f0-9]+)-(\d+x\d+)-(\w+)$/.exec(ref ?? '')
  if (!match) return null
  const [, hash, size, ext] = match
  return `https://cdn.sanity.io/images/${projectId}/${dataset}/${hash}-${size}.${ext}?w=${width}&fit=max&auto=format`
}

/** Bild im Text: groß, mit Unterschrift darunter — wie auf der Seite. */
export function ImageBlock(props: BlockProps) {
  const {projectId, dataset} = useClient({apiVersion: '2024-01-01'}).config()
  const value = props.value as ImageValue
  const src = imageUrl(value.asset?._ref, projectId ?? '', dataset ?? '', 1200)

  return props.renderDefault({
    ...props,
    renderPreview: () => (
      <Stack gap={3} padding={1}>
        {src ? (
          <img
            src={src}
            alt={value.alt ?? ''}
            style={{display: 'block', width: '100%', maxHeight: 420, objectFit: 'contain', borderRadius: 6}}
          />
        ) : (
          <Card padding={5} radius={2} tone="transparent" border>
            <Flex direction="column" align="center" gap={3}>
              <Text size={3} muted>
                <ImageIcon />
              </Text>
              <Text size={1} muted>
                Doppelklick, um ein Bild zu wählen
              </Text>
            </Flex>
          </Card>
        )}
        <Text size={1} muted={!value.caption} style={{fontStyle: value.caption ? 'normal' : 'italic'}}>
          {value.caption || 'Ohne Bildunterschrift'}
        </Text>
        {src && !value.alt ? (
          <Text size={0} muted>
            Beschreibung für Google fehlt noch.
          </Text>
        ) : null}
      </Stack>
    ),
  })
}
