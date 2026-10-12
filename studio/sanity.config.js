import {defineConfig, isDev} from 'sanity'
import {structureTool} from 'sanity/structure'
import {visionTool} from '@sanity/vision'
import {deDELocale} from '@sanity/locale-de-de'
import {DownloadIcon, HomeIcon} from '@sanity/icons'
import {schemaTypes} from './schemaTypes'
import {structure} from './structure'
import StartPage from './tools/StartPage'
import RestaurantImporter from './tools/RestaurantImporter'
import {guardMustEatPublish} from './actions/MustEatPublishGuard'
import {StudioIcon} from './components/StudioIcon'
import {sanityTarget} from './sanity-target.mjs'

// Was man neu anlegen kann. Seiten (Impressum, Datenschutz …) gibt es fest,
// die legt niemand neu an.
const CREATABLE = new Set(['restaurant', 'newsArticle', 'mustEat', 'bezirk', 'category'])

export default defineConfig({
  name: 'default',
  title: 'Eat This',
  icon: StudioIcon,

  projectId: sanityTarget.projectId,
  dataset: sanityTarget.dataset,

  plugins: [
    deDELocale(),
    structureTool({title: 'Inhalte', structure}),
    // GROQ-Werkzeug für Entwickler, im deployten Studio nur Ballast.
    ...(isDev ? [visionTool()] : []),
  ],

  // Die Startseite steht vorn und ist damit das, was beim Öffnen erscheint.
  // Werkzeuge rufen die App mit dem kurzlebigen Sanity-Token der angemeldeten
  // Person auf; im Studio-Bundle liegt kein Schreib-Geheimnis.
  tools: (prev) => [
    {name: 'start', title: 'Start', icon: HomeIcon, component: StartPage},
    ...prev,
    {name: 'restaurant-importer', title: 'Spot importieren', icon: DownloadIcon, component: RestaurantImporter},
  ],

  document: {
    actions: (prev, {schemaType}) => {
      if (schemaType === 'mustEat') {
        return prev.map((action) => (action.action === 'publish' ? guardMustEatPublish(action) : action))
      }
      return prev
    },
    newDocumentOptions: (prev) => prev.filter((item) => CREATABLE.has(item.templateId)),
  },

  schema: {
    types: schemaTypes,
    templates: (prev) => prev.filter((template) => CREATABLE.has(template.schemaType)),
  },
})
