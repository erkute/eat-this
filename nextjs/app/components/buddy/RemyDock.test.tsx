// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render } from '@testing-library/react';
import { BUDDY_ASK_EVENT } from '@/lib/buddy/homeStage';

const widgetProps = vi.hoisted(() => ({ last: null as { pageSlug?: string } | null }));

vi.mock('next/dynamic', () => ({
  default: () =>
    function MockBuddyWidget(props: { pageSlug?: string }) {
      widgetProps.last = props;
      return <div data-testid="buddy-widget" />;
    },
}));

vi.mock('./BuddyWidget', () => ({ default: () => null }));

import RemyDock from './RemyDock';

afterEach(() => {
  cleanup();
  widgetProps.last = null;
});

describe('RemyDock', () => {
  it('mounts nothing until someone asks — the SEO page pays only for the listener', () => {
    const { queryByTestId } = render(<RemyDock pageSlug="bari" />);
    expect(queryByTestId('buddy-widget')).toBeNull();
  });

  it('mounts the widget with the page slug on the first ask event', () => {
    const { queryByTestId } = render(<RemyDock pageSlug="bari" />);

    fireEvent(window, new CustomEvent(BUDDY_ASK_EVENT, { detail: { question: 'Was hier?' } }));

    expect(queryByTestId('buddy-widget')).not.toBeNull();
    expect(widgetProps.last).toEqual({ pageSlug: 'bari' });
  });
});
