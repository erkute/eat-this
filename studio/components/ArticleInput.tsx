import {useCallback, useEffect, useId, useRef, useState} from 'react'
import {
  Box,
  Button,
  Card,
  Checkbox,
  Dialog,
  Flex,
  Spinner,
  Stack,
  Text,
  TextArea,
  useToast,
} from '@sanity/ui'
import {ComposeSparklesIcon, EyeOpenIcon} from '@sanity/icons'
import {useClient, useFormValue, type ObjectInputProps} from 'sanity'
import {
  hasArticleText,
  openArticlePreview,
  startArticleWriting,
  useArticleWriting,
  type ArticleDocument,
} from '../lib/articleTools'

/**
 * Das Artikel-Formular mit einer Leiste obendrauf: Mit AI schreiben und die
 * Vorschau auf der Website — beides sichtbar statt im Menü versteckt.
 */
export function ArticleInput(props: ObjectInputProps) {
  const client = useClient({apiVersion: '2024-01-01'})
  const toast = useToast()
  const doc = useFormValue([]) as (ArticleDocument & {_createdAt?: string}) | undefined
  const [writerOpen, setWriterOpen] = useState(false)
  const [previewing, setPreviewing] = useState(false)
  const writing = useArticleWriting(doc?._id)

  const preview = useCallback(async () => {
    if (!doc?._id) return
    setPreviewing(true)
    try {
      await openArticlePreview(client, doc._id)
    } catch (error) {
      toast.push({
        status: 'error',
        title: 'Vorschau ging nicht auf',
        description: (error as Error).message,
      })
    } finally {
      setPreviewing(false)
    }
  }, [client, doc?._id, toast])

  const empty = !hasArticleText(doc)
  const saved = Boolean(doc?._createdAt)

  return (
    <Stack gap={5}>
      <Card padding={3} radius={3} tone={empty || writing ? 'primary' : 'transparent'} border>
        <Flex align="center" gap={3} wrap="wrap">
          <Flex flex={1} align="center" gap={3} style={{minWidth: 200}}>
            {writing ? <Spinner muted /> : null}
            <Text size={1} muted={!empty && !writing}>
              {writing
                ? 'AI schreibt den Artikel. Das dauert ein paar Minuten, du kannst weiterarbeiten.'
                : empty
                  ? 'Leerer Artikel. Selbst schreiben oder einen Entwurf schreiben lassen.'
                  : 'Die Vorschau zeigt den Entwurf auf der Website, nur für dich.'}
            </Text>
          </Flex>
          <Flex gap={2}>
            <Button
              icon={ComposeSparklesIcon}
              text={writing ? 'Schreibt …' : 'Mit AI schreiben'}
              mode={empty && !writing ? 'default' : 'ghost'}
              tone="primary"
              fontSize={1}
              disabled={writing}
              onClick={() => setWriterOpen(true)}
            />
            <Button
              icon={EyeOpenIcon}
              text={previewing ? 'Öffnet …' : 'Vorschau'}
              mode="ghost"
              fontSize={1}
              disabled={!saved || previewing}
              title={
                saved
                  ? 'Öffnet die Seite mit diesem Entwurf, nicht öffentlich'
                  : 'Erst etwas eintragen'
              }
              onClick={preview}
            />
          </Flex>
        </Flex>
      </Card>

      {props.renderDefault(props)}

      {writerOpen && doc ? <WriterDialog doc={doc} onClose={() => setWriterOpen(false)} /> : null}
    </Stack>
  )
}

function parseLinks(text: string): string[] | null {
  const links = text
    .split(/\s+/)
    .map((part) => part.trim())
    .filter(Boolean)
  if (links.length > 8) return null
  for (const link of links) {
    try {
      if (new URL(link).protocol !== 'https:') return null
    } catch {
      return null
    }
  }
  return links
}

function WriterDialog({doc, onClose}: {doc: ArticleDocument; onClose: () => void}) {
  const client = useClient({apiVersion: '2024-01-01'})
  const toast = useToast()
  const id = useId()
  const briefRef = useRef<HTMLTextAreaElement>(null)
  const [brief, setBrief] = useState('')
  const [links, setLinks] = useState('')
  const [replace, setReplace] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const hasText = hasArticleText(doc)

  // Der Dialog setzt den Fokus selbst aufs Schließen-Kreuz; der Cursor gehört ins Feld.
  useEffect(() => {
    const timer = setTimeout(() => briefRef.current?.focus(), 50)
    return () => clearTimeout(timer)
  }, [])

  // Läuft im Hintergrund weiter; der Dialog geht sofort zu.
  const write = useCallback(() => {
    const sources = parseLinks(links)
    if (!sources) {
      setError('Links bitte mit https:// und höchstens acht.')
      return
    }
    startArticleWriting(client, doc, {brief: brief.trim(), sources, replace}, (notice) =>
      toast.push({...notice, closable: true, duration: 20000}),
    )
    onClose()
  }, [brief, client, doc, links, onClose, replace, toast])

  const tooShort = brief.trim().length < 20

  return (
    <Dialog
      id={`${id}-writer`}
      header="Mit AI schreiben"
      width={1}
      onClose={onClose}
      footer={
        <Flex gap={2} justify="flex-end" padding={3}>
          <Button mode="bleed" text="Abbrechen" onClick={onClose} />
          <Button
            icon={ComposeSparklesIcon}
            tone="primary"
            text="Artikel schreiben"
            disabled={tooShort}
            onClick={write}
          />
        </Flex>
      }
    >
      <Box padding={4}>
        <Stack gap={5}>
          <Stack gap={2}>
            <Text as="label" htmlFor={`${id}-brief`} size={1} weight="semibold">
              Worum geht&apos;s?
            </Text>
            <TextArea
              ref={briefRef}
              id={`${id}-brief`}
              rows={7}
              value={brief}
              placeholder="z. B. Die besten Croissants in Kreuzberg. Crapulix und Albatross müssen rein, mit Preisen, persönlich erzählt."
              onChange={(event) => setBrief(event.currentTarget.value)}
            />
            <Text size={1} muted>
              Je genauer, desto besser: Thema, Spots, was unbedingt rein muss, welcher Ton.
            </Text>
          </Stack>

          <Stack gap={2}>
            <Text as="label" htmlFor={`${id}-links`} size={1} weight="semibold">
              Links <span style={{fontWeight: 400}}>(optional)</span>
            </Text>
            <TextArea
              id={`${id}-links`}
              rows={3}
              value={links}
              placeholder="https://"
              onChange={(event) => setLinks(event.currentTarget.value)}
            />
            <Text size={1} muted>
              Websites, Speisekarten, Presse. Einer pro Zeile. Recherchiert wird zusätzlich selbst.
            </Text>
          </Stack>

          {hasText ? (
            <Flex gap={3} align="flex-start">
              <Checkbox
                id={`${id}-replace`}
                checked={replace}
                onChange={(e) => setReplace(e.currentTarget.checked)}
                style={{marginTop: 2}}
              />
              <Stack gap={2}>
                <Text as="label" htmlFor={`${id}-replace`} size={1} weight="semibold">
                  Vorhandenen Text ersetzen
                </Text>
                <Text size={1} muted>
                  Sonst füllt die AI nur, was noch leer ist.
                </Text>
              </Stack>
            </Flex>
          ) : null}

          {error ? (
            <Card padding={3} radius={2} tone="critical" border>
              <Text size={1}>{error}</Text>
            </Card>
          ) : null}

          <Text size={1} muted>
            Recherchiert im Netz und schreibt Deutsch und Englisch, mit Teaser und Google-Texten.
            Dauert ein paar Minuten, du kannst währenddessen weiterarbeiten.
          </Text>
        </Stack>
      </Box>
    </Dialog>
  )
}
