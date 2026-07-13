import {readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import {deleteDoc, doc, getDoc, setDoc, updateDoc} from 'firebase/firestore';
import {afterAll, beforeAll, beforeEach, describe, expect, it} from 'vitest';

const describeRules = process.env.FIRESTORE_EMULATOR_HOST ? describe : describe.skip;

describeRules('firestore.rules favorites', () => {
  let testEnv: RulesTestEnvironment;

  beforeAll(async () => {
    testEnv = await initializeTestEnvironment({
      projectId: 'eat-this-rules-test',
      firestore: {
        rules: await readFile(resolve(process.cwd(), '../firestore.rules'), 'utf8'),
      },
    });
  });

  beforeEach(async () => {
    await testEnv.clearFirestore();
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), 'users/owner/favorites/restaurant-1'), {
        name: 'Restaurant',
        note: '',
      });
    });
  });

  afterAll(async () => {
    await testEnv?.cleanup();
  });

  it('allows only the owner to read a favorite', async () => {
    const ownerRef = doc(
      testEnv.authenticatedContext('owner').firestore(),
      'users/owner/favorites/restaurant-1',
    );
    const otherRef = doc(
      testEnv.authenticatedContext('other').firestore(),
      'users/owner/favorites/restaurant-1',
    );

    await assertSucceeds(getDoc(ownerRef));
    await assertFails(getDoc(otherRef));
  });

  it('denies direct favorite creation and deletion', async () => {
    const db = testEnv.authenticatedContext('owner').firestore();

    await assertFails(
      setDoc(doc(db, 'users/owner/favorites/restaurant-2'), {
        name: 'Another restaurant',
        note: '',
      }),
    );
    await assertFails(deleteDoc(doc(db, 'users/owner/favorites/restaurant-1')));
  });

  it('allows the owner to update only a string note of at most 180 characters', async () => {
    const favoriteRef = doc(
      testEnv.authenticatedContext('owner').firestore(),
      'users/owner/favorites/restaurant-1',
    );

    await assertSucceeds(updateDoc(favoriteRef, {note: 'Sehr gute Dumplings'}));
    await assertSucceeds(updateDoc(favoriteRef, {note: 'x'.repeat(180)}));
    await assertFails(updateDoc(favoriteRef, {note: 'x'.repeat(181)}));
    await assertFails(updateDoc(favoriteRef, {note: 42}));
    await assertFails(updateDoc(favoriteRef, {name: 'Manipulated', note: 'Nope'}));

    const snapshot = await getDoc(favoriteRef);
    expect(snapshot.data()?.name).toBe('Restaurant');
  });
});
