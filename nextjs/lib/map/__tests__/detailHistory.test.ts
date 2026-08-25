import { describe, expect, it } from 'vitest';
import { resolveDetailHistory } from '../detailHistory';

const state = (over: Partial<Parameters<typeof resolveDetailHistory>[0]> = {}) =>
  resolveDetailHistory({
    detailOpen: false,
    wasOpen: false,
    urlChanged: false,
    pushed: false,
    closedBySearch: false,
    ...over,
  });

describe('resolveDetailHistory', () => {
  it('pushes when a detail opens from the list, so the back gesture closes it', () => {
    expect(state({ detailOpen: true, urlChanged: true })).toBe('push');
  });

  it('replaces every swap made while a detail is already open', () => {
    // Pager swipes and marker taps: ten spots must not leave ten entries.
    expect(state({ detailOpen: true, wasOpen: true, urlChanged: true, pushed: true })).toBe(
      'replace'
    );
  });

  /* The reported bug: from the home page onto a must-eat (?me=…), its X hands
     over to the restaurant (?r=…). That second URL was PUSHED, because nothing
     of ours was on the stack yet — so the X on the restaurant popped straight
     back into the must-eat it had just left, instead of going to the list. */
  it('replaces when a deep-linked must-eat hands over to its restaurant', () => {
    expect(state({ detailOpen: true, wasOpen: true, urlChanged: true, pushed: false })).toBe(
      'replace'
    );
  });

  it('leaves a deep-linked URL alone when it already says what is open', () => {
    expect(state({ detailOpen: true, wasOpen: false, urlChanged: false })).toBe('none');
  });

  it('pops the entry it pushed when the detail closes', () => {
    // Replacing would keep the dismissed detail in the forward stack, one back
    // press away from re-opening itself.
    expect(state({ pushed: true, urlChanged: true })).toBe('back');
  });

  it('only strips the params when the entry is not ours', () => {
    /* A deep-linked or reloaded ?r= URL belongs to whoever linked here. Going
       back there leaves the map — which is what closing a spot must never do. */
    expect(state({ wasOpen: true, urlChanged: true, pushed: false })).toBe('replace');
  });

  it('replaces instead of popping when a search query closed the detail', () => {
    // Popping re-applies the old filter state and would wipe the query in the
    // same moment it brought the list back.
    expect(state({ pushed: true, urlChanged: true, closedBySearch: true })).toBe('replace');
  });

  it('does nothing when the list is showing and the URL already agrees', () => {
    expect(state({ urlChanged: false })).toBe('none');
  });
});
