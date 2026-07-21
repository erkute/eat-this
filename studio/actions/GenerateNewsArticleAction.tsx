import {useCallback, useMemo, useState} from 'react'
import {ComposeSparklesIcon} from '@sanity/icons'
import {
  Box,
  Button,
  Card,
  Checkbox,
  Flex,
  Label,
  Select,
  Spinner,
  Stack,
  Text,
  TextArea,
  useToast,
} from '@sanity/ui'
import {
  type DocumentActionDescription,
  type DocumentActionProps,
  type SanityDocument,
  useClient,
} from 'sanity'

const studioEnv = (import.meta as unknown as {
  env: {DEV?: boolean; SANITY_STUDIO_API_BASE?: string}
}).env
const API_BASE: string =
  studioEnv.SANITY_STUDIO_API_BASE ||
  (studioEnv.DEV ? 'http://localhost:3000' : 'https://www.eatthisdot.com')

type NewsCategory = 'openings' | 'guides' | 'culture'
type ArticleLength = 'short' | 'standard' | 'long'

interface PortableTextBlock {
  _key: string
  _type: 'block'
  children: Array<{
    _key: string
    _type: 'span'
    marks: string[]
    text: string
  }>
  markDefs: Array<{
    _key: string
    _type: 'link'
    blank: true
    href: string
  }>
  style: 'normal' | 'h2' | 'h3' | 'blockquote'
}

interface GeneratedArticle {
  category: NewsCategory
  categoryLabelDe: string
  categoryLabelEn: string
  content: PortableTextBlock[] | null
  contentDe: PortableTextBlock[]
  excerpt: string | null
  excerptDe: string
  heroAlt: string | null
  seo: {
    metaDescription: string
    metaDescriptionEn: string | null
    metaTitle: string
    metaTitleEn: string | null
  }
  slug: string
  sources: Array<{title: string; url: string}>
  title: string | null
  titleDe: string
}

interface NewsDocument extends SanityDocument {
  category?: NewsCategory
  categoryLabel?: string
  categoryLabelDe?: string
  content?: PortableTextBlock[]
  contentDe?: PortableTextBlock[]
  date?: string
  excerpt?: string
  excerptDe?: string
  image?: {_type?: 'image'; alt?: string; asset?: {_ref: string; _type: 'reference'}}
  seo?: {
    metaDescription?: string
    metaDescriptionEn?: string
    metaTitle?: string
    metaTitleEn?: string
  }
  slug?: {_type: 'slug'; current?: string}
  title?: string
  titleDe?: string
}

interface WriterProps {
  currentDocument: NewsDocument | null
  documentId: string
  onComplete: () => void
  onClose: () => void
}

function isEmpty(value: unknown): boolean {
  return (
    value == null ||
    value === '' ||
    (Array.isArray(value) && value.length === 0)
  )
}

function draftSeed(documentId: string, current: NewsDocument | null) {
  if (!current) return {_id: `drafts.${documentId}`, _type: 'newsArticle'}
  const {
    _createdAt: _ignoredCreatedAt,
    _id: _ignoredId,
    _rev: _ignoredRevision,
    _updatedAt: _ignoredUpdatedAt,
    ...fields
  } = current
  return {
    ...fields,
    _id: `drafts.${documentId}`,
    _type: 'newsArticle',
  }
}

function parseSourceUrls(value: string): string[] {
  return value
    .split(/\s+/)
    .map((item) => item.trim())
    .filter(Boolean)
}

async function uniqueNewsSlug(
  client: ReturnType<typeof useClient>,
  base: string,
  documentId: string,
): Promise<string> {
  const publishedId = documentId.replace(/^drafts\./, '')
  const draftId = `drafts.${publishedId}`
  const exists = (slug: string) =>
    client.fetch<number>(
      `count(*[
        _type == "newsArticle"
        && slug.current == $slug
        && !(_id in [$publishedId, $draftId])
      ])`,
      {draftId, publishedId, slug},
    )

  if ((await exists(base)) === 0) return base
  for (let suffix = 2; suffix <= 100; suffix++) {
    const suffixText = `-${suffix}`
    const candidate = `${base.slice(0, 96 - suffixText.length).replace(/-$/g, '')}${suffixText}`
    if ((await exists(candidate)) === 0) return candidate
  }
  throw new Error('Für diesen Titel konnte keine freie URL erzeugt werden.')
}

function NewsWriterDialog({currentDocument, documentId, onClose, onComplete}: WriterProps) {
  const client = useClient({apiVersion: '2024-01-01'})
  const toast = useToast()
  const initialBrief = useMemo(
    () =>
      [currentDocument?.titleDe, currentDocument?.excerptDe]
        .filter((value): value is string => Boolean(value))
        .join('\n\n'),
    [currentDocument?.excerptDe, currentDocument?.titleDe],
  )
  const [brief, setBrief] = useState(initialBrief)
  const [category, setCategory] = useState<NewsCategory>(currentDocument?.category ?? 'guides')
  const [length, setLength] = useState<ArticleLength>('standard')
  const [sourceText, setSourceText] = useState('')
  const [imageDescription, setImageDescription] = useState('')
  const [includeEnglish, setIncludeEnglish] = useState(true)
  const [overwrite, setOverwrite] = useState(false)
  const [running, setRunning] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const generate = useCallback(async () => {
    const token = client.config().token
    if (!token) {
      setError('Keine aktive Sanity-Sitzung. Studio neu laden und erneut anmelden.')
      return
    }
    if (brief.trim().length < 20) {
      setError('Das Briefing braucht mindestens 20 Zeichen.')
      return
    }

    setRunning(true)
    setError(null)
    try {
      const heroAsset = currentDocument?.image?.asset?._ref
        ? await client.getDocument<{url?: string}>(currentDocument.image.asset._ref)
        : null
      const response = await fetch(`${API_BASE}/api/admin/generate-news-article`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          brief: brief.trim(),
          category,
          heroImageUrl: heroAsset?.url ?? null,
          imageDescription: imageDescription.trim(),
          includeEnglish,
          length,
          sourceUrls: parseSourceUrls(sourceText),
        }),
      })
      const payload = (await response.json().catch(() => ({}))) as
        | GeneratedArticle
        | {message?: string; error?: string}
      if (!response.ok) {
        throw new Error(
          'message' in payload
            ? payload.message || payload.error || `HTTP ${response.status}`
            : `HTTP ${response.status}`,
        )
      }

      const generated = payload as GeneratedArticle
      const draftId = documentId.startsWith('drafts.') ? documentId : `drafts.${documentId}`
      const slug = await uniqueNewsSlug(client, generated.slug, documentId)
      await client.createIfNotExists(draftSeed(documentId.replace(/^drafts\./, ''), currentDocument))

      const fields: Record<string, unknown> = {
        category: generated.category,
        categoryLabelDe: generated.categoryLabelDe,
        contentDe: generated.contentDe,
        date: new Date().toISOString().slice(0, 10),
        excerptDe: generated.excerptDe,
        'seo.metaDescription': generated.seo.metaDescription,
        'seo.metaTitle': generated.seo.metaTitle,
        slug: {_type: 'slug', current: slug},
        titleDe: generated.titleDe,
      }
      if (generated.title) fields.title = generated.title
      if (generated.excerpt) fields.excerpt = generated.excerpt
      if (generated.content) fields.content = generated.content
      if (includeEnglish && generated.categoryLabelEn) {
        fields.categoryLabel = generated.categoryLabelEn
      }
      if (generated.seo.metaTitleEn) fields['seo.metaTitleEn'] = generated.seo.metaTitleEn
      if (generated.seo.metaDescriptionEn) {
        fields['seo.metaDescriptionEn'] = generated.seo.metaDescriptionEn
      }

      const current = currentDocument ?? ({} as NewsDocument)
      const sets = Object.fromEntries(
        Object.entries(fields).filter(([path]) => {
          if (overwrite) return true
          const value = path.split('.').reduce<unknown>((parent, segment) => {
            if (!parent || typeof parent !== 'object') return undefined
            return (parent as Record<string, unknown>)[segment]
          }, current)
          return isEmpty(value)
        }),
      )

      if (generated.heroAlt && (overwrite || !current.image?.alt)) {
        sets['image.alt'] = generated.heroAlt
      }

      let patch = client.patch(draftId)
      if (overwrite && !includeEnglish) {
        patch = patch.unset([
          'categoryLabel',
          'content',
          'excerpt',
          'seo.metaDescriptionEn',
          'seo.metaTitleEn',
          'title',
        ])
      }
      if (Object.keys(sets).some((path) => path.startsWith('seo.'))) {
        patch = patch.setIfMissing({seo: {}})
      }
      if (generated.heroAlt && !current.image) {
        patch = patch.setIfMissing({image: {_type: 'image'}})
      }
      if (Object.keys(sets).length > 0) {
        await patch.set(sets).commit({autoGenerateArrayKeys: true})
      }

      toast.push({
        status: 'success',
        title: 'AI-Entwurf eingesetzt',
        description: `${generated.sources.length} Quellen dokumentiert. Bitte Fakten, Links und Alt-Text vor dem Veröffentlichen prüfen.`,
      })
      onClose()
      onComplete()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Der Artikel konnte nicht erzeugt werden.')
    } finally {
      setRunning(false)
    }
  }, [
    brief,
    category,
    client,
    currentDocument,
    documentId,
    imageDescription,
    includeEnglish,
    length,
    onClose,
    onComplete,
    overwrite,
    sourceText,
    toast,
  ])

  return (
    <Box padding={4}>
      <Stack space={5}>
        <Card padding={3} radius={2} tone="caution">
          <Text size={1}>
            Erstellt nur einen Entwurf. Bilder, Fakten, Quellen und Formulierungen vor dem
            Veröffentlichen redaktionell prüfen.
          </Text>
        </Card>

        <Stack space={3}>
          <Label htmlFor="ai-news-brief">Briefing und gesicherte Fakten</Label>
          <TextArea
            id="ai-news-brief"
            onChange={(event) => setBrief(event.currentTarget.value)}
            placeholder="Worum geht es? Welche Fakten, Namen, Orte und Haltung müssen in den Artikel?"
            rows={8}
            value={brief}
          />
        </Stack>

        <Flex gap={4} wrap="wrap">
          <Stack flex={1} space={3}>
            <Label htmlFor="ai-news-category">Kategorie</Label>
            <Select
              id="ai-news-category"
              onChange={(event) => setCategory(event.currentTarget.value as NewsCategory)}
              value={category}
            >
              <option value="openings">Eröffnungen</option>
              <option value="guides">Guides</option>
              <option value="culture">Kultur</option>
            </Select>
          </Stack>
          <Stack flex={1} space={3}>
            <Label htmlFor="ai-news-length">Länge</Label>
            <Select
              id="ai-news-length"
              onChange={(event) => setLength(event.currentTarget.value as ArticleLength)}
              value={length}
            >
              <option value="short">Kurz</option>
              <option value="standard">Standard</option>
              <option value="long">Lang</option>
            </Select>
          </Stack>
        </Flex>

        <Stack space={3}>
          <Label htmlFor="ai-news-sources">Quellen-URLs (optional, eine pro Zeile)</Label>
          <TextArea
            id="ai-news-sources"
            onChange={(event) => setSourceText(event.currentTarget.value)}
            placeholder="https://restaurant.de/presse&#10;https://tip-berlin.de/..."
            rows={4}
            value={sourceText}
          />
        </Stack>

        <Stack space={3}>
          <Label htmlFor="ai-news-image">Bildmotiv für den Alt-Text (optional)</Label>
          <TextArea
            id="ai-news-image"
            onChange={(event) => setImageDescription(event.currentTarget.value)}
            placeholder="Nur nötig, wenn noch kein Aufmacher-Bild im Dokument liegt. Vorhandene Bilder analysiert die AI direkt."
            rows={3}
            value={imageDescription}
          />
        </Stack>

        <Stack space={3}>
          <Flex align="center" gap={3}>
            <Checkbox
              checked={includeEnglish}
              id="ai-news-english"
              onChange={(event) => setIncludeEnglish(event.currentTarget.checked)}
            />
            <Label htmlFor="ai-news-english">Englische Fassung mitgenerieren</Label>
          </Flex>
          <Flex align="center" gap={3}>
            <Checkbox
              checked={overwrite}
              id="ai-news-overwrite"
              onChange={(event) => setOverwrite(event.currentTarget.checked)}
            />
            <Label htmlFor="ai-news-overwrite">Vorhandene Text- und SEO-Felder überschreiben</Label>
          </Flex>
        </Stack>

        {error ? (
          <Card padding={3} radius={2} tone="critical">
            <Text size={1}>{error}</Text>
          </Card>
        ) : null}

        <Flex gap={3} justify="flex-end">
          <Button disabled={running} mode="ghost" onClick={onClose} text="Abbrechen" />
          <Button
            disabled={running || brief.trim().length < 20}
            icon={ComposeSparklesIcon}
            onClick={generate}
            text={running ? 'Recherchiert und schreibt…' : 'AI-Entwurf erstellen'}
            tone="primary"
          />
          {running ? (
            <Flex align="center" gap={2}>
              <Spinner muted />
              <Text muted size={1}>
                Quellen werden geprüft, danach entstehen DE/EN-Text und SEO-Felder.
              </Text>
            </Flex>
          ) : null}
        </Flex>
      </Stack>
    </Box>
  )
}

export default function GenerateNewsArticleAction(
  props: DocumentActionProps,
): DocumentActionDescription | null {
  const [dialogOpen, setDialogOpen] = useState(false)
  if (props.type !== 'newsArticle') return null

  return {
    dialog: dialogOpen
      ? {
          content: (
            <NewsWriterDialog
              currentDocument={(props.draft ?? props.published) as NewsDocument | null}
              documentId={props.id}
              onClose={() => setDialogOpen(false)}
              onComplete={props.onComplete}
            />
          ),
          header: 'AI-News-Assistent',
          onClose: () => setDialogOpen(false),
          showCloseButton: true,
          type: 'dialog',
          width: 'medium',
        }
      : false,
    disabled: !props.ready,
    icon: ComposeSparklesIcon,
    label: 'Mit AI schreiben',
    onHandle: () => setDialogOpen(true),
  }
}
