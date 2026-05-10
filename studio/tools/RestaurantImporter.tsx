import {useCallback, useState} from 'react'
import {Box, Button, Card, Container, Heading, Inline, Spinner, Stack, Text, TextInput} from '@sanity/ui'
import {useRouter} from 'sanity/router'

const API_BASE: string = (import.meta as unknown as {env: {MODE: string}}).env.MODE === 'production'
  ? 'https://www.eatthisdot.com'
  : 'http://localhost:3000'

const IMPORT_SECRET: string | undefined = (import.meta as unknown as {
  env: {SANITY_STUDIO_IMPORT_SECRET?: string}
}).env.SANITY_STUDIO_IMPORT_SECRET

type Status =
  | {kind: 'idle'}
  | {kind: 'loading'}
  | {kind: 'error'; message: string; hint?: string}
  | {kind: 'success'; name: string}

export default function RestaurantImporter() {
  const router = useRouter()
  const [url, setUrl] = useState('')
  const [status, setStatus] = useState<Status>({kind: 'idle'})

  const handleSubmit = useCallback(
    async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault()
      const trimmed = url.trim()
      if (!trimmed) {
        setStatus({kind: 'error', message: 'URL is required.'})
        return
      }
      if (!IMPORT_SECRET) {
        setStatus({
          kind: 'error',
          message: 'SANITY_STUDIO_IMPORT_SECRET is not set in studio/.env.local.',
        })
        return
      }
      setStatus({kind: 'loading'})
      try {
        const res = await fetch(`${API_BASE}/api/admin/import-restaurant`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${IMPORT_SECRET}`,
          },
          body: JSON.stringify({url: trimmed}),
        })
        const payload = await res.json().catch(() => ({}))
        if (!res.ok) {
          setStatus({
            kind: 'error',
            message: payload.error ?? `HTTP ${res.status}`,
            hint: payload.hint,
          })
          return
        }
        const {docId, name} = payload as {docId: string; name: string}
        setStatus({kind: 'success', name})
        // Navigate to the freshly created draft via Sanity's structure intent.
        // Strip the "drafts." prefix — intents resolve to the published id and
        // open the draft pane when one exists.
        const baseId = docId.replace(/^drafts\./, '')
        router.navigateIntent('edit', {id: baseId, type: 'restaurant'})
      } catch (err) {
        setStatus({kind: 'error', message: (err as Error).message})
      }
    },
    [router, url],
  )

  const isLoading = status.kind === 'loading'

  return (
    <Container width={1} padding={4}>
      <Stack space={4}>
        <Stack space={2}>
          <Heading as="h1" size={3}>
            Import Restaurant from Google Maps
          </Heading>
          <Text muted>
            Paste a Google Maps URL — short links (maps.app.goo.gl/X) are fine. The importer
            pulls Places data, downloads the photo, and runs the AI generators for description,
            EN translations, and SEO meta. Takes ~30 seconds.
          </Text>
        </Stack>
        <Card padding={4} radius={3} shadow={1}>
          <form onSubmit={handleSubmit}>
            <Stack space={3}>
              <TextInput
                value={url}
                onChange={(e) => setUrl(e.currentTarget.value)}
                placeholder="https://maps.app.goo.gl/..."
                disabled={isLoading}
                style={{fontFamily: 'monospace'}}
              />
              <Box>
                <Button
                  type="submit"
                  text={isLoading ? 'Importing…' : 'Import & open draft'}
                  tone="primary"
                  disabled={isLoading || !url.trim()}
                />
              </Box>
              {isLoading && (
                <Inline space={2}>
                  <Spinner muted />
                  <Text muted size={1}>
                    Resolving URL → Places API → photo upload → AI generators (~30 s)…
                  </Text>
                </Inline>
              )}
              {status.kind === 'error' && (
                <Card padding={3} radius={2} tone="critical">
                  <Stack space={2}>
                    <Text weight="semibold">{status.message}</Text>
                    {status.hint && <Text size={1}>{status.hint}</Text>}
                  </Stack>
                </Card>
              )}
              {status.kind === 'success' && (
                <Card padding={3} radius={2} tone="positive">
                  <Text>Imported {status.name}. Opening draft…</Text>
                </Card>
              )}
            </Stack>
          </form>
        </Card>
      </Stack>
    </Container>
  )
}
