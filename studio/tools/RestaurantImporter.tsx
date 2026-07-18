import {useCallback, useState} from 'react'
import {Box, Button, Card, Container, Heading, Inline, Spinner, Stack, Text, TextArea} from '@sanity/ui'
import {useClient} from 'sanity'
import {useRouter} from 'sanity/router'

// The Studio forwards its short-lived Sanity session token to the first-party
// import endpoint. The endpoint performs all Sanity operations with that same
// token, so no write secret is bundled and the current user's role remains the
// authorization boundary.
const studioEnv = (import.meta as unknown as {
  env: {DEV?: boolean; SANITY_STUDIO_API_BASE?: string}
}).env
const API_BASE: string =
  studioEnv.SANITY_STUDIO_API_BASE ||
  (studioEnv.DEV ? 'http://localhost:3000' : 'https://www.eatthisdot.com')

interface ImportResult {
  url: string
  status: 'success' | 'error'
  name?: string
  docId?: string
  message?: string
  hint?: string
}

type Status =
  | {kind: 'idle'}
  | {kind: 'running'; current: number; total: number; results: ImportResult[]}
  | {kind: 'done'; results: ImportResult[]}

/** Splits a textarea blob into trimmed, non-empty URLs. Tolerates leading
 *  bullets/whitespace so users can paste from chat / lists without cleanup. */
function parseUrls(blob: string): string[] {
  return blob
    .split(/\r?\n/)
    .map((line) => line.replace(/^[\s•·\-*\d.)]+/, '').trim())
    .filter((line) => /^https?:\/\//i.test(line))
}

async function importOne(url: string, token: string): Promise<ImportResult> {
  try {
    const res = await fetch(`${API_BASE}/api/admin/import-restaurant`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({url}),
    })
    const payload = await res.json().catch(() => ({}))
    if (!res.ok) {
      const hint =
        res.status === 404
          ? 'The import service is not deployed for this environment.'
          : payload.hint
      return {
        url,
        status: 'error',
        message: payload.message ?? payload.error ?? `HTTP ${res.status}`,
        hint,
      }
    }
    return {url, status: 'success', name: payload.name, docId: payload.docId}
  } catch (err) {
    return {
      url,
      status: 'error',
      message: (err as Error).message,
      hint: 'Could not reach the import service. Check the app deployment and your connection.',
    }
  }
}

export default function RestaurantImporter() {
  const client = useClient({apiVersion: '2024-01-01'})
  const router = useRouter()
  const [input, setInput] = useState('')
  const [status, setStatus] = useState<Status>({kind: 'idle'})

  const handleSubmit = useCallback(
    async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault()
      const urls = parseUrls(input)
      if (urls.length === 0) {
        setStatus({
          kind: 'done',
          results: [{url: '', status: 'error', message: 'Paste at least one Maps URL.'}],
        })
        return
      }
      const token = client.config().token
      if (!token) {
        setStatus({
          kind: 'done',
          results: [
            {
              url: '',
              status: 'error',
              message: 'No active Sanity session. Reload Studio and sign in again.',
            },
          ],
        })
        return
      }
      const results: ImportResult[] = []
      // Sequential rather than Promise.all — keeps Places + Anthropic
      // rate-limit pressure low and gives clear "Importing N/M" progress.
      for (let i = 0; i < urls.length; i++) {
        setStatus({kind: 'running', current: i + 1, total: urls.length, results: [...results]})
        const r = await importOne(urls[i], token)
        results.push(r)
      }
      setStatus({kind: 'done', results})
    },
    [client, input],
  )

  const openDoc = useCallback(
    (docId: string) => {
      const baseId = docId.replace(/^drafts\./, '')
      router.navigateIntent('edit', {id: baseId, type: 'restaurant'})
    },
    [router],
  )

  const isLoading = status.kind === 'running'
  const urlCount = parseUrls(input).length

  return (
    <Container width={1} padding={4}>
      <Stack space={4}>
        <Stack space={2}>
          <Heading as="h1" size={3}>
            Import Restaurants from Google Maps
          </Heading>
          <Text muted>
            Paste one Maps URL per line — short links (maps.app.goo.gl/X) work too. Each URL
            takes ~1 minute (Places lookup, photo upload, web research on Berlin food editorials,
            AI generators) and publishes the restaurant directly. Open it from the result list
            below to review or edit. Access follows your current Sanity role.
          </Text>
        </Stack>
        <Card padding={4} radius={3} shadow={1}>
          <form onSubmit={handleSubmit}>
            <Stack space={3}>
              <TextArea
                value={input}
                onChange={(e) => setInput(e.currentTarget.value)}
                placeholder={'https://maps.app.goo.gl/...\nhttps://maps.app.goo.gl/...\nhttps://maps.app.goo.gl/...'}
                rows={6}
                disabled={isLoading}
                style={{fontFamily: 'monospace', fontSize: 13}}
              />
              <Inline space={3}>
                <Button
                  type="submit"
                  text={
                    isLoading
                      ? `Importing ${status.current}/${status.total}…`
                      : urlCount > 1
                        ? `Import ${urlCount} restaurants`
                        : 'Import restaurant'
                  }
                  tone="primary"
                  disabled={isLoading || urlCount === 0}
                />
                {urlCount > 0 && !isLoading && (
                  <Text muted size={1}>
                    {urlCount} URL{urlCount === 1 ? '' : 's'} detected
                  </Text>
                )}
              </Inline>
              {isLoading && (
                <Inline space={2}>
                  <Spinner muted />
                  <Text muted size={1}>
                    Resolving URL → Places API → photo upload → AI generators…
                  </Text>
                </Inline>
              )}
            </Stack>
          </form>
        </Card>

        {(status.kind === 'running' || status.kind === 'done') && status.results.length > 0 && (
          <ResultsList
            results={status.results}
            onOpen={openDoc}
            inProgress={status.kind === 'running'}
          />
        )}
      </Stack>
    </Container>
  )
}

function ResultsList({
  results,
  onOpen,
  inProgress,
}: {
  results: ImportResult[]
  onOpen: (docId: string) => void
  inProgress: boolean
}) {
  const successes = results.filter((r) => r.status === 'success').length
  const failures = results.length - successes
  return (
    <Stack space={3}>
      <Text size={1} muted>
        {inProgress ? 'In progress' : 'Done'} — {successes} imported
        {failures > 0 ? `, ${failures} failed` : ''}
      </Text>
      <Stack space={2}>
        {results.map((r, i) => (
          <Card
            key={`${r.url || 'empty'}-${i}`}
            padding={3}
            radius={2}
            tone={r.status === 'success' ? 'positive' : 'critical'}
          >
            <Stack space={2}>
              <Inline space={3}>
                <Text weight="semibold">
                  {r.status === 'success' ? '✓' : '✗'} {r.name ?? r.url ?? 'no URL'}
                </Text>
                {r.status === 'success' && r.docId && (
                  <Button
                    mode="ghost"
                    text="Open"
                    fontSize={1}
                    onClick={() => onOpen(r.docId!)}
                  />
                )}
              </Inline>
              {r.status === 'error' && (
                <Stack space={1}>
                  <Text size={1}>{r.message}</Text>
                  {r.hint && (
                    <Text size={1} muted>
                      {r.hint}
                    </Text>
                  )}
                  {r.url && (
                    <Box style={{fontFamily: 'monospace', fontSize: 11, opacity: 0.6, wordBreak: 'break-all'}}>
                      {r.url}
                    </Box>
                  )}
                </Stack>
              )}
            </Stack>
          </Card>
        ))}
      </Stack>
    </Stack>
  )
}
