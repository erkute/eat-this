// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from 'vitest';

const sdk = vi.hoisted(() => ({ loaded: vi.fn(), captureException: vi.fn(), captureMessage: vi.fn() }));
let frames: FrameRequestCallback[];
let surface: EventTarget & { requestAnimationFrame: ReturnType<typeof vi.fn> };

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  vi.doMock('./client-sdk', () => {
    sdk.loaded();
    return { captureException: sdk.captureException, captureMessage: sdk.captureMessage };
  });
  frames = [];
  surface = Object.assign(new EventTarget(), {
    requestAnimationFrame: vi.fn((callback: FrameRequestCallback) => frames.push(callback)),
  });
  vi.stubGlobal('window', surface);
  vi.spyOn(document, 'readyState', 'get').mockReturnValue('complete');
});
afterEach(async () => {
  await vi.dynamicImportSettled();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});
const frame = () => frames.shift()!(0);

it('starts the SDK only after a completed paint opportunity', async () => {
  const reporter = await import('./client-reporting');
  reporter.startClientErrorReporting();
  await vi.dynamicImportSettled();
  expect(sdk.loaded).not.toHaveBeenCalled();
  frame();
  await vi.dynamicImportSettled();
  expect(sdk.loaded).not.toHaveBeenCalled();
  frame();
  await vi.dynamicImportSettled();
  expect(sdk.loaded).toHaveBeenCalledOnce();
});

it('waits for the server HTML before scheduling the paint', async () => {
  vi.spyOn(document, 'readyState', 'get').mockReturnValue('loading');
  const reporter = await import('./client-reporting');
  reporter.startClientErrorReporting();
  expect(frames).toHaveLength(0);
  document.dispatchEvent(new Event('DOMContentLoaded'));
  frame(); frame();
  await vi.dynamicImportSettled();
  expect(sdk.loaded).toHaveBeenCalledOnce();
});

it('forwards a startup error immediately and removes the temporary listener after handover', async () => {
  const reporter = await import('./client-reporting');
  reporter.startClientErrorReporting();
  reporter.startClientErrorReporting();
  const error = new Error('before hydration');
  surface.dispatchEvent(new ErrorEvent('error', { error, message: error.message }));
  await vi.dynamicImportSettled();
  expect(sdk.loaded).toHaveBeenCalledOnce();
  expect(sdk.captureException).toHaveBeenCalledWith(error, { mechanism: { handled: false, type: 'onerror' } });
  surface.dispatchEvent(new ErrorEvent('error', { error, message: error.message }));
  frame(); frame();
  await vi.dynamicImportSettled();
  expect(sdk.captureException).toHaveBeenCalledOnce();
  expect(sdk.loaded).toHaveBeenCalledOnce();
});

it('preserves an early rejected promise as unhandled', async () => {
  const reporter = await import('./client-reporting');
  reporter.startClientErrorReporting();
  const reason = new Error('early rejection');
  surface.dispatchEvent(Object.assign(new Event('unhandledrejection'), { reason }));
  await vi.dynamicImportSettled();
  expect(sdk.captureException).toHaveBeenCalledWith(reason, { mechanism: { handled: false, type: 'onunhandledrejection' } });
});

it('shares initialization and preserves explicit auth/error-boundary context', async () => {
  const reporter = await import('./client-reporting');
  const error = new Error('auth');
  const context = { tags: { auth_flow: 'premium_access_sync' } };
  reporter.captureException(error, context);
  reporter.captureMessage('popup', { level: 'warning' });
  await vi.dynamicImportSettled();
  expect(sdk.loaded).toHaveBeenCalledOnce();
  expect(sdk.captureException).toHaveBeenCalledWith(error, context);
  expect(sdk.captureMessage).toHaveBeenCalledWith('popup', { level: 'warning' });
});

it('retries reporting after a failed SDK download without rejecting into the app', async () => {
  vi.doMock('./client-sdk', () => { throw new Error('offline'); });
  const reporter = await import('./client-reporting');
  reporter.captureException(new Error('while offline'));
  await vi.dynamicImportSettled();
  expect(sdk.captureException).not.toHaveBeenCalled();
  vi.doMock('./client-sdk', () => ({ captureException: sdk.captureException, captureMessage: sdk.captureMessage }));
  const nextError = new Error('connection restored');
  reporter.captureException(nextError);
  await vi.dynamicImportSettled();
  expect(sdk.captureException).toHaveBeenCalledWith(nextError);
});
