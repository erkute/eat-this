import {useCallback, useEffect, useRef, useState, type DragEvent} from 'react'
import {Box, Button, Card, Flex, Grid, Spinner, Stack, Text, TextArea, TextInput} from '@sanity/ui'
import {ImageIcon, UploadIcon, WarningOutlineIcon} from '@sanity/icons'
import {useClient, useFormValue, type ObjectInputProps} from 'sanity'
import {
  CARD_RATIO,
  MUST_EAT_CARD_SAVED,
  readMustEatCard,
  saveMustEatCard,
  type MustEatCard,
  type MustEatCardText,
} from '../lib/mustEatCard'

const EMPTY: MustEatCardText = {dish: '', description: '', descriptionEn: '', price: ''}
const PREVIEW_WIDTH = 168

type Load = {kind: 'idle'} | {kind: 'loading'} | {kind: 'ready'; card: MustEatCard | null} | {kind: 'error'; message: string}

/**
 * Das Must Eat Formular plus die Karte: Bild zum Reinziehen, Gericht,
 * Beschreibungen, Preis. Gespeichert wird bei der App, nicht in Sanity —
 * deshalb ein eigener Knopf, der sofort wirkt.
 */
export function MustEatCardInput(props: ObjectInputProps) {
  const client = useClient({apiVersion: '2024-01-01'})
  const id = useFormValue(['_id']) as string | undefined
  const spot = (props.value as {restaurantRef?: {_ref?: string}} | undefined)?.restaurantRef?._ref

  const [load, setLoad] = useState<Load>({kind: 'idle'})
  const [text, setText] = useState<MustEatCardText>(EMPTY)
  const [file, setFile] = useState<{file: File; url: string; ratioOff: boolean} | null>(null)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{tone: 'positive' | 'critical'; text: string} | null>(null)
  const fileInput = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!id || !spot) return
    let cancelled = false
    setLoad({kind: 'loading'})
    readMustEatCard(client, id)
      .then((card) => {
        if (cancelled) return
        setLoad({kind: 'ready', card})
        setText({dish: card.dish, description: card.description, descriptionEn: card.descriptionEn, price: card.price})
      })
      .catch((error: Error & {status?: number}) => {
        if (cancelled) return
        // Gerade erst angelegt: Sanity kennt den Entwurf noch nicht. Dann
        // ist es eben eine neue Karte.
        if (error.status === 404) setLoad({kind: 'ready', card: null})
        else setLoad({kind: 'error', message: error.message})
      })
    return () => {
      cancelled = true
    }
  }, [client, id, spot])

  useEffect(
    () => () => {
      if (file) URL.revokeObjectURL(file.url)
    },
    [file],
  )

  const pick = useCallback((picked: File | undefined) => {
    if (!picked) return
    if (!/^image\/(png|jpeg|webp)$/.test(picked.type)) {
      setMessage({tone: 'critical', text: 'Bitte ein PNG, JPG oder WebP.'})
      return
    }
    const url = URL.createObjectURL(picked)
    const img = new Image()
    img.onload = () => {
      const ratio = img.naturalWidth / img.naturalHeight
      setFile({file: picked, url, ratioOff: Math.abs(ratio - CARD_RATIO) / CARD_RATIO > 0.02})
      setMessage(null)
    }
    img.onerror = () => setMessage({tone: 'critical', text: 'Die Datei ließ sich nicht als Bild öffnen.'})
    img.src = url
  }, [])

  const onDrop = useCallback(
    (event: DragEvent) => {
      event.preventDefault()
      pick(event.dataTransfer.files[0])
    },
    [pick],
  )

  const card = load.kind === 'ready' ? load.card : null
  const textChanged =
    text.dish !== (card?.dish ?? '') ||
    text.description !== (card?.description ?? '') ||
    text.descriptionEn !== (card?.descriptionEn ?? '') ||
    text.price !== (card?.price ?? '')
  const spotOutdated = Boolean(card?.exists && spot && card.restaurantId !== spot)
  const complete = Boolean(text.dish.trim() && text.description.trim() && text.descriptionEn.trim() && (file || card?.exists || card?.preview))
  const canSave = Boolean(id && spot) && load.kind === 'ready' && !saving && complete && (textChanged || Boolean(file) || spotOutdated)

  const save = useCallback(async () => {
    if (!id) return
    setSaving(true)
    setMessage(null)
    try {
      const saved = await saveMustEatCard(client, id, text, file?.file ?? null)
      setLoad({kind: 'ready', card: saved})
      setFile(null)
      setMessage({tone: 'positive', text: 'Karte gespeichert.'})
      window.dispatchEvent(new CustomEvent(MUST_EAT_CARD_SAVED, {detail: id.replace(/^drafts\./, '')}))
    } catch (error) {
      setMessage({tone: 'critical', text: (error as Error).message})
    } finally {
      setSaving(false)
    }
  }, [client, file, id, text])

  const set = (key: keyof MustEatCardText) => (event: {currentTarget: {value: string}}) =>
    setText((current) => ({...current, [key]: event.currentTarget.value}))

  const previewSrc = file?.url ?? card?.preview ?? null

  return (
    <Stack gap={6}>
      {props.renderDefault(props)}

      <Stack gap={3}>
        <Stack gap={2}>
          <Text size={1} weight="semibold">
            Karte
          </Text>
          <Text size={1} muted>
            Bild und Gericht liegen geschützt bei der App, nicht in Sanity. „Karte speichern“ wirkt sofort —
            sichtbar wird die Karte erst, wenn die Must Eat veröffentlicht ist.
          </Text>
        </Stack>

        {!spot ? (
          <Card padding={4} radius={2} border tone="transparent">
            <Text size={1} muted>
              Erst oben den Spot wählen, dann die Karte.
            </Text>
          </Card>
        ) : load.kind === 'loading' || load.kind === 'idle' ? (
          <Flex justify="center" padding={5}>
            <Spinner muted />
          </Flex>
        ) : load.kind === 'error' ? (
          <Card padding={3} radius={2} tone="critical" border>
            <Text size={1}>{load.message}</Text>
          </Card>
        ) : (
          <Card padding={4} radius={2} border>
            <Stack gap={4}>
              <Flex gap={4} wrap="wrap" align="flex-start">
                <Card
                  as="button"
                  type="button"
                  radius={2}
                  tone="transparent"
                  border
                  onClick={() => fileInput.current?.click()}
                  onDragOver={(event: DragEvent) => event.preventDefault()}
                  onDrop={onDrop}
                  style={{width: PREVIEW_WIDTH, aspectRatio: `${CARD_RATIO}`, padding: 0, overflow: 'hidden', cursor: 'pointer'}}
                  title="Karte wählen oder hierher ziehen"
                >
                  {previewSrc ? (
                    <img src={previewSrc} alt="" style={{display: 'block', width: '100%', height: '100%', objectFit: 'contain'}} />
                  ) : (
                    <Flex direction="column" align="center" justify="center" gap={3} padding={3} style={{height: '100%'}}>
                      <Text size={3} muted>
                        <ImageIcon />
                      </Text>
                      <Text size={1} muted align="center">
                        Karte hierher ziehen oder klicken
                      </Text>
                    </Flex>
                  )}
                </Card>
                <input
                  ref={fileInput}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  hidden
                  onChange={(event) => {
                    pick(event.currentTarget.files?.[0])
                    event.currentTarget.value = ''
                  }}
                />

                <Stack gap={4} flex={1} style={{minWidth: 240}}>
                  <Field label="Gericht">
                    <TextInput value={text.dish} placeholder="z. B. Banh Mi Vegan" onChange={set('dish')} />
                  </Field>
                  <Field label="Preis" hint="Optional, z. B. 12 €">
                    <TextInput value={text.price} onChange={set('price')} />
                  </Field>
                  <Button
                    icon={UploadIcon}
                    mode="ghost"
                    text={previewSrc ? 'Andere Karte wählen' : 'Karte wählen'}
                    onClick={() => fileInput.current?.click()}
                  />
                </Stack>
              </Flex>

              <Grid gridTemplateColumns={[1, 1, 2]} gap={3}>
                <Field label="Beschreibung Deutsch">
                  <TextArea rows={3} value={text.description} placeholder="Zutaten, kurz" onChange={set('description')} />
                </Field>
                <Field label="Beschreibung Englisch">
                  <TextArea rows={3} value={text.descriptionEn} placeholder="Ingredients, short" onChange={set('descriptionEn')} />
                </Field>
              </Grid>

              {file?.ratioOff ? (
                <Hint>Die Karte hat ein anderes Format als die übrigen (1026 × 1410). Gespeichert wird sie trotzdem.</Hint>
              ) : null}
              {spotOutdated ? <Hint>Die Karte gehört noch zum vorherigen Spot. Einmal speichern, dann passt es.</Hint> : null}
              {!card?.exists && !file ? (
                <Hint>Noch keine Karte. Ohne Karte lässt sich die Must Eat nicht veröffentlichen.</Hint>
              ) : null}

              {message?.tone === 'critical' ? (
                <Card padding={3} radius={2} tone="critical" border>
                  <Text size={1}>{message.text}</Text>
                </Card>
              ) : null}

              <Flex align="center" justify="space-between" gap={3}>
                <Text size={1} muted>
                  {message?.tone === 'positive' ? message.text : ''}
                </Text>
                <Button tone="primary" text={saving ? 'Speichert …' : 'Karte speichern'} disabled={!canSave} loading={saving} onClick={save} />
              </Flex>
            </Stack>
          </Card>
        )}
      </Stack>
    </Stack>
  )
}

function Field({label, hint, children}: {label: string; hint?: string; children: React.ReactNode}) {
  return (
    <Stack gap={2}>
      <Text size={1} weight="semibold">
        {label}
      </Text>
      {children}
      {hint ? (
        <Text size={1} muted>
          {hint}
        </Text>
      ) : null}
    </Stack>
  )
}

function Hint({children}: {children: React.ReactNode}) {
  return (
    <Card padding={3} radius={2} tone="caution" border>
      <Flex gap={3} align="center">
        <Text size={2}>
          <WarningOutlineIcon />
        </Text>
        <Box flex={1}>
          <Text size={1}>{children}</Text>
        </Box>
      </Flex>
    </Card>
  )
}
