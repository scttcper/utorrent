import { Readable } from 'stream';

import { FormDataEncoder } from 'form-data-encoder';
import { FormData } from 'node-fetch-native';
import { ofetch } from 'ofetch';
import { Cookie } from 'tough-cookie';
import { joinURL } from 'ufo';
import {
  base64ToUint8Array,
  isUint8Array,
  stringToBase64,
  stringToUint8Array,
} from 'uint8array-extras';

import { magnetDecode } from '@ctrl/magnet-link';
import type {
  AddTorrentOptions as NormalizedAddTorrentOptions,
  AllClientData,
  NormalizedTorrent,
  TorrentClient,
  TorrentSettings,
} from '@ctrl/shared-torrent';
import { hash } from '@ctrl/torrent-file';

import { normalizeTorrentData } from './normalizeTorrentData.js';
import type {
  BaseResponse,
  RssUpdateResponse,
  SettingsResponse,
  TorrentListResponse,
  VersionResponse,
} from './types.js';

const defaults: TorrentSettings = {
  baseUrl: 'http://localhost:44822/',
  path: '/gui/',
  username: 'admin',
  password: '',
  timeout: 5000,
};

export class Utorrent implements TorrentClient {
  config: TorrentSettings;

  private _token?: string;

  private _cookie?: Cookie;

  constructor(options: Partial<TorrentSettings> = {}) {
    this.config = { ...defaults, ...options };
  }

  resetSession(): void {
    this._token = undefined;
    this._cookie = undefined;
  }

  async getSettings(): Promise<SettingsResponse> {
    const res = await this.request<SettingsResponse>('getsettings');
    return res._data!;
  }

  async getVersion(): Promise<VersionResponse> {
    const res = await this.request<VersionResponse>('getversion');
    return res._data!;
  }

  /**
   * alias of unpause, resumes a torrent
   */
  async resumeTorrent(hash: string): Promise<BaseResponse> {
    return this.unpause(hash);
  }

  async unpause(hash: string): Promise<BaseResponse> {
    const params = new URLSearchParams();
    params.set('hash', hash);
    const res = await this.request<BaseResponse>('unpause', params);
    return res._data!;
  }

  async forceStartTorrent(hash: string): Promise<BaseResponse> {
    const params = new URLSearchParams();
    params.set('hash', hash);
    const res = await this.request<BaseResponse>('forcestart', params);
    return res._data!;
  }

  async pauseTorrent(hash: string): Promise<BaseResponse> {
    const params = new URLSearchParams();
    params.set('hash', hash);
    const res = await this.request<BaseResponse>('pause', params);
    return res._data!;
  }

  async stopTorrent(hash: string): Promise<BaseResponse> {
    const params = new URLSearchParams();
    params.set('hash', hash);
    const res = await this.request<BaseResponse>('stop', params);
    return res._data!;
  }

  async queueUp(hash: string): Promise<BaseResponse> {
    const params = new URLSearchParams();
    params.set('hash', hash);
    const res = await this.request<BaseResponse>('queueup', params);
    return res._data!;
  }

  async queueDown(hash: string): Promise<BaseResponse> {
    const params = new URLSearchParams();
    params.set('hash', hash);
    const res = await this.request<BaseResponse>('queuedown', params);
    return res._data!;
  }

  async queueTop(hash: string): Promise<BaseResponse> {
    const params = new URLSearchParams();
    params.set('hash', hash);
    const res = await this.request<BaseResponse>('queuetop', params);
    return res._data!;
  }

  async queueBottom(hash: string): Promise<BaseResponse> {
    const params = new URLSearchParams();
    params.set('hash', hash);
    const res = await this.request<BaseResponse>('queuebottom', params);
    return res._data!;
  }

  /**
   * @param removeData (default: false) If true, remove the data from disk
   */
  async removeTorrent(hash: string, removeData = false): Promise<BaseResponse> {
    const params = new URLSearchParams();
    params.set('hash', hash);

    // decide action from remove torrent data
    let action = 'removetorrent';
    if (removeData) {
      action = 'removedatatorrent';
    }

    const res = await this.request<BaseResponse>(action, params);
    return res._data!;
  }

  async setProps(hash: string, props: Record<string, string | number>): Promise<BaseResponse> {
    const params = new URLSearchParams();
    for (const prop of Object.entries(props)) {
      params.set(prop[0], prop[1].toString());
    }

    params.set('hash', hash);

    const res = await this.request<BaseResponse>('setprops', params);
    return res._data!;
  }

  async normalizedAddTorrent(
    torrent: string | Uint8Array,
    options: Partial<NormalizedAddTorrentOptions> = {},
  ): Promise<NormalizedTorrent> {
    let torrentHash: string | undefined;
    if (typeof torrent === 'string' && torrent.startsWith('magnet:')) {
      torrentHash = magnetDecode(torrent).infoHash;
      if (!torrentHash) {
        throw new Error('Magnet did not contain hash');
      }

      await this.addTorrentFromUrl(torrent);
    } else {
      if (!isUint8Array(torrent)) {
        torrent = stringToUint8Array(torrent);
      }

      torrentHash = await hash(torrent);
      await this.addTorrent(torrent);
    }

    if (options.startPaused) {
      await this.pauseTorrent(torrentHash);
    }

    if (options.label) {
      await this.setProps(torrentHash, {
        s: 'label',
        v: options.label,
      });
    }

    return this.getTorrent(torrentHash);
  }

  async getTorrent(id: string): Promise<NormalizedTorrent> {
    const listResponse = await this.listTorrents();
    const torrentData = listResponse.torrents.find(n => n[0].toLowerCase() === id.toLowerCase());
    if (!torrentData) {
      throw new Error('Torrent not found');
    }

    return normalizeTorrentData(torrentData);
  }

  async getAllData(): Promise<AllClientData> {
    const listTorrents = await this.listTorrents();
    const results: AllClientData = {
      torrents: [],
      labels: [],
      raw: listTorrents,
    };

    for (const torrent of listTorrents.torrents) {
      const torrentData: NormalizedTorrent = normalizeTorrentData(torrent);
      results.torrents.push(torrentData);
    }

    for (const label of listTorrents.label) {
      results.labels.push({
        id: label[0],
        name: label[0],
        count: label[1],
      });
    }

    return results;
  }

  async addTorrent(torrent: string | Uint8Array): Promise<BaseResponse> {
    if (this._cookie) {
      // eslint-disable-next-line new-cap
      if (this._cookie.TTL() < 5000) {
        this.resetSession();
      }
    }

    if (!this._token) {
      await this.connect();
    }

    const form = new FormData();
    const type = { type: 'application/x-bittorrent' };
    if (typeof torrent === 'string') {
      form.set('torrent_file', new File([base64ToUint8Array(torrent)], 'file.torrent', type));
    } else {
      const file = new File([torrent], 'file.torrent', type);
      form.set('torrent_file', file);
    }

    const params = new URLSearchParams();
    params.set('download_dir', '0');
    params.set('path', '');
    params.set('action', 'add-file');
    params.set('token', this._token!);

    const url = joinURL(this.config.baseUrl, this.config.path ?? '') + '?' + params.toString();

    const encoder = new FormDataEncoder(form);
    const res = await ofetch.raw<BaseResponse>(url, {
      method: 'POST',
      headers: {
        Authorization: this._authorization(),
        Cookie: this._cookie?.cookieString() ?? '',
        ...encoder.headers,
      },
      body: Readable.from(encoder.encode()),
      retry: 0,
      timeout: this.config.timeout,
      responseType: 'json',
      // @ts-expect-error agent is not in the type
      agent: this.config.agent,
    });

    return res._data!;
  }

  /**
   * Add torrent from url, probably a magnet
   */
  async addTorrentFromUrl(urlOrMagnet: string): Promise<BaseResponse> {
    const params = new URLSearchParams();
    params.append('s', urlOrMagnet);
    const res = await this.request<BaseResponse>('add-url', params);
    return res._data!;
  }

  /**
   * set a setting
   * @param settings settings to set [setting_name, value] as array of key value tuples
   */
  async setSetting(settings: [string, string | number][]): Promise<BaseResponse> {
    const params = new URLSearchParams();
    for (const setting of settings) {
      params.append('s', setting[0]);
      params.append('v', setting[1].toString());
    }

    const res = await this.request<VersionResponse>('setsetting', params);
    return res._data!;
  }

  /**
   * subscribe to rss feed
   * @param url feed url
   * @param [id] id of rss feed to update, -1 for new feed
   * @param [alias] custom alias
   * @param [subscribe] Automatically download all items published in feed
   * @param [smartFilter] Use smart episode filter
   * @param [enabled] disable / enable an rss feed
   */
  // eslint-disable-next-line max-params
  async rssUpdate(
    url: string,
    id = -1,
    alias = '',
    subscribe = false,
    smartFilter = false,
    enabled = true,
  ): Promise<RssUpdateResponse> {
    const params = new URLSearchParams();
    params.set('url', url);
    params.set('alias', alias);
    params.set('feed-id', id.toString());
    params.set('subscribe', Number(subscribe).toString());
    params.set('smart-filter', Number(smartFilter).toString());
    params.set('enabled', JSON.stringify(enabled));
    const res = await this.request<RssUpdateResponse>('rss-update', params);
    return res._data!;
  }

  async rssRemove(id: number): Promise<BaseResponse> {
    const params = new URLSearchParams();
    params.set('feedid', id.toString());
    const res = await this.request<BaseResponse>('rss-remove', params);
    return res._data!;
  }

  async listTorrents(): Promise<TorrentListResponse> {
    const params = new URLSearchParams();
    params.set('list', '1');
    const res = await this.request<TorrentListResponse>('', params);
    return res._data!;
  }

  async connect(): Promise<void> {
    const url = joinURL(this.config.baseUrl, this.config.path ?? '', '/token.html');

    const headers = {
      Authorization: this._authorization(),
    };
    const params = new URLSearchParams();
    params.set('t', Date.now().toString());
    const options: Parameters<typeof ofetch.raw>[1] = {
      headers,
      params,
      retry: 0,
      responseType: 'text',
    };
    if (this.config.timeout) {
      options.timeout = this.config.timeout;
    }

    if (this.config.agent) {
      // @ts-expect-error agent is not in the type
      options.agent = this.config.agent;
    }

    const res = await ofetch.raw(url, options);
    this._cookie = Cookie.parse(res.headers.get('set-cookie') ?? '');
    // example token response
    // <html><div id='token' style='display:none;'>gBPEW_SyrgB-RSmF3tZvqSsK9Ht7jk4uAAAAAC61XoYAAAAATyqNE_uq8lwAAAAA</div></html>
    const regex = />([^<]+)</;
    const match = regex.exec(res._data);
    if (match) {
      this._token = match[1];
      return;
    }

    throw new Error('Valid token not found');
  }

  async request<T extends object>(
    action: string,
    params: URLSearchParams = new URLSearchParams(),
  ): Promise<ReturnType<typeof ofetch.raw<T>>> {
    if (this._cookie) {
      // eslint-disable-next-line new-cap
      if (this._cookie.TTL() < 5000) {
        this.resetSession();
      }
    }

    if (!this._token) {
      await this.connect();
    }

    params.set('token', this._token!);
    // params.set('t', Date.now().toString());
    // allows action to be an empty string
    if (action) {
      params.set('action', action);
    }

    const url = joinURL(this.config.baseUrl, this.config.path ?? '') + '?' + params.toString();
    const res = await ofetch.raw<T>(url, {
      method: 'GET',
      headers: {
        Authorization: this._authorization(),
        Cookie: this._cookie?.cookieString() ?? '',
      },
      retry: 0,
      timeout: this.config.timeout,
      responseType: 'json',
      parseResponse: JSON.parse,
      // @ts-expect-error agent is not in the type
      agent: this.config.agent,
    });

    return res;
  }

  private _authorization(): string {
    const str = `${this.config.username ?? ''}:${this.config.password ?? ''}`;
    const encoded = stringToBase64(str);
    return 'Basic ' + encoded;
  }
}
