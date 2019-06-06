# utorrent [![npm](https://img.shields.io/npm/v/@ctrl/utorrent.svg?maxAge=3600)](https://www.npmjs.com/package/@ctrl/utorrent) [![CircleCI](https://circleci.com/gh/TypeCtrl/utorrent.svg?style=svg)](https://circleci.com/gh/TypeCtrl/utorrent) [![coverage status](https://codecov.io/gh/typectrl/utorrent/branch/master/graph/badge.svg)](https://codecov.io/gh/typectrl/utorrent)

> TypeScript api wrapper for [utorrent](https://www.utorrent.com) using [got](https://github.com/sindresorhus/got)

### Install

```console
npm install @ctrl/utorrent
```

### Use

```ts
import { Utorrent } from '@ctrl/utorrent';

const client = new Utorrent({
  baseUrl: 'http://localhost:44822/',
  path: '/gui/',
  password: 'admin',
});

async function main() {
  const res = await client.getAllData();
  console.log(res);
}
```

### API

Docs: https://github.com/bittorrent/webui/wiki/Web-UI-API  
utorrent webui: https://github.com/bittorrent/webui/blob/master/webui.js  

### Normalized API
These functions have been normalized between torrent clients. Can easily support multiple torrent clients. See below for alternative supported torrent clients

##### getAllData
Returns all torrent data and an array of label objects. Data has been normalized and does not match the output of native `listTorrents()`.

```ts
const data = await client.getAllData();
console.log(data.torrents);
```

##### getTorrent
Returns one torrent data from hash id

```ts
const data = await client.getTorrent('torrent-hash');
console.log(data);
```

##### pauseTorrent and resumeTorrent
Pause or resume a torrent

```ts
const paused = await client.pauseTorrent('torrent-hash');
console.log(paused);
const resumed = await client.resumeTorrent('torrent-hash');
console.log(resumed);
```

##### removeTorrent
Remove a torrent. Does not remove data on disk by default.

```ts
// does not remove data on disk
const result = await client.removeTorrent('torrent_id', false);
console.log(result);

// remove data on disk
const res = await client.removeTorrent('torrent_id', true);
console.log(res);
```

### See Also
deluge - https://github.com/TypeCtrl/deluge  
transmission - https://github.com/TypeCtrl/transmission  
qbittorrent - https://github.com/TypeCtrl/qbittorrent  
