import {useCallback, useEffect, useId, useRef, useState} from 'react'
import {Box, Button, Card, Checkbox, Dialog, Flex, Stack, Text, TextInput} from '@sanity/ui'
import {ArrowLeftIcon, CheckmarkIcon, DownloadIcon} from '@sanity/icons'
import {useClient} from 'sanity'
import {importImageFromUrl, type ImportedImage} from '../lib/importImage'
import {OWN_PHOTO_CREDIT, OWN_PHOTO_URL} from '../lib/ownPhoto'

export interface PhotoFromUrlResult {
  assetId: string
  credit: string
  creditUrl: string
  alt?: string
}

interface Props {
  title: string
  /** Fragt zusätzlich, was zu sehen ist (Galerie). */
  askAlt?: boolean
  /** Unter dieser Breite (Pixel) warnt der Dialog, dass das Foto unscharf wirkt. */
  warnBelowWidth?: number
  onClose: () => void
  onSelect: (result: PhotoFromUrlResult) => void
}

/** „Max Muster“ → „Foto: Max Muster“; was schon ein Label trägt, bleibt. */
export function normalizeCredit(raw: string): string {
  const credit = raw.trim().replace(/\s+/g, ' ')
  if (!credit) return ''
  if (/^(foto|photo|bild|©|\(c\))/i.test(credit) || credit.includes(':')) return credit
  return `Foto: ${credit}`
}

function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value.trim())
    return url.protocol === 'https:' || url.protocol === 'http:'
  } catch {
    return false
  }
}

type Step =
  | {kind: 'form'; error?: string}
  | {kind: 'loading'}
  | {kind: 'preview'; image: ImportedImage}

export function PhotoFromUrlDialog({title, askAlt, warnBelowWidth, onClose, onSelect}: Props) {
  const client = useClient({apiVersion: '2024-01-01'})
  const dialogId = useId()
  const [link, setLink] = useState('')
  // Vorgabe: eigenes Foto. Fremde Fotos bekommen das Copyright der Quelle.
  const [own, setOwn] = useState(true)
  const [credit, setCredit] = useState('')
  const [sourceUrl, setSourceUrl] = useState('')
  const [alt, setAlt] = useState('')
  const [step, setStep] = useState<Step>({kind: 'form'})
  const linkRef = useRef<HTMLInputElement>(null)
  const sourceRef = useRef<HTMLInputElement>(null)
  // Ein hochgeladenes, aber nicht übernommenes Foto wird beim Schließen wieder gelöscht.
  const pendingAsset = useRef<string | null>(null)
  // Den Quellen-Link, den der Dialog selbst eingesetzt hat, nimmt „Anderes Foto“ wieder raus.
  const autoSourceUrl = useRef('')

  useEffect(() => {
    linkRef.current?.focus()
  }, [])

  // Fehlt nach dem Holen der Quellen-Link, steht der Cursor gleich darin.
  const isPreview = step.kind === 'preview'
  useEffect(() => {
    if (isPreview && !sourceRef.current?.value) sourceRef.current?.focus()
  }, [isPreview])

  const discardPending = useCallback(() => {
    const assetId = pendingAsset.current
    pendingAsset.current = null
    if (assetId) client.delete(assetId).catch(() => undefined)
  }, [client])

  const handleClose = useCallback(() => {
    discardPending()
    onClose()
  }, [discardPending, onClose])

  const effectiveCredit = own ? OWN_PHOTO_CREDIT : normalizeCredit(credit)
  const canFetch = isHttpUrl(link) && effectiveCredit.length > 0

  const handleFetch = useCallback(
    async (event?: {preventDefault: () => void}) => {
      event?.preventDefault()
      if (!canFetch) return
      setStep({kind: 'loading'})
      try {
        const image = await importImageFromUrl(client, link.trim(), effectiveCredit)
        pendingAsset.current = image.assetId
        // Eigene Fotos verlinken auf die Website. Bei fremden verrät nur ein
        // Seiten-Link die Quelle; hinter einem Bild-Link steckt oft ein CDN —
        // den Link trägt man dann selbst ein.
        const autoSource = own ? OWN_PHOTO_URL : image.pageUrl
        if (!sourceUrl.trim() && autoSource) {
          autoSourceUrl.current = autoSource
          setSourceUrl(autoSource)
        }
        setStep({kind: 'preview', image})
      } catch (error) {
        setStep({kind: 'form', error: (error as Error).message})
      }
    },
    [canFetch, client, effectiveCredit, link, own, sourceUrl],
  )

  const handleBack = useCallback(() => {
    discardPending()
    setSourceUrl((current) => (current === autoSourceUrl.current ? '' : current))
    autoSourceUrl.current = ''
    setStep({kind: 'form'})
  }, [discardPending])

  const canConfirm = isHttpUrl(sourceUrl)

  const handleConfirm = useCallback(() => {
    if (step.kind !== 'preview' || !canConfirm) return
    pendingAsset.current = null
    onSelect({
      assetId: step.image.assetId,
      credit: effectiveCredit,
      creditUrl: sourceUrl.trim(),
      ...(askAlt && alt.trim() ? {alt: alt.trim()} : {}),
    })
  }, [alt, askAlt, canConfirm, effectiveCredit, onSelect, sourceUrl, step])

  return (
    <Dialog
      id={dialogId}
      header={title}
      width={1}
      onClose={handleClose}
      footer={
        <Box padding={3}>
          {step.kind === 'preview' ? (
            <Flex gap={2} justify="space-between">
              <Button mode="bleed" icon={ArrowLeftIcon} text="Anderes Foto" onClick={handleBack} />
              <Button
                tone="primary"
                icon={CheckmarkIcon}
                text="Foto übernehmen"
                disabled={!canConfirm}
                onClick={handleConfirm}
              />
            </Flex>
          ) : (
            <Flex gap={2} justify="flex-end">
              <Button mode="bleed" text="Abbrechen" onClick={handleClose} />
              <Button
                tone="primary"
                icon={DownloadIcon}
                text={step.kind === 'loading' ? 'Foto wird geholt …' : 'Foto holen'}
                loading={step.kind === 'loading'}
                disabled={!canFetch || step.kind === 'loading'}
                onClick={() => handleFetch()}
              />
            </Flex>
          )}
        </Box>
      }
    >
      <Box padding={4}>
        {step.kind === 'preview' ? (
          <Stack gap={4}>
            <Card radius={3} overflow="hidden" tone="transparent" border>
              <img
                src={`${step.image.previewUrl}?w=900&fit=max&auto=format`}
                alt=""
                style={{display: 'block', width: '100%', maxHeight: 260, objectFit: 'contain'}}
              />
            </Card>
            <Stack gap={2}>
              <Text size={1} muted>
                So steht es unter dem Foto
              </Text>
              <Text weight="semibold">{effectiveCredit}</Text>
              {step.image.width && step.image.height ? (
                <Text size={1} muted>
                  {step.image.width} × {step.image.height} Pixel
                  {warnBelowWidth && step.image.width < warnBelowWidth
                    ? ' · eher klein, wirkt im Kopf der Spot-Seite unscharf'
                    : ''}
                </Text>
              ) : null}
            </Stack>
            <Field
              label="Link zur Quelle"
              hint="Wohin der Credit führt, z. B. Website oder Instagram des Fotografen. Ohne den Link zeigt die Website das Foto nicht."
            >
              <TextInput
                ref={sourceRef}
                value={sourceUrl}
                placeholder="https://"
                onChange={(e) => setSourceUrl(e.currentTarget.value)}
              />
            </Field>
            {askAlt ? (
              <Field label="Was ist zu sehen?" hint="Kurz, für Google und Screenreader. Optional.">
                <TextInput
                  value={alt}
                  placeholder="z. B. Pasta mit Salbeibutter auf hellem Teller"
                  onChange={(e) => setAlt(e.currentTarget.value)}
                />
              </Field>
            ) : null}
          </Stack>
        ) : (
          <form onSubmit={handleFetch}>
            <Stack gap={4}>
              <Field
                label="Link zum Foto oder zur Seite"
                hint="Rechtsklick aufs Bild → „Bildadresse kopieren“. Ein Link auf eine Seite geht auch, dann kommt deren Vorschaubild."
              >
                <TextInput
                  ref={linkRef}
                  value={link}
                  placeholder="https://"
                  disabled={step.kind === 'loading'}
                  onChange={(e) => setLink(e.currentTarget.value)}
                />
              </Field>
              <Flex gap={3} align="flex-start">
                <Checkbox
                  id={`${dialogId}-own`}
                  checked={own}
                  disabled={step.kind === 'loading'}
                  onChange={(e) => setOwn(e.currentTarget.checked)}
                  style={{marginTop: 2}}
                />
                <Stack gap={2} flex={1}>
                  <Text as="label" htmlFor={`${dialogId}-own`} size={1} weight="semibold">
                    Eigenes Foto
                  </Text>
                  <Text size={1} muted>
                    Darunter steht „{OWN_PHOTO_CREDIT}“, der Link führt auf eatthisdot.com.
                  </Text>
                </Stack>
              </Flex>
              {own ? null : (
                <Field
                  label="Copyright"
                  hint="Name des Fotografen oder Betriebs. „Foto:“ setzen wir selbst davor."
                >
                  <TextInput
                    value={credit}
                    placeholder="z. B. Max Muster"
                    disabled={step.kind === 'loading'}
                    onChange={(e) => setCredit(e.currentTarget.value)}
                  />
                </Field>
              )}
              {step.kind === 'form' && step.error ? (
                <Card padding={3} radius={2} tone="critical" border>
                  <Text size={1}>{step.error}</Text>
                </Card>
              ) : null}
              {/* Enter im Feld schickt das Formular ab; dafür braucht es einen Submit-Knopf. */}
              <button
                type="submit"
                tabIndex={-1}
                aria-hidden
                style={{position: 'absolute', width: 1, height: 1, opacity: 0, pointerEvents: 'none'}}
              />
            </Stack>
          </form>
        )}
      </Box>
    </Dialog>
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
