# utorrent

[![npm](https://badgen.net/npm/v/@ctrl/utorrent)](https://www.npmjs.com/package/@ctrl/utorrent)
[![coverage](https://badgen.net/codecov/c/github/scttcper/utorrent)](https://codecov.io/gh/scttcper/utorrent)

> TypeScript api wrapper for [utorrent](https://www.utorrent.com) using [ofetch](https://github.com/unjs/ofetch)

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

### Persisting auth state (export/restore)

You can persist the authenticated session between runs to avoid logging in every time. Use `exportState()` to serialize, and `Utorrent.createFromState()` to restore.

```ts
import { Utorrent } from '@ctrl/utorrent';

// First run: create client, it will authenticate on first request
const client = new Utorrent({
  baseUrl: 'http://localhost:44822/',
  path: '/gui/',
  password: 'admin',
});

// After doing some work, save state (persist somewhere, e.g., file/db)
const stateJson = client.exportState();
// Example: write to disk
// await fs.promises.writeFile('utorrent-state.json', JSON.stringify(stateJson));

// Next run: restore from saved state
// const saved = JSON.parse(await fs.promises.readFile('utorrent-state.json', 'utf8'));
const restored = Utorrent.createFromState(
  {
    baseUrl: 'http://localhost:44822/',
    path: '/gui/',
    password: 'admin',
  },
  stateJson,
);

// Use the restored client; it will reuse cookie/token until expiry
const data = await restored.getAllData();
console.log(data.torrents.length);
```

### API

DOCS: https://utorrent.vercel.app
utorrent webui: https://github.com/bittorrent/webui/blob/master/webui.js  
another webui link: https://github.com/bittorrent/webui/wiki/Web-UI-API

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

deluge - https://github.com/scttcper/deluge  
transmission - https://github.com/scttcper/transmission  
qbittorrent - https://github.com/scttcper/qbittorrent  

### Start a test docker container

```
docker run                                            \
    --name utorrent                                   \
    -v ~/Documents/utorrentt:/data                    \
    -p 8080:8080                                      \
    -p 6881:6881                                      \
    -p 6881:6881/udp                                  \
    ekho/utorrent:latest
```
