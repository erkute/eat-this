import { describe, it, expect, vi, afterEach } from 'vitest';
import { FatalApiError, isFatalApiMessage, newStats, noteFailure, finish } from './api-failure';

afterEach(() => {
  vi.restoreAllMocks();
  process.exitCode = undefined;
});

describe('isFatalApiMessage', () => {
  it('flags the rejections that repeat for every document', () => {
    expect(isFatalApiMessage('Your credit balance is too low to access the Anthropic API.')).toBe(
      true
    );
    expect(isFatalApiMessage('{"type":"authentication_error","message":"invalid x-api-key"}')).toBe(
      true
    );
    expect(isFatalApiMessage('permission_error')).toBe(true);
  });

  it('leaves per-document faults recoverable', () => {
    expect(isFatalApiMessage('No JSON text block in response for drafts.abc')).toBe(false);
    expect(isFatalApiMessage('shortDescription too long (182)')).toBe(false);
    expect(isFatalApiMessage('overloaded_error')).toBe(false);
    expect(isFatalApiMessage('rate_limit_error')).toBe(false);
  });
});

describe('noteFailure', () => {
  it('counts a recoverable failure and lets the loop continue', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const stats = newStats();
    expect(() => noteFailure(stats, 'Spot A', new Error('No JSON text block'))).not.toThrow();
    expect(stats.failed).toBe(1);
  });

  it('throws FatalApiError so the run stops', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const stats = newStats();
    expect(() => noteFailure(stats, 'Spot B', new Error('credit balance is too low'))).toThrow(
      FatalApiError
    );
    expect(stats.failed).toBe(1);
  });

  it('handles a thrown non-Error', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const stats = newStats();
    noteFailure(stats, 'Spot C', 'plain string');
    expect(stats.failed).toBe(1);
  });
});

describe('finish', () => {
  it('leaves the exit code alone on a clean run', () => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    finish('test', { ok: 5, failed: 0 });
    expect(process.exitCode).toBeUndefined();
  });

  it('sets a non-zero exit code when anything failed', () => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    finish('test', { ok: 5, failed: 2 });
    expect(process.exitCode).toBe(1);
  });
});
