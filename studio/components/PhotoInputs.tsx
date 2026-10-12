import {useCallback, useState} from 'react'
import {Box, Button, Card, Flex, Stack, Text} from '@sanity/ui'
import {LinkIcon, WarningOutlineIcon} from '@sanity/icons'
import {
  insert,
  set,
  setIfMissing,
  useFormValue,
  type ArrayOfObjectsInputProps,
  type ObjectInputProps,
} from 'sanity'
import {PhotoFromUrlDialog, type PhotoFromUrlResult} from './PhotoFromUrlDialog'
import {OWN_PHOTO_CREDIT, OWN_PHOTO_URL} from '../lib/ownPhoto'

// Spiegel von FIRST_PARTY_RESTAURANT_PHOTO_SLUGS in
// nextjs/lib/sanity-image-presets.ts — beim Ändern beide Stellen.
const FIRST_PARTY_PHOTO_SLUGS = ['bar-basta', 'sardinen-bar']

type PhotoValue = {asset?: {_ref?: string}; credit?: string; creditUrl?: string}

function imageValue({assetId, credit, creditUrl, alt}: PhotoFromUrlResult) {
  return {
    _type: 'image',
    asset: {_type: 'reference', _ref: assetId},
    credit,
    creditUrl,
    ...(alt ? {alt} : {}),
  }
}

function newKey(): string {
  return crypto.randomUUID().replace(/-/g, '').slice(0, 12)
}

/**
 * Titelfoto eines Spots: oben der Knopf „Foto per Link“, darunter das normale
 * Bildfeld (Hochladen, Ziehen, Ausschnitt). Fehlt Credit oder Quellen-Link,
 * sagt ein Hinweis, dass die Website das Foto dann nicht zeigt.
 */
export function SpotPhotoInput(props: ObjectInputProps) {
  const [open, setOpen] = useState(false)
  const {onChange} = props
  const value = props.value as PhotoValue | undefined
  const slug = useFormValue(['slug', 'current']) as string | undefined
  const instagramHandle = useFormValue(['instagramHandle']) as string | undefined

  const handleSelect = useCallback(
    (result: PhotoFromUrlResult) => {
      onChange(set(imageValue(result)))
      setOpen(false)
    },
    [onChange],
  )

  const markAsOwn = useCallback(
    () => onChange([set(OWN_PHOTO_CREDIT, ['credit']), set(OWN_PHOTO_URL, ['creditUrl'])]),
    [onChange],
  )

  const hasAsset = Boolean(value?.asset?._ref)
  const creditComplete = Boolean(value?.credit && value?.creditUrl)
  const exempt = Boolean(instagramHandle) || FIRST_PARTY_PHOTO_SLUGS.includes(slug ?? '')
  const hidden = hasAsset && !creditComplete && !exempt

  return (
    <Stack gap={3}>
      <Flex gap={2} wrap="wrap">
        <Button
          icon={LinkIcon}
          mode="ghost"
          text={hasAsset ? 'Anderes Foto per Link' : 'Foto per Link einfügen'}
          onClick={() => setOpen(true)}
        />
      </Flex>
      {hidden ? (
        <Card padding={3} radius={2} tone="caution" border>
          <Flex gap={3} align="center" wrap="wrap">
            <Text size={2}>
              <WarningOutlineIcon />
            </Text>
            <Box flex={1} style={{minWidth: 220}}>
              <Text size={1}>
                Ohne Copyright <strong>und</strong> Link zur Quelle zeigt die Website dieses Foto
                nicht. Beides unten ergänzen.
              </Text>
            </Box>
            <Button mode="ghost" fontSize={1} text="Als eigenes Foto eintragen" onClick={markAsOwn} />
          </Flex>
        </Card>
      ) : null}
      {props.renderDefault(props)}
      {open ? (
        <PhotoFromUrlDialog
          title="Titelfoto per Link"
          warnBelowWidth={1200}
          onClose={() => setOpen(false)}
          onSelect={handleSelect}
        />
      ) : null}
    </Stack>
  )
}

/** Galerie: Fotos per Link landen hinten in der Reihe. */
export function GalleryInput(props: ArrayOfObjectsInputProps) {
  const [open, setOpen] = useState(false)
  const {onChange} = props

  const handleSelect = useCallback(
    (result: PhotoFromUrlResult) => {
      onChange([setIfMissing([]), insert([{_key: newKey(), ...imageValue(result)}], 'after', [-1])])
      setOpen(false)
    },
    [onChange],
  )

  return (
    <Stack gap={3}>
      <Flex gap={2} wrap="wrap">
        <Button icon={LinkIcon} mode="ghost" text="Foto per Link hinzufügen" onClick={() => setOpen(true)} />
      </Flex>
      {props.renderDefault(props)}
      {open ? (
        <PhotoFromUrlDialog
          title="Galerie-Foto per Link"
          askAlt
          onClose={() => setOpen(false)}
          onSelect={handleSelect}
        />
      ) : null}
    </Stack>
  )
}
