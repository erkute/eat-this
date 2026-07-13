import { describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  initializeApp: vi.fn(() => ({ name: 'app' })),
  getApps: vi.fn((): unknown[] => []),
  getAuth: vi.fn(() => ({ currentUser: null })),
  getFirestore: vi.fn(),
}))

vi.mock('firebase/app', () => ({
  initializeApp: mocks.initializeApp,
  getApps: mocks.getApps,
}))

vi.mock('firebase/auth', () => ({
  getAuth: mocks.getAuth,
}))

vi.mock('firebase/firestore', () => ({
  getFirestore: mocks.getFirestore,
}))

import { getDb } from '../config'

describe('getDb', () => {
  it('retries after a failed lazy Firestore initialization', async () => {
    const db = { kind: 'firestore' }
    mocks.getFirestore
      .mockImplementationOnce(() => { throw new Error('transient init failure') })
      .mockReturnValueOnce(db)

    await expect(getDb()).rejects.toThrow('transient init failure')
    await expect(getDb()).resolves.toBe(db)
    await expect(getDb()).resolves.toBe(db)

    expect(mocks.getFirestore).toHaveBeenCalledTimes(2)
  })
})
