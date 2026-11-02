import { test } from 'node:test';
import assert from 'node:assert/strict';
import { filterV4Nodes } from '../src/config/lavalink.js';
import { isRelatedCandidate } from '../src/services/autoplay.js';

const node = overrides => ({ version: 'v4', host: 'node.example.com', port: 443, password: 'pw', ...overrides });

test('filterV4Nodes: descarta v3, sin SSL y hosts bloqueados', () => {
    const list = [
        node({ identifier: 'ok' }),
        node({ version: 'v3' }),
        node({ host: 'lavalink-v3.example.com' }),
        node({ host: 'a-v3.example.com' }),
        node({ host: 'x.jirayu.net' }),
        node({ port: 2333 }),
        node({ port: 2333, secure: true, name: 'secure-custom-port' })
    ];
    assert.deepEqual(filterV4Nodes(list, 10), [
        { name: 'ok', url: 'node.example.com:443', auth: 'pw', secure: true },
        { name: 'secure-custom-port', url: 'node.example.com:2333', auth: 'pw', secure: true }
    ]);
});

test('filterV4Nodes: respeta el máximo', () => {
    const list = Array.from({ length: 5 }, (_, i) => node({ host: `n${i}.example.com` }));
    assert.equal(filterV4Nodes(list, 2).length, 2);
});

const ctx = { uri: 'u:ctx', title: 'Artista - Tema Original' };

test('isRelatedCandidate: descarta el mismo tema y el actual', () => {
    assert.ok(!isRelatedCandidate({ uri: 'u:ctx', title: 'otro' }, ctx, null, []));
    assert.ok(!isRelatedCandidate({ uri: 'u:cur', title: 'otro' }, ctx, { uri: 'u:cur' }, []));
    assert.ok(!isRelatedCandidate({ uri: 'u:1', title: 'ARTISTA - TEMA ORIGINAL' }, ctx, null, []));
});

test('isRelatedCandidate: descarta contenido que no es música', () => {
    assert.ok(!isRelatedCandidate({ uri: 'u:1', title: 'How to tune a guitar' }, ctx, null, []));
});

test('isRelatedCandidate: descarta temas parecidos al historial', () => {
    const history = [{ uri: 'u:h', title: 'Banda Cancion Larga (Live)' }];
    assert.ok(!isRelatedCandidate({ uri: 'u:h', title: 'nada que ver' }, ctx, null, history));
    assert.ok(!isRelatedCandidate({ uri: 'u:2', title: 'Banda - Cancion Larga remaster' }, ctx, null, history));
    assert.ok(isRelatedCandidate({ uri: 'u:3', title: 'Banda - Otro Hit' }, ctx, null, history));
});
