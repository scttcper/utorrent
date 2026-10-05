# utorrent [![npm](https://badgen.net/npm/v/@ctrl/utorrent)](https://www.npmjs.com/package/@ctrl/utorrent)

> TypeScript api wrapper for [utorrent](https://www.utorrent.com) using [ofetch](https://github.com/unjs/ofetch)

### Install

```console
npm install @ctrl/utorrent
```

Requires Node.js 22 or newer.

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

DOCS: https://utorrent.ep.workers.dev  
utorrent webui: https://github.com/bittorrent/webui/blob/master/webui.js  
another webui link: https://github.com/bittorrent/webui/wiki/Web-UI-API

Things that work differently from the other clients:

- uTorrent can't add a torrent paused, `startPaused` pauses it right after adding

### Normalized API

These functions are normalized through [@ctrl/shared-torrent](https://github.com/scttcper/shared-torrent), which makes it easier to support multiple torrent clients. See [below](#see-also) for alternative supported torrent clients.

##### getAllData

Returns all torrent data and an array of label objects. Data has been normalized and does not match the output of native `listTorrents()`.

```ts
const data = await client.getAllData();
console.log(data.torrents);
```

##### getTorrent

Returns one torrent data from torrent hash

```ts
const data = await client.getTorrent('torrent-hash');
console.log(data);
```

##### pauseTorrent and resumeTorrent

Pause or resume one or more torrents

```ts
await client.pauseTorrent('torrent-hash');
await client.resumeTorrent(['torrent-hash', 'other-torrent-hash']);
```

##### removeTorrent

Remove one or more torrents, throws if a torrent doesn't exist. Does not remove data on disk by default.

```ts
// does not remove data on disk
await client.removeTorrent('torrent-hash', false);

// remove data on disk
await client.removeTorrent(['torrent-hash', 'other-torrent-hash'], true);
```

##### queueUp and queueDown

Move a torrent up or down the queue

```ts
await client.queueUp('torrent-hash');
await client.queueDown('torrent-hash');
```

##### addTorrent

Add a torrent from a magnet link or torrent file, has client specific options. Also see normalizedAddTorrent

```ts
import { readFileSync } from 'node:fs';

const result = await client.addTorrent(new Uint8Array(readFileSync('./linux.torrent')));
console.log(result);
```

##### normalizedAddTorrent

Add a torrent and return normalized torrent data, can start a torrent paused and add label

```ts
const result = await client.normalizedAddTorrent('magnet:?xt=urn:btih:...', {
  startPaused: false,
  label: 'linux',
});
console.log(result);
```

##### export and create from state

See [persisting auth state](#persisting-auth-state-exportrestore) above for `exportState()` and `Utorrent.createFromState()`.

### See Also

All of the following npm modules provide the same normalized functions along with supporting the unique apis for each client.

- shared types - [@ctrl/shared-torrent](https://github.com/scttcper/shared-torrent)
- deluge - [@ctrl/deluge](https://github.com/scttcper/deluge)
- transmission - [@ctrl/transmission](https://github.com/scttcper/transmission)
- qbittorrent - [@ctrl/qbittorrent](https://github.com/scttcper/qbittorrent)
- rtorrent - [@ctrl/rtorrent](https://github.com/scttcper/rtorrent)
- rqbit - [@ctrl/rqbit](https://github.com/scttcper/rqbit)

Usenet clients with the same normalized approach:

- usenet shared types - [@ctrl/shared-usenet](https://github.com/scttcper/shared-usenet)
- nzbget - [@ctrl/nzbget](https://github.com/scttcper/nzbget)
- sabnzbd - [@ctrl/sabnzbd](https://github.com/scttcper/sabnzbd)

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
