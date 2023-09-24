import { NormalizedTorrent, TorrentState } from '@ctrl/shared-torrent';

import { TorrentData } from './types.js';

const STATE_STARTED = 1;
const STATE_CHECKING = 2;
const STATE_ERROR = 16;
const STATE_PAUSED = 32;
const STATE_QUEUED = 64;

export function normalizeTorrentData(torrent: TorrentData): NormalizedTorrent {
  const torrentState: number = torrent[1];
  const progress: number = torrent[4] / 100;
  const done = progress >= 100;
  const isCompleted = progress >= 100;

  // TODO: Convert from bitwise

  let state = TorrentState.unknown;
  if (torrentState & STATE_PAUSED) {
    // paused
    state = TorrentState.paused;
  } else if (torrentState & STATE_STARTED) {
    // started, seeding or leeching
    if (done) {
      state = TorrentState.seeding;
    } else {
      state = TorrentState.downloading;
    }
    // if (!(torrentState & STATE_QUEUED)) {
    //   // forced start
    //   res[1] = '[F] ' + res[1];
    // }
  } else if (torrentState & STATE_CHECKING) {
    // checking
    state = TorrentState.checking;
  } else if (torrentState & STATE_ERROR) {
    // error
    state = TorrentState.error;
  } else if (torrentState & STATE_QUEUED) {
    // queued
    state = TorrentState.queued;
  } else if (done) {
    // finished
    state = TorrentState.paused;
  } else {
    // stopped
    state = TorrentState.paused;
  }

  const result: NormalizedTorrent = {
    id: torrent[0].toLowerCase(),
    name: torrent[2],
    state,
    isCompleted,
    stateMessage: '',
    progress,
    ratio: torrent[7] / 1000,
    dateAdded: new Date(torrent[23] * 1000).toISOString(),
    dateCompleted: new Date(torrent[24] * 1000).toISOString(),
    label: torrent[11],
    savePath: torrent[26],
    uploadSpeed: torrent[8],
    downloadSpeed: torrent[9],
    eta: torrent[10],
    queuePosition: torrent[17],
    connectedPeers: torrent[12],
    connectedSeeds: torrent[14],
    totalPeers: torrent[13],
    totalSeeds: torrent[15],
    totalSelected: torrent[18],
    totalSize: torrent[3],
    totalUploaded: torrent[6],
    totalDownloaded: torrent[5],
    raw: torrent,
  };
  return result;
}
