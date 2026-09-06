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

  /* „war da" / „will hin" — die zweite eigene Anmerkung neben der Notiz.
     Alles andere am Dokument bleibt server-eigen. */
  it('allows the owner to flip the visited flag, and nothing else', async () => {
    const favoriteRef = doc(
      testEnv.authenticatedContext('owner').firestore(),
      'users/owner/favorites/restaurant-1',
    );

    await assertSucceeds(updateDoc(favoriteRef, {visited: true}));
    await assertSucceeds(updateDoc(favoriteRef, {visited: false}));
    await assertSucceeds(updateDoc(favoriteRef, {visited: true, note: 'War super'}));
    await assertFails(updateDoc(favoriteRef, {visited: 'ja'}));
    await assertFails(updateDoc(favoriteRef, {visited: true, heartCount: 99}));
  });

  /* Ein gespeicherter Spot ohne Notiz ist der Normalfall — der Haken darf
     dort nicht daran scheitern, dass die Regel eine Notiz sehen will, die es
     nie gab. */
  it('lets the visited flag through on a favorite that has no note', async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), 'users/owner/favorites/restaurant-3'), {
        name: 'Ohne Notiz',
      });
    });

    await assertSucceeds(
      updateDoc(
        doc(
          testEnv.authenticatedContext('owner').firestore(),
          'users/owner/favorites/restaurant-3',
        ),
        {visited: true},
      ),
    );
  });

  it('denies premium Must-Eat reads and writes to every browser identity', async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), 'privateMustEats/m1'), {
        dish: 'server-only',
        imageObjectPath: 'premium/must-eats/m1/hash.webp',
      });
    });

    for (const db of [
      testEnv.unauthenticatedContext().firestore(),
      testEnv.authenticatedContext('owner').firestore(),
    ]) {
      const premiumRef = doc(db, 'privateMustEats/m1');
      await assertFails(getDoc(premiumRef));
      await assertFails(setDoc(premiumRef, {dish: 'overwrite'}));
    }
  });
});
