import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { buildZip, readZip, crc32 } from '../public/js/zip.js';

test('crc32 conhecido', () => {
  assert.equal(crc32(new TextEncoder().encode('123456789')), 0xcbf43926);
  assert.equal(crc32(new Uint8Array(0)), 0);
});

test('buildZip -> readZip devolve os mesmos conteúdos (incl. nomes com acentos)', async () => {
  const jpg = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3, 4, 5, 0xff, 0xd9]);
  const zip = await buildZip([
    { name: 'dados/rally.json', data: '{"olá":"mundo"}' },
    { name: 'fotografias/01-café/2026-10-24_01.jpg', data: new Blob([jpg]) },
    { name: 'vazio.txt', data: '' },
  ]);
  assert.equal(zip.type, 'application/zip');
  const entries = await readZip(zip);
  assert.deepEqual(entries.map((e) => e.name), ['dados/rally.json', 'fotografias/01-café/2026-10-24_01.jpg', 'vazio.txt']);
  assert.equal(await entries[0].blob.text(), '{"olá":"mundo"}');
  assert.deepEqual(new Uint8Array(await entries[1].blob.arrayBuffer()), jpg);
  assert.equal(entries[2].blob.size, 0);
});

test('readZip rejeita ficheiros que não são ZIP', async () => {
  await assert.rejects(() => readZip(new Blob(['isto não é um zip, de todo, mesmo nada'])), /inválido/i);
});

test('o ZIP é válido para ferramentas externas (python zipfile)', async (t) => {
  const py = spawnSync('python3', ['--version']);
  if (py.status !== 0) return t.skip('python3 indisponível');
  const dir = mkdtempSync(join(tmpdir(), 'rally-zip-'));
  try {
    const big = new Uint8Array(300000).map((_, i) => (i * 7) % 251);
    const zip = await buildZip([
      { name: 'a/ficheiro com espaços.txt', data: 'olá ✓' },
      { name: 'b/foto.jpg', data: big },
    ]);
    const path = join(dir, 'teste.zip');
    writeFileSync(path, Buffer.from(await zip.arrayBuffer()));
    const code = `
import zipfile, sys
z = zipfile.ZipFile(sys.argv[1])
assert z.testzip() is None, "CRC inválido"
names = z.namelist()
assert names == ['a/ficheiro com espaços.txt', 'b/foto.jpg'], names
assert z.read('a/ficheiro com espaços.txt').decode('utf-8') == 'olá ✓'
assert len(z.read('b/foto.jpg')) == 300000
print('ok')
`;
    const r = spawnSync('python3', ['-c', code, path], { encoding: 'utf8' });
    assert.equal(r.status, 0, r.stderr || r.stdout);
    assert.match(r.stdout, /ok/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
