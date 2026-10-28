// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import LoginModalBarLock from './LoginModalBarLock';

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  document.documentElement.removeAttribute('style');
  document.body.removeAttribute('style');
  document.querySelectorAll('meta[name="theme-color"]').forEach(meta => meta.remove());
});

it('preserves the mobile page palette behind the blurred overlay', () => {
  vi.stubGlobal('matchMedia', () => ({ matches: true }));
  vi.stubGlobal('requestAnimationFrame', vi.fn());
  const html = document.documentElement;
  html.style.setProperty('color-scheme', 'dark', 'important');
  html.style.backgroundColor = '#15120e';
  document.body.style.backgroundColor = '#15120e';
  const meta = document.createElement('meta');
  meta.name = 'theme-color';
  meta.content = '#15120e';
  document.head.appendChild(meta);
  const { unmount } = render(<LoginModalBarLock />);
  expect(html.style.colorScheme).toBe('dark');
  expect(html.style.getPropertyPriority('color-scheme')).toBe('important');
  expect(html.style.backgroundColor).toBe('rgb(21, 18, 14)');
  expect(document.body.style.backgroundColor).toBe('rgb(21, 18, 14)');
  expect(meta.content).toBe('#15120e');
  unmount();
  expect(html.style.colorScheme).toBe('dark');
  expect(html.style.getPropertyPriority('color-scheme')).toBe('important');
  expect(html.style.backgroundColor).toBe('rgb(21, 18, 14)');
  expect(document.body.style.backgroundColor).toBe('rgb(21, 18, 14)');
  expect(meta.content).toBe('#15120e');
});

it('locks mobile scrolling without adding a browser color', () => {
  vi.stubGlobal('matchMedia', () => ({ matches: true }));
  vi.stubGlobal('requestAnimationFrame', vi.fn());
  const { unmount } = render(<LoginModalBarLock />);
  expect(document.querySelector('meta[name="theme-color"]')).toBeNull();
  expect(document.body.style.position).toBe('fixed');
  unmount();
  expect(document.querySelector('meta[name="theme-color"]')).toBeNull();
  expect(document.documentElement.style.colorScheme).toBe('');
  expect(document.body.style.position).toBe('');
});

it('leaves desktop browser colors alone', () => {
  vi.stubGlobal('matchMedia', () => ({ matches: false }));
  document.documentElement.style.colorScheme = 'dark';
  const { unmount } = render(<LoginModalBarLock />);
  expect(document.documentElement.style.colorScheme).toBe('dark');
  expect(document.documentElement.style.backgroundColor).toBe('');
  expect(document.querySelector('meta[name="theme-color"]')).toBeNull();
  unmount();
});
