import { expect, it } from 'vitest';
import { isLocalAnalyticsHost } from './noCount';
it.each([
  '192.168.178.49',
  '10.0.0.5',
  '172.16.0.8',
  '172.31.255.255',
  '169.254.1.2',
  'eat-this.local',
  '[fd00::1]',
  '[fe80::1234]',
])('excludes preview host %s', (host) => {
  expect(isLocalAnalyticsHost(host)).toBe(true);
});
it.each(['172.32.0.1', '192.169.1.1', 'www.eatthisdot.com', '192.168.1.1.example.com'])(
  'keeps public host %s',
  (host) => {
    expect(isLocalAnalyticsHost(host)).toBe(false);
  }
);
