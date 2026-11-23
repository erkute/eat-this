// Local TLS gives WebKit the same Secure/HttpOnly cookie boundary as production.
import { createServer } from 'node:https';
import { request } from 'node:http';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync, spawn } from 'node:child_process';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const directory = mkdtempSync(join(tmpdir(), 'eat-this-browser-tls-'));
const key = join(directory, 'key.pem');
const certificate = join(directory, 'certificate.pem');
execFileSync('openssl', ['req', '-x509', '-newkey', 'rsa:2048', '-nodes',
  '-keyout', key, '-out', certificate, '-days', '1', '-subj', '/CN=localhost'], { stdio: 'ignore' });
const next = spawn(process.execPath, [require.resolve('next/dist/bin/next'),
  'start', '--hostname', '127.0.0.1', '--port', '3100'], {
  env: { ...process.env, NEXT_DIST_DIR: '.next-verify' }, stdio: 'inherit',
});
const server = createServer({ key: readFileSync(key), cert: readFileSync(certificate) }, (incoming, outgoing) => {
  const auth = ['/identitytoolkit.googleapis.com/', '/securetoken.googleapis.com/', '/emulator/auth/']
    .some(prefix => incoming.url.startsWith(prefix));
  const firestore = incoming.url.startsWith('/google.firestore.v1.Firestore/');
  const upstream = request({ hostname: '127.0.0.1', port: auth ? 9099 : firestore ? 8089 : 3100,
    path: incoming.url,
    method: incoming.method, headers: incoming.headers,
  }, response => {
    outgoing.writeHead(response.statusCode ?? 502, response.headers);
    response.pipe(outgoing);
  });
  upstream.on('error', () => {
    if (!outgoing.headersSent) outgoing.writeHead(502);
    outgoing.end();
  });
  incoming.on('aborted', () => upstream.destroy());
  outgoing.on('close', () => { if (!outgoing.writableFinished) upstream.destroy(); });
  incoming.pipe(upstream);
});
server.listen(3101, '127.0.0.1');
const stop = () => { server.close(); next.kill('SIGTERM'); };
process.on('SIGTERM', stop);
process.on('SIGINT', stop);
next.on('exit', code => { server.close(); process.exit(code ?? 0); });
process.on('exit', () => {
  next.kill('SIGTERM');
  rmSync(directory, { recursive: true, force: true });
});
