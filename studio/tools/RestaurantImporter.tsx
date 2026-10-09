import {useCallback, useState} from 'react'
import {Box, Button, Card, Container, Heading, Inline, Spinner, Stack, Text, TextArea} from '@sanity/ui'
import {useClient} from 'sanity'
import {useRouter} from 'sanity/router'

import {APP_API_BASE} from '../lib/appApi'

// The Studio forwards its short-lived Sanity session token to the first-party
// import endpoint. The endpoint performs all Sanity operations with that same
// token, so no write secret is bundled and the current user's role remains the
// authorization boundary.

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
    const res = await fetch(`${APP_API_BASE}/api/admin/import-restaurant`, {
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
          ? 'Der Import ist für diese Umgebung nicht eingerichtet.'
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
      hint: 'Der Import-Dienst ist nicht erreichbar. Verbindung prüfen und erneut versuchen.',
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
          results: [{url: '', status: 'error', message: 'Mindestens einen Google-Maps-Link einfügen.'}],
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
              message: 'Keine aktive Sanity-Sitzung. Studio neu laden und erneut anmelden.',
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
      <Stack gap={4}>
        <Stack gap={2}>
          <Heading as="h1" size={3}>
            Spots aus Google Maps importieren
          </Heading>
          <Text muted>
            Einen Google-Maps-Link pro Zeile, Kurzlinks (maps.app.goo.gl/…) gehen auch. Pro Link
            dauert es etwa eine Minute: Ort nachschlagen, Foto hochladen, recherchieren, Texte
            schreiben. Der Spot ist danach direkt live — unten in der Liste öffnen und prüfen.
          </Text>
        </Stack>
        <Card padding={4} radius={3} shadow={1}>
          <form onSubmit={handleSubmit}>
            <Stack gap={3}>
              <TextArea
                value={input}
                onChange={(e) => setInput(e.currentTarget.value)}
                placeholder={'https://maps.app.goo.gl/...\nhttps://maps.app.goo.gl/...\nhttps://maps.app.goo.gl/...'}
                rows={6}
                disabled={isLoading}
                style={{fontFamily: 'monospace', fontSize: 13}}
              />
              <Inline gap={3}>
                <Button
                  type="submit"
                  text={
                    isLoading
                      ? `Importiere ${status.current} von ${status.total} …`
                      : urlCount > 1
                        ? `${urlCount} Spots importieren`
                        : 'Spot importieren'
                  }
                  tone="primary"
                  disabled={isLoading || urlCount === 0}
                />
                {urlCount > 0 && !isLoading && (
                  <Text muted size={1}>
                    {urlCount} {urlCount === 1 ? 'Link' : 'Links'} erkannt
                  </Text>
                )}
              </Inline>
              {isLoading && (
                <Inline gap={2}>
                  <Spinner muted />
                  <Text muted size={1}>
                    Link auflösen → Google Places → Foto hochladen → Texte schreiben …
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
    <Stack gap={3}>
      <Text size={1} muted>
        {inProgress ? 'Läuft' : 'Fertig'} — {successes} importiert
        {failures > 0 ? `, ${failures} fehlgeschlagen` : ''}
      </Text>
      <Stack gap={2}>
        {results.map((r, i) => (
          <Card
            key={`${r.url || 'empty'}-${i}`}
            padding={3}
            radius={2}
            tone={r.status === 'success' ? 'positive' : 'critical'}
          >
            <Stack gap={2}>
              <Inline gap={3}>
                <Text weight="semibold">
                  {r.status === 'success' ? '✓' : '✗'} {r.name ?? r.url ?? 'kein Link'}
                </Text>
                {r.status === 'success' && r.docId && (
                  <Button
                    mode="ghost"
                    text="Öffnen"
                    fontSize={1}
                    onClick={() => onOpen(r.docId!)}
                  />
                )}
              </Inline>
              {r.status === 'error' && (
                <Stack gap={1}>
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
