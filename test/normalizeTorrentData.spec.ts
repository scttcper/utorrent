import { TorrentState } from '@ctrl/shared-torrent';
import { expect, it } from 'vitest';

import { normalizeTorrentData } from '../src/normalizeTorrentData.js';
import type { TorrentData } from '../src/types.js';

const baseTorrent: TorrentData = [
  'ABCDEF0123456789ABCDEF0123456789ABCDEF01',
  1,
  'test.torrent',
  1000,
  500,
  500,
  0,
  0,
  0,
  0,
  0,
  '',
  0,
  0,
  0,
  0,
  0,
  1,
  500,
  '',
  '',
  '',
  '',
  1_700_000_000,
  0,
  '',
  '/downloads',
  0,
  '',
  false,
];

it('normalizes uTorrent progress from tenths of a percent', () => {
  const torrent = normalizeTorrentData(baseTorrent);

  expect(torrent.progress).toBe(50);
  expect(torrent.isCompleted).toBe(false);
  expect(torrent.state).toBe(TorrentState.downloading);
  expect(torrent.totalSize).toBe(1000);
  expect(torrent.totalSelected).toBe(1000);
  expect(torrent.dateCompleted).toBeUndefined();
});

it('classifies a completed started torrent as seeding', () => {
  const torrentData: TorrentData = [...baseTorrent];
  torrentData[4] = 1000;
  torrentData[18] = 0;
  torrentData[24] = 1_700_000_100;

  const torrent = normalizeTorrentData(torrentData);

  expect(torrent.progress).toBe(100);
  expect(torrent.isCompleted).toBe(true);
  expect(torrent.state).toBe(TorrentState.seeding);
  expect(torrent.dateCompleted).toBe('2023-11-14T22:15:00.000Z');
});
