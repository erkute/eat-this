import { describe, it, expect } from 'vitest';
import { isOwnerPhoto } from './photo-curation';

describe('isOwnerPhoto', () => {
  it('flags photos whose attribution contains the restaurant name', () => {
    expect(isOwnerPhoto('136 Berlin Restaurant', '136 Berlin Restaurant')).toBe(true);
    expect(isOwnerPhoto('Hafenküche Berlin - Hafenjungs Berlin GmbH', 'Hafenküche')).toBe(true);
    expect(isOwnerPhoto('ZOLA - Paul-Lincke-Ufer - Kreuzberg', 'ZOLA')).toBe(true);
  });

  it('treats guest names as non-owner', () => {
    expect(isOwnerPhoto('Nico Scheiffert', '136 Berlin Restaurant')).toBe(false);
    expect(isOwnerPhoto('Sonja Egger', 'Ristorante Osteria Centrale')).toBe(false);
    expect(isOwnerPhoto(undefined, 'Whatever')).toBe(false);
  });

  it('requires an exact match for very short restaurant names', () => {
    expect(isOwnerPhoto('963', '963')).toBe(true);
    expect(isOwnerPhoto('Bob 963 fan', '963')).toBe(false);
  });

  it('matches owners across name variants (English/German, dropped suffix)', () => {
    expect(isOwnerPhoto('Albatross Bakery', 'Albatross Bäckerei')).toBe(true);
    expect(isOwnerPhoto('Five Elephant Kreuzberg', 'Five Elephant Kreuzberg')).toBe(true);
    expect(isOwnerPhoto('Albert Rossi', 'Albatross Bäckerei')).toBe(false);
  });

  it('accepts an uploading profile that carries only part of the Places name', () => {
    // Real attributions from the Mit-Vergnügen import, 26.08.2026 — all three
    // were rejected while "every distinctive token" was required.
    expect(isOwnerPhoto('Zeus Pizzeria – Friedrichshain', 'Zeus Pizza & Pide')).toBe(true);
    expect(isOwnerPhoto("Allan's ABC", 'ABC - Allans Breakfast Club')).toBe(true);
    expect(isOwnerPhoto('Ushido', 'Ushido - Japanese bbq')).toBe(true);
  });

  it('still rejects guests who share no strong token', () => {
    expect(isOwnerPhoto('Jennifer Barteloni', '100 Brote')).toBe(false);
    expect(isOwnerPhoto('Turist Ömer', 'annelies')).toBe(false);
    expect(isOwnerPhoto('Audrey Taber', 'Bäckerei Hacker')).toBe(false);
  });
});
