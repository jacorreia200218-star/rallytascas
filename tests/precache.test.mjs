import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const PUBLIC = join(fileURLToPath(new URL('.', import.meta.url)), '..', 'public');

function walk(dir) {
  return readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
}

const sw = readFileSync(join(PUBLIC, 'sw.js'), 'utf8');
const listText = sw.match(/const ASSETS = \[([\s\S]*?)\];/)[1];
const assets = [...listText.matchAll(/'([^']+)'/g)].map((m) => m[1]);

test('todos os ficheiros da app estão na lista de cache offline (e vice-versa)', () => {
  const skip = new Set(['sw.js', '_headers']);
  const files = walk(PUBLIC).map((p) => relative(PUBLIC, p).split(sep).join('/')).filter((f) => !skip.has(f));
  const cached = assets.filter((a) => a !== './');
  assert.deepEqual([...files].sort(), [...cached].sort());
});

test('a lista de cache não tem duplicados e todos os ficheiros existem', () => {
  assert.equal(new Set(assets).size, assets.length);
  for (const a of assets) if (a !== './') assert.ok(existsSync(join(PUBLIC, a)), a);
});

test('manifest válido e ícones existem', () => {
  const m = JSON.parse(readFileSync(join(PUBLIC, 'manifest.webmanifest'), 'utf8'));
  assert.equal(m.display, 'standalone');
  assert.equal(m.lang, 'pt-PT');
  assert.ok(m.name && m.short_name && m.start_url && m.scope);
  const sizes = m.icons.map((i) => i.sizes);
  assert.ok(sizes.includes('192x192') && sizes.includes('512x512'));
  assert.ok(m.icons.some((i) => i.purpose === 'maskable'));
  for (const i of m.icons) assert.ok(existsSync(join(PUBLIC, i.src)), i.src);
});

test('index.html liga manifest, ícone iOS, módulo principal e CSP restritiva', () => {
  const html = readFileSync(join(PUBLIC, 'index.html'), 'utf8');
  assert.match(html, /rel="manifest" href="manifest\.webmanifest"/);
  assert.match(html, /rel="apple-touch-icon"/);
  assert.match(html, /type="module" src="js\/app\.js"/);
  assert.match(html, /apple-mobile-web-app-capable/);
  assert.match(html, /viewport-fit=cover/);
  assert.match(html, /connect-src 'self'/);
  assert.doesNotMatch(html, /<script[^>]+src="https?:/i);
  assert.doesNotMatch(html, /<link[^>]+href="https?:/i);
});

test('o código da app não contém analytics nem pedidos a servidores externos', () => {
  const code = walk(join(PUBLIC, 'js')).map((p) => readFileSync(p, 'utf8')).join('\n');
  assert.doesNotMatch(code, /\bfetch\s*\(/);
  assert.doesNotMatch(code, /XMLHttpRequest|sendBeacon|WebSocket|EventSource/);
  assert.doesNotMatch(code, /google-analytics|gtag|plausible|mixpanel|sentry|segment\.com/i);
});
