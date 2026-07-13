import {defineCliConfig} from 'sanity/cli'
import {sanityTarget} from './sanity-target.mjs'

export default defineCliConfig({
  api: {
    projectId: sanityTarget.projectId,
    dataset: sanityTarget.dataset,
  },
  deployment: {
    /**
     * Enable auto-updates for studios.
     * Learn more at https://www.sanity.io/docs/studio/latest-version-of-sanity#k47faf43faf56
     */
    autoUpdates: true,
    appId: 'm5bpct2stxk5aambt7amsao1',
  }
})
