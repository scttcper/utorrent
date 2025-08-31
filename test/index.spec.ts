import { readFileSync } from 'node:fs';
import path from 'node:path';

import { afterEach, expect, it } from 'vitest';

import { Utorrent } from '../src/index.js';

const baseUrl = 'http://localhost:8080/';
const torrentName = 'ubuntu-18.04.1-desktop-amd64.iso';
const dirname = new URL('.', import.meta.url).pathname;
const torrentFilePath = path.join(dirname, 'ubuntu-18.04.1-desktop-amd64.iso.torrent');
const torrentFileBuffer = readFileSync(torrentFilePath);
const magnet =
  'magnet:?xt=urn:btih:B0B81206633C42874173D22E564D293DAEFC45E2&dn=Ubuntu+11+10+Alternate+Amd64+Iso&tr=udp%3A%2F%2Ftracker.coppersurfer.tk%3A6969%2Fannounce&tr=udp%3A%2F%2F9.rarbg.to%3A2710%2Fannounce&tr=udp%3A%2F%2Ftracker.opentrackr.org%3A1337%2Fannounce&tr=udp%3A%2F%2Ftracker.leechers-paradise.org%3A6969%2Fannounce&tr=udp%3A%2F%2Ftracker.open-internet.nl%3A6969%2Fannounce&tr=udp%3A%2F%2Fopen.demonii.si%3A1337%2Fannounce&tr=udp%3A%2F%2Ftracker.pirateparty.gr%3A6969%2Fannounce&tr=udp%3A%2F%2Fdenis.stalker.upeer.me%3A6969%2Fannounce&tr=udp%3A%2F%2Fp4p.arenabg.com%3A1337%2Fannounce&tr=udp%3A%2F%2Fexodus.desync.com%3A6969%2Fannounce';

async function setupTorrent(client: Utorrent): Promise<string> {
  await client.addTorrent(torrentFileBuffer);
  const res = await client.listTorrents();
  // biome-ignore lint/suspicious/noMisplacedAssertion: <explanation>
  expect(res.torrents).toHaveLength(1);
  return res.torrents[0]![0];
}

afterEach(async () => {
  const client = new Utorrent({ baseUrl });
  const res = await client.listTorrents();
  for (const torrent of res.torrents) {
    // clean up all torrents
    await client.removeTorrent(torrent[0]);
  }
});
it('should connect', async () => {
  const client = new Utorrent({ baseUrl });
  await client.connect();
  expect(client.state.auth!.token.length).toBeGreaterThan(0);
});
it('should disconnect', async () => {
  const client = new Utorrent({ baseUrl });
  await client.connect();
  client.resetSession();
  expect(client.state.auth).toBeUndefined();
});
it('should add torrent', async () => {
  const client = new Utorrent({ baseUrl });
  await client.addTorrent(torrentFileBuffer);
  const res = await client.listTorrents();
  expect(res.torrents).toHaveLength(1);
});
it('should add torrent from string', async () => {
  const client = new Utorrent({ baseUrl });
  await client.addTorrent(torrentFileBuffer.toString('base64'));
  const res = await client.listTorrents();
  expect(res.torrents.length).toBe(1);
});
it('should get settings', async () => {
  const client = new Utorrent({ baseUrl });
  const res = await client.getSettings();
  expect(res.settings).toBeInstanceOf(Array);
});
it('should list torrents', async () => {
  const client = new Utorrent({ baseUrl });
  await setupTorrent(client);
  const res = await client.listTorrents();
  expect(res.torrents).toHaveLength(1);
  expect(res.torrents[0]![2]).toBe(torrentName);
});
it('should move torrents in queue', async () => {
  const client = new Utorrent({ baseUrl });
  const key = await setupTorrent(client);
  await client.queueUp(key);
  await client.queueDown(key);
  await client.queueTop(key);
  await client.queueBottom(key);
});
it('should remove torrent', async () => {
  const client = new Utorrent({ baseUrl });
  const key = await setupTorrent(client);
  await client.removeTorrent(key);
  const res = await client.listTorrents();
  expect(res.torrents).toHaveLength(0);
});
it('should return normalized torrent data', async () => {
  const client = new Utorrent({ baseUrl });
  await setupTorrent(client);
  const res = await client.getAllData();
  const torrent = res.torrents[0]!;
  expect(torrent.connectedPeers).toBe(0);
  expect(torrent.connectedSeeds).toBe(0);
  expect(torrent.downloadSpeed).toBe(0);
  // expect(torrent.eta).toBe(0);
  expect(torrent.isCompleted).toBe(false);
  expect(torrent.label).toBe('');
  expect(torrent.name).toBe(torrentName);
  expect(torrent.progress).toBeGreaterThanOrEqual(0);
  expect(torrent.queuePosition).toBe(1);
  expect(torrent.ratio).toBe(0);
  // expect(torrent.savePath).toBe('/utorrent/data/incomplete');
  // expect(torrent.state).toBe(TorrentState.queued);
  expect(torrent.stateMessage).toBe('');
  expect(torrent.totalDownloaded).toBe(0);
  expect(torrent.totalPeers).toBe(0);
  expect(torrent.totalSeeds).toBe(0);
  // expect(torrent.totalSelected).toBe(1953349632);
  // expect(torrent.totalSize).toBe(1953349632);
  expect(torrent.totalUploaded).toBe(0);
  expect(torrent.uploadSpeed).toBe(0);
});
it('should add torrent with normalized response', async () => {
  const client = new Utorrent({ baseUrl });

  const torrent = await client.normalizedAddTorrent(torrentFileBuffer, {
    label: 'test',
  });
  expect(torrent.connectedPeers).toBe(0);
  expect(torrent.connectedSeeds).toBe(0);
  expect(torrent.downloadSpeed).toBe(0);
  // expect(torrent.eta).toBe(0);
  expect(torrent.isCompleted).toBe(false);
  expect(torrent.label).toBe('test');
  expect(torrent.name).toBe(torrentName);
  expect(torrent.progress).toBeGreaterThanOrEqual(0);
  expect(torrent.queuePosition).toBe(1);
  expect(torrent.ratio).toBe(0);
  // expect(torrent.savePath).toBe('/utorrent/data/incomplete');
  // expect(torrent.state).toBe(TorrentState.queued);
  expect(torrent.stateMessage).toBe('');
  expect(torrent.totalDownloaded).toBe(0);
  expect(torrent.totalPeers).toBe(0);
  expect(torrent.totalSeeds).toBe(0);
  // expect(torrent.totalSelected).toBe(1953349632);
  // expect(torrent.totalSize).toBe(1953349632);
  expect(torrent.totalUploaded).toBe(0);
  expect(torrent.uploadSpeed).toBe(0);
});
it('should add torrent with normalized response from magnet', async () => {
  const client = new Utorrent({ baseUrl });

  const torrent = await client.normalizedAddTorrent(magnet, {
    label: 'test',
  });
  expect(torrent.connectedPeers).toBe(0);
  expect(torrent.connectedSeeds).toBe(0);
  expect(torrent.downloadSpeed).toBe(0);
  // t.is(torrent.eta, 0);
  expect(torrent.isCompleted).toBe(false);
  expect(torrent.label).toBe('test');
  expect(torrent.name).toBe('Ubuntu 11 10 Alternate Amd64 Iso');
  expect(torrent.progress).toBeGreaterThanOrEqual(0);
  expect(torrent.queuePosition).toBe(1);
  expect(torrent.ratio).toBe(0);
  // t.is(torrent.savePath, '/utorrent/data/incomplete');
  // t.is(torrent.state, TorrentState.queued);
  expect(torrent.stateMessage).toBe('');
  expect(torrent.totalDownloaded).toBe(0);
  expect(torrent.totalPeers).toBe(0);
  expect(torrent.totalSeeds).toBe(0);
  // t.is(torrent.totalSelected, 1953349632);
  // t.is(torrent.totalSize, 1953349632);
  expect(torrent.totalUploaded).toBe(0);
  expect(torrent.uploadSpeed).toBe(0);
});
