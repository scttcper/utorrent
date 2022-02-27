import { readFileSync } from 'node:fs';
import path from 'node:path';

import test, { ExecutionContext } from 'ava';

import { Utorrent } from '../src/index.js';

const baseUrl = process.env['BASE_URL'] ?? 'http://localhost:8080/';
const torrentName = 'ubuntu-18.04.1-desktop-amd64.iso';
const dirname = new URL('.', import.meta.url).pathname;
const torrentFile = path.join(dirname, '/ubuntu-18.04.1-desktop-amd64.iso.torrent');
const magnet =
  'magnet:?xt=urn:btih:B0B81206633C42874173D22E564D293DAEFC45E2&dn=Ubuntu+11+10+Alternate+Amd64+Iso&tr=udp%3A%2F%2Ftracker.coppersurfer.tk%3A6969%2Fannounce&tr=udp%3A%2F%2F9.rarbg.to%3A2710%2Fannounce&tr=udp%3A%2F%2Ftracker.opentrackr.org%3A1337%2Fannounce&tr=udp%3A%2F%2Ftracker.leechers-paradise.org%3A6969%2Fannounce&tr=udp%3A%2F%2Ftracker.open-internet.nl%3A6969%2Fannounce&tr=udp%3A%2F%2Fopen.demonii.si%3A1337%2Fannounce&tr=udp%3A%2F%2Ftracker.pirateparty.gr%3A6969%2Fannounce&tr=udp%3A%2F%2Fdenis.stalker.upeer.me%3A6969%2Fannounce&tr=udp%3A%2F%2Fp4p.arenabg.com%3A1337%2Fannounce&tr=udp%3A%2F%2Fexodus.desync.com%3A6969%2Fannounce';

async function setupTorrent(client: Utorrent, t: ExecutionContext): Promise<string> {
  await client.addTorrent(torrentFile);
  const res = await client.listTorrents();
  t.is(res.torrents.length, 1);
  return res.torrents[0]![0];
}

test.afterEach(async () => {
  const client = new Utorrent({ baseUrl });
  const res = await client.listTorrents();
  for (const torrent of res.torrents) {
    // clean up all torrents
    // eslint-disable-next-line no-await-in-loop
    await client.removeTorrent(torrent[0]);
  }
});
test('should be instantiable', t => {
  const client = new Utorrent({ baseUrl });
  t.truthy(client);
});
test.serial('should connect', async t => {
  const client = new Utorrent({ baseUrl });
  await client.connect();
  t.assert((client as any)._token.length > 0);
});
test.serial('should disconnect', async t => {
  const client = new Utorrent({ baseUrl });
  await client.connect();
  client.resetSession();
  t.is((client as any)._token, undefined);
});
test.serial('should add torrent from buffer', async t => {
  const client = new Utorrent({ baseUrl });
  await client.addTorrent(readFileSync(torrentFile));
  const res = await client.listTorrents();
  t.is(res.torrents.length, 1);
});
test.serial('should add torrent from path', async t => {
  const client = new Utorrent({ baseUrl });
  await client.addTorrent(torrentFile);
  const res = await client.listTorrents();
  t.is(res.torrents.length, 1);
});
test.serial('should add torrent from string', async t => {
  const client = new Utorrent({ baseUrl });
  await client.addTorrent(readFileSync(torrentFile).toString('base64'));
  const res = await client.listTorrents();
  t.is(res.torrents.length, 1);
});
test.serial('should get settings', async t => {
  const client = new Utorrent({ baseUrl });
  const res = await client.getSettings();
  t.assert(res.settings instanceof Array);
});
test.serial('should list torrents', async t => {
  const client = new Utorrent({ baseUrl });
  await setupTorrent(client, t);
  const res = await client.listTorrents();
  t.is(res.torrents.length, 1);
  t.is(res.torrents[0]?.[2], torrentName);
});
test.serial('should move torrents in queue', async t => {
  const client = new Utorrent({ baseUrl });
  const key = await setupTorrent(client, t);
  await client.queueUp(key);
  await client.queueDown(key);
  await client.queueTop(key);
  await client.queueBottom(key);
});
test.serial('should remove torrent', async t => {
  const client = new Utorrent({ baseUrl });
  const key = await setupTorrent(client, t);
  await client.removeTorrent(key);
  const res = await client.listTorrents();
  t.is(res.torrents.length, 0);
});
test.serial('should return normalized torrent data', async t => {
  const client = new Utorrent({ baseUrl });
  await setupTorrent(client, t);
  const res = await client.getAllData();
  const torrent = res.torrents[0]!;
  t.is(torrent.connectedPeers, 0);
  t.is(torrent.connectedSeeds, 0);
  t.is(torrent.downloadSpeed, 0);
  // t.is(torrent.eta, 0);
  t.is(torrent.isCompleted, false);
  t.is(torrent.label, '');
  t.is(torrent.name, torrentName);
  t.assert(torrent.progress >= 0);
  t.is(torrent.queuePosition, 1);
  t.is(torrent.ratio, 0);
  // t.is(torrent.savePath, '/utorrent/data/incomplete');
  // t.is(torrent.state, TorrentState.queued);
  t.is(torrent.stateMessage, '');
  t.is(torrent.totalDownloaded, 0);
  t.is(torrent.totalPeers, 0);
  t.is(torrent.totalSeeds, 0);
  // t.is(torrent.totalSelected, 1953349632);
  // t.is(torrent.totalSize, 1953349632);
  t.is(torrent.totalUploaded, 0);
  t.is(torrent.uploadSpeed, 0);
});
test.serial('should add torrent with normalized response', async t => {
  const client = new Utorrent({ baseUrl });

  const torrent = await client.normalizedAddTorrent(readFileSync(torrentFile), {
    label: 'test',
  });
  t.is(torrent.connectedPeers, 0);
  t.is(torrent.connectedSeeds, 0);
  t.is(torrent.downloadSpeed, 0);
  // t.is(torrent.eta, 0);
  t.is(torrent.isCompleted, false);
  t.is(torrent.label, 'test');
  t.is(torrent.name, torrentName);
  t.assert(torrent.progress >= 0);
  t.is(torrent.queuePosition, 1);
  t.is(torrent.ratio, 0);
  // t.is(torrent.savePath, '/utorrent/data/incomplete');
  // t.is(torrent.state, TorrentState.queued);
  t.is(torrent.stateMessage, '');
  t.is(torrent.totalDownloaded, 0);
  t.is(torrent.totalPeers, 0);
  t.is(torrent.totalSeeds, 0);
  // t.is(torrent.totalSelected, 1953349632);
  // t.is(torrent.totalSize, 1953349632);
  t.is(torrent.totalUploaded, 0);
  t.is(torrent.uploadSpeed, 0);
});
test.serial('should add torrent with normalized response from magnet', async t => {
  const client = new Utorrent({ baseUrl });

  const torrent = await client.normalizedAddTorrent(magnet, {
    label: 'test',
  });
  t.is(torrent.connectedPeers, 0);
  t.is(torrent.connectedSeeds, 0);
  t.is(torrent.downloadSpeed, 0);
  // t.is(torrent.eta, 0);
  t.is(torrent.isCompleted, false);
  t.is(torrent.label, 'test');
  t.is(torrent.name, 'Ubuntu 11 10 Alternate Amd64 Iso');
  t.assert(torrent.progress >= 0);
  t.is(torrent.queuePosition, 1);
  t.is(torrent.ratio, 0);
  // t.is(torrent.savePath, '/utorrent/data/incomplete');
  // t.is(torrent.state, TorrentState.queued);
  t.is(torrent.stateMessage, '');
  t.is(torrent.totalDownloaded, 0);
  t.is(torrent.totalPeers, 0);
  t.is(torrent.totalSeeds, 0);
  // t.is(torrent.totalSelected, 1953349632);
  // t.is(torrent.totalSize, 1953349632);
  t.is(torrent.totalUploaded, 0);
  t.is(torrent.uploadSpeed, 0);
});
