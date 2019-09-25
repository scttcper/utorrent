import path from 'path';
import fs from 'fs';

import { Utorrent } from '../src/index';

const baseUrl = process.env.BASE_URL || 'http://localhost:44822/';
const torrentName = 'ubuntu-18.04.1-desktop-amd64.iso';
const torrentFile = path.join(__dirname, '/ubuntu-18.04.1-desktop-amd64.iso.torrent');

async function setupTorrent(client: Utorrent): Promise<string> {
  await client.addTorrent(torrentFile);
  const res = await client.listTorrents();
  expect(res.torrents).toHaveLength(1);
  return res.torrents[0][0];
}

describe('Ubuntu', () => {
  afterEach(async () => {
    const client = new Utorrent({ baseUrl });
    const res = await client.listTorrents();
    for (const torrent of res.torrents) {
      // clean up all torrents
      await client.removeTorrent(torrent[0]);
    }
  });
  it('should be instantiable', () => {
    const client = new Utorrent({ baseUrl });
    expect(client).toBeTruthy();
  });
  it('should connect', async () => {
    const client = new Utorrent({ baseUrl });
    await client.connect();
    expect((client as any)._token.length).toBeGreaterThan(0);
  });
  it('should disconnect', async () => {
    const client = new Utorrent({ baseUrl });
    await client.connect();
    client.resetSession();
    expect((client as any)._token).toBeUndefined();
  });
  it('should add torrent', async () => {
    const client = new Utorrent({ baseUrl });
    await client.addTorrent(fs.readFileSync(torrentFile));
    const res = await client.listTorrents();
    expect(res.torrents).toHaveLength(1);
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
    expect(res.torrents[0][2]).toBe(torrentName);
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
    const torrent = res.torrents[0];
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
    expect(torrent.totalSelected).toBe(1953349632);
    expect(torrent.totalSize).toBe(1953349632);
    expect(torrent.totalUploaded).toBe(0);
    expect(torrent.uploadSpeed).toBe(0);
  });
  it('should add torrent with normalized response', async () => {
    const client = new Utorrent({ baseUrl });

    const torrent = await client.normalizedAddTorrent(fs.readFileSync(torrentFile), {
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
    expect(torrent.totalSelected).toBe(1953349632);
    expect(torrent.totalSize).toBe(1953349632);
    expect(torrent.totalUploaded).toBe(0);
    expect(torrent.uploadSpeed).toBe(0);
  });
});
