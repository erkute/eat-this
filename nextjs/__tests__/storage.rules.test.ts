import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import {
  assertFails,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing'
import { deleteObject, getBytes, ref, uploadBytes } from 'firebase/storage'
import { afterAll, beforeAll, describe, it } from 'vitest'

const describeRules = process.env.FIREBASE_STORAGE_EMULATOR_HOST
  ? describe
  : describe.skip

describeRules('storage.rules private premium assets', () => {
  let testEnv: RulesTestEnvironment

  beforeAll(async () => {
    testEnv = await initializeTestEnvironment({
      projectId: 'eat-this-rules-test',
      storage: {
        rules: await readFile(resolve(process.cwd(), '../storage.rules'), 'utf8'),
      },
    })

    await testEnv.withSecurityRulesDisabled(async (context) => {
      await uploadBytes(
        ref(context.storage(), 'premium/must-eats/m1/hash.webp'),
        new Uint8Array([1, 2, 3]),
        { contentType: 'image/webp' },
      )
    })
  })

  afterAll(async () => {
    await testEnv?.cleanup()
  })

  it('denies reads, writes and deletes to anonymous and authenticated clients', async () => {
    for (const storage of [
      testEnv.unauthenticatedContext().storage(),
      testEnv.authenticatedContext('owner').storage(),
    ]) {
      const premiumRef = ref(storage, 'premium/must-eats/m1/hash.webp')
      await assertFails(getBytes(premiumRef))
      await assertFails(uploadBytes(premiumRef, new Uint8Array([4, 5, 6])))
      await assertFails(deleteObject(premiumRef))
    }
  })
})
