import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseSeekInput } from '../commands/seek.js';
import { joinLinesWithinLimit } from '../commands/queue.js';
import { hasYoutubeListParameter, isLikelySpotifyUrl } from '../src/utils/playSearchShared.js';
import { formatTime, formatTrackDuration } from '../src/utils/formatTime.js';
import { buildProgressBar } from '../src/ui/playerEmbed.js';

test('parseSeekInput: segundos, mm:ss y hh:mm:ss', () => {
    assert.equal(parseSeekInput('90'), 90_000);
    assert.equal(parseSeekInput('1:30'), 90_000);
    assert.equal(parseSeekInput(' 1:02:03 '), 3_723_000);
});

test('parseSeekInput: entradas inválidas', () => {
    for (const raw of ['', '   ', 'abc', '1:xx', '1:2:3:4', '-5']) {
        assert.equal(parseSeekInput(raw), null, raw);
    }
});

test('isLikelySpotifyUrl', () => {
    assert.ok(isLikelySpotifyUrl('https://open.spotify.com/track/abc'));
    assert.ok(isLikelySpotifyUrl('spotify:playlist:abc'));
    assert.ok(!isLikelySpotifyUrl('https://youtube.com/watch?v=abc'));
    assert.ok(!isLikelySpotifyUrl('spotify canciones'));
});

test('hasYoutubeListParameter', () => {
    assert.ok(hasYoutubeListParameter('https://www.youtube.com/watch?v=abc&list=PL123'));
    assert.ok(hasYoutubeListParameter('https://www.youtube.com/playlist?list=PL123'));
    assert.ok(!hasYoutubeListParameter('https://www.youtube.com/watch?v=abc'));
    assert.ok(!hasYoutubeListParameter('canción list=PL123'));
});

test('formatTime / formatTrackDuration', () => {
    assert.equal(formatTime(0), '0:00');
    assert.equal(formatTime(65_000), '1:05');
    assert.equal(formatTrackDuration(0), 'En vivo');
    assert.equal(formatTrackDuration(125_000), '2:05');
});

test('buildProgressBar', () => {
    assert.equal(buildProgressBar(0, 0, 4), '`░░░░` · EN VIVO');
    assert.equal(buildProgressBar(30_000, 60_000, 4), '`██░░` · 0:30 / 1:00');
    assert.equal(buildProgressBar(120_000, 60_000, 4), '`████` · 2:00 / 1:00');
});

test('joinLinesWithinLimit: entra todo si no supera 1024', () => {
    const lines = ['a', 'b', 'c'];
    assert.equal(joinLinesWithinLimit(lines), 'a\nb\nc');
});

test('joinLinesWithinLimit: recorta y avisa cuántas se omitieron', () => {
    const lines = Array.from({ length: 10 }, (_, i) => `${i}`.padEnd(200, 'x'));
    const text = joinLinesWithinLimit(lines);
    assert.ok(text.length <= 1024);
    assert.match(text, /…y \d+ más en esta página$/);
});
