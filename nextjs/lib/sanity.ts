import { createClient } from '@sanity/client'

export const client = createClient({
  projectId: 'ehwjnjr2',
  dataset: 'production',
  apiVersion: '2024-01-01',
  useCdn: true,
})
