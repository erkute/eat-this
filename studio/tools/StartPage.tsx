import {useCallback, useEffect, useMemo, useState} from 'react'
import {Badge, Box, Button, Card, Container, Flex, Grid, Heading, Spinner, Stack, Text} from '@sanity/ui'
import {
  AddIcon,
  DocumentTextIcon,
  DownloadIcon,
  EditIcon,
  ErrorOutlineIcon,
  ImageIcon,
  PinIcon,
  TagIcon,
  WarningOutlineIcon,
} from '@sanity/icons'
import {useClient, useCurrentUser} from 'sanity'
import {useRouter} from 'sanity/router'
import {DASHBOARD_PARAMS, DASHBOARD_QUERY} from '../structure/queries'

interface DraftRow {
  _id: string
  _type: string
  _updatedAt: string
  title: string | null
  isNew: boolean
}

interface Dashboard {
  spots: number
  articles: number
  mustEats: number
  bezirke: number
  categories: number
  pages: number
  drafts: DraftRow[]
  noPhoto: number
  photoHidden: number
  noTip: number
  noCategory: number
  tempClosed: number
  closed: number
}

const TYPE_LABEL: Record<string, string> = {
  restaurant: 'Spot',
  newsArticle: 'Artikel',
  mustEat: 'Must Eat',
  bezirk: 'Bezirk',
  category: 'Kategorie',
  staticPage: 'Seite',
}

const relative = new Intl.RelativeTimeFormat('de', {numeric: 'auto'})
function ago(iso: string): string {
  const minutes = Math.round((new Date(iso).getTime() - Date.now()) / 60000)
  if (Math.abs(minutes) < 60) return relative.format(minutes, 'minute')
  const hours = Math.round(minutes / 60)
  if (Math.abs(hours) < 24) return relative.format(hours, 'hour')
  return relative.format(Math.round(hours / 24), 'day')
}

function greeting(): string {
  const hour = new Date().getHours()
  if (hour < 11) return 'Guten Morgen'
  if (hour < 18) return 'Hallo'
  return 'Guten Abend'
}

export default function StartPage() {
  const client = useClient({apiVersion: '2024-01-01'})
  const router = useRouter()
  const user = useCurrentUser()
  const [data, setData] = useState<Dashboard | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(() => {
    client
      .fetch<Dashboard>(DASHBOARD_QUERY, DASHBOARD_PARAMS)
      .then((result) => {
        setData(result)
        setError(null)
      })
      .catch((err: Error) => setError(err.message))
  }, [client])

  // Neu laden, sobald sich im Bestand etwas tut — gebündelt, damit eine
  // Veröffentlichung mit vielen Änderungen nur eine Abfrage auslöst.
  useEffect(() => {
    load()
    let timer: ReturnType<typeof setTimeout> | undefined
    const subscription = client
      .listen('*[_type in $types]', {types: Object.keys(TYPE_LABEL)}, {includeResult: false, visibility: 'query'})
      .subscribe(() => {
        clearTimeout(timer)
        timer = setTimeout(load, 1200)
      })
    return () => {
      clearTimeout(timer)
      subscription.unsubscribe()
    }
  }, [client, load])

  const openDocument = useCallback(
    (id: string, type: string) => router.navigateIntent('edit', {id: id.replace(/^drafts\./, ''), type}),
    [router],
  )
  const createDocument = useCallback((type: string) => router.navigateIntent('create', {type}), [router])
  const openList = useCallback((path: string) => router.navigateUrl({path: `/structure/${path}`}), [router])
  const openTool = useCallback((tool: string) => router.navigateUrl({path: `/${tool}`}), [router])

  const tasks = useMemo(
    () =>
      data
        ? [
            {
              key: 'foto-unsichtbar',
              icon: ErrorOutlineIcon,
              count: data.photoHidden,
              title: 'Foto wird nicht gezeigt',
              text: 'Copyright oder Link zur Quelle fehlt.',
            },
            {key: 'ohne-foto', icon: ImageIcon, count: data.noPhoto, title: 'Ohne Titelfoto', text: 'Die Spot-Seite startet ohne Bild.'},
            {key: 'ohne-kategorie', icon: TagIcon, count: data.noCategory, title: 'Ohne Kategorie', text: 'Fehlt auf allen Kategorieseiten.'},
            {key: 'ohne-tipp', icon: DocumentTextIcon, count: data.noTip, title: 'Ohne Insider-Tipp', text: 'Das Popup auf der Map bleibt leer.'},
            {
              key: 'voruebergehend-zu',
              icon: WarningOutlineIcon,
              count: data.tempClosed,
              title: 'Vorübergehend zu',
              text: 'Ab und zu prüfen, ob wieder offen.',
            },
          ]
        : [],
    [data],
  )

  const firstName = user?.name?.split(' ')[0]

  return (
    <Container width={3} padding={[3, 4, 5]}>
      <Stack gap={5}>
        <Flex align="center" gap={4} wrap="wrap" justify="space-between">
          <Flex align="center" gap={3}>
            <img src="/static/eat-this-icon.webp" alt="" width={48} height={48} style={{borderRadius: 10}} />
            <Stack gap={2}>
              <Heading as="h1" size={3}>
                {greeting()}
                {firstName ? `, ${firstName}` : ''}
              </Heading>
              <Text muted size={1}>
                Redaktion von eatthisdot.com
              </Text>
            </Stack>
          </Flex>
          <Flex gap={2} wrap="wrap">
            <Button icon={AddIcon} text="Neuer Spot" tone="primary" onClick={() => createDocument('restaurant')} />
            <Button icon={DownloadIcon} text="Spot aus Google Maps" mode="ghost" onClick={() => openTool('restaurant-importer')} />
            <Button icon={EditIcon} text="Neuer Artikel" mode="ghost" onClick={() => createDocument('newsArticle')} />
          </Flex>
        </Flex>

        {error ? (
          <Card padding={4} radius={3} tone="critical" border>
            <Text>Die Übersicht ließ sich nicht laden: {error}</Text>
          </Card>
        ) : null}

        {!data && !error ? (
          <Flex justify="center" padding={6}>
            <Spinner muted />
          </Flex>
        ) : null}

        {data ? (
          <>
            <Grid gridTemplateColumns={[2, 3, 5]} gap={3}>
              <Stat label="Spots" value={data.spots} onClick={() => openList('spots')} />
              <Stat label="Artikel" value={data.articles} onClick={() => openList('magazin')} />
              <Stat label="Must Eats" value={data.mustEats} onClick={() => openList('must-eats')} />
              <Stat label="Bezirke" value={data.bezirke} onClick={() => openList('bezirke')} />
              <Stat label="Kategorien" value={data.categories} onClick={() => openList('kategorien')} />
            </Grid>

            <Grid gridTemplateColumns={[1, 1, 2]} gap={4}>
              <Card padding={4} radius={3} border>
                <Stack gap={4}>
                  <Flex align="center" justify="space-between">
                    <Heading as="h2" size={1}>
                      Noch nicht veröffentlicht
                    </Heading>
                    <Badge tone={data.drafts.length ? 'caution' : 'positive'}>{data.drafts.length}</Badge>
                  </Flex>
                  {data.drafts.length === 0 ? (
                    <Text muted size={1}>
                      Alles ist live.
                    </Text>
                  ) : (
                    <Stack gap={1}>
                      {data.drafts.slice(0, 12).map((draft) => (
                        <Card
                          key={draft._id}
                          as="button"
                          padding={3}
                          radius={2}
                          onClick={() => openDocument(draft._id, draft._type)}
                          style={{textAlign: 'left'}}
                        >
                          <Flex align="center" gap={3}>
                            <Box flex={1}>
                              <Stack gap={2}>
                                <Text weight="semibold" textOverflow="ellipsis">
                                  {draft.title || 'Ohne Titel'}
                                </Text>
                                <Text muted size={1}>
                                  {TYPE_LABEL[draft._type] ?? draft._type} · {ago(draft._updatedAt)}
                                </Text>
                              </Stack>
                            </Box>
                            <Badge tone={draft.isNew ? 'primary' : 'caution'}>{draft.isNew ? 'Neu' : 'Geändert'}</Badge>
                          </Flex>
                        </Card>
                      ))}
                      {data.drafts.length > 12 ? (
                        <Text muted size={1}>
                          und {data.drafts.length - 12} weitere
                        </Text>
                      ) : null}
                    </Stack>
                  )}
                </Stack>
              </Card>

              <Card padding={4} radius={3} border>
                <Stack gap={4}>
                  <Heading as="h2" size={1}>
                    Zu tun bei den Spots
                  </Heading>
                  <Stack gap={1}>
                    {tasks.map((task) => (
                      <Card
                        key={task.key}
                        as="button"
                        padding={3}
                        radius={2}
                        onClick={() => openList(`spots;${task.key}`)}
                        style={{textAlign: 'left'}}
                        disabled={task.count === 0}
                      >
                        <Flex align="center" gap={3}>
                          <Text size={2} muted>
                            <task.icon />
                          </Text>
                          <Box flex={1}>
                            <Stack gap={2}>
                              <Text weight="semibold">{task.title}</Text>
                              <Text muted size={1}>
                                {task.count === 0 ? 'Erledigt.' : task.text}
                              </Text>
                            </Stack>
                          </Box>
                          <Text weight="semibold" size={2}>
                            {task.count}
                          </Text>
                        </Flex>
                      </Card>
                    ))}
                  </Stack>
                </Stack>
              </Card>
            </Grid>
          </>
        ) : null}

        <Flex gap={2} align="center">
          <Text size={1} muted>
            <PinIcon />
          </Text>
          <Text size={1} muted>
            Fotos fügst du im Spot unter „Fotos“ per Link ein: Link einfügen, Copyright dazu, fertig.
          </Text>
        </Flex>
      </Stack>
    </Container>
  )
}

function Stat({label, value, onClick}: {label: string; value: number; onClick: () => void}) {
  return (
    <Card as="button" padding={4} radius={3} border onClick={onClick} style={{textAlign: 'left'}}>
      <Stack gap={3}>
        <Text size={1} muted>
          {label}
        </Text>
        <Heading as="p" size={4}>
          {value}
        </Heading>
      </Stack>
    </Card>
  )
}
