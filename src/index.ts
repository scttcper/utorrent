import { existsSync, readFileSync } from 'fs';
import { URLSearchParams } from 'url';

import FormData from 'form-data';
import got, { OptionsOfTextResponseBody, Response } from 'got';
import { Cookie } from 'tough-cookie';

import {
  AddTorrentOptions as NormalizedAddTorrentOptions,
  AllClientData,
  NormalizedTorrent,
  TorrentClient,
  TorrentSettings,
  TorrentState,
} from '@ctrl/shared-torrent';
import { hash } from '@ctrl/torrent-file';
import { urlJoin } from '@ctrl/url-join';

import {
  BaseResponse,
  RssUpdateResponse,
  SettingsResponse,
  TorrentData,
  TorrentListResponse,
  VersionResponse,
} from './types';

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
    return res.body;
  }

  async getVersion(): Promise<VersionResponse> {
    const res = await this.request<VersionResponse>('getversion');
    return res.body;
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
    return res.body;
  }

  async forceStartTorrent(hash: string): Promise<BaseResponse> {
    const params = new URLSearchParams();
    params.set('hash', hash);
    const res = await this.request<BaseResponse>('forcestart', params);
    return res.body;
  }

  async pauseTorrent(hash: string): Promise<BaseResponse> {
    const params = new URLSearchParams();
    params.set('hash', hash);
    const res = await this.request<BaseResponse>('pause', params);
    return res.body;
  }

  async stopTorrent(hash: string): Promise<BaseResponse> {
    const params = new URLSearchParams();
    params.set('hash', hash);
    const res = await this.request<BaseResponse>('stop', params);
    return res.body;
  }

  async queueUp(hash: string): Promise<BaseResponse> {
    const params = new URLSearchParams();
    params.set('hash', hash);
    const res = await this.request<BaseResponse>('queueup', params);
    return res.body;
  }

  async queueDown(hash: string): Promise<BaseResponse> {
    const params = new URLSearchParams();
    params.set('hash', hash);
    const res = await this.request<BaseResponse>('queuedown', params);
    return res.body;
  }

  async queueTop(hash: string): Promise<BaseResponse> {
    const params = new URLSearchParams();
    params.set('hash', hash);
    const res = await this.request<BaseResponse>('queuetop', params);
    return res.body;
  }

  async queueBottom(hash: string): Promise<BaseResponse> {
    const params = new URLSearchParams();
    params.set('hash', hash);
    const res = await this.request<BaseResponse>('queuebottom', params);
    return res.body;
  }

  async removeTorrent(hash: string, removeData = true): Promise<BaseResponse> {
    const params = new URLSearchParams();
    params.set('hash', hash);

    // decide action from remove torrent data
    let action = 'removetorrent';
    if (removeData) {
      action = 'removedatatorrent';
    }

    const res = await this.request<BaseResponse>(action, params);
    return res.body;
  }

  async setProps(hash: string, props: Record<string, string | number>): Promise<BaseResponse> {
    const params = new URLSearchParams();
    for (const prop of Object.entries(props)) {
      params.set(prop[0], prop[1].toString());
    }

    params.set('hash', hash);

    const res = await this.request<BaseResponse>('setprops', params);
    return res.body;
  }

  async normalizedAddTorrent(
    torrent: string | Buffer,
    options: Partial<NormalizedAddTorrentOptions> = {},
  ): Promise<NormalizedTorrent> {
    if (!Buffer.isBuffer(torrent)) {
      torrent = Buffer.from(torrent);
    }

    const torrentHash = await hash(torrent);

    await this.addTorrent(torrent);

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

    return this._normalizeTorrentData(torrentData);
  }

  async getAllData(): Promise<AllClientData> {
    const listTorrents = await this.listTorrents();
    const results: AllClientData = {
      torrents: [],
      labels: [],
    };

    for (const torrent of listTorrents.torrents) {
      const torrentData: NormalizedTorrent = this._normalizeTorrentData(torrent);
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

  async addTorrent(torrent: string | Buffer): Promise<BaseResponse> {
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
    if (typeof torrent === 'string') {
      if (existsSync(torrent)) {
        form.append('torrent_file', Buffer.from(readFileSync(torrent)), {
          contentType: 'application/x-bittorrent',
        });
      } else {
        form.append('torrent_file', Buffer.from(torrent, 'base64'), {
          contentType: 'application/x-bittorrent',
        });
      }
    } else {
      form.append('torrent_file', torrent, { contentType: 'application/x-bittorrent' });
    }

    const params = new URLSearchParams();
    params.set('download_dir', '0');
    params.set('path', '');
    params.set('action', 'add-file');
    params.set('token', this._token!);

    const url = urlJoin(this.config.baseUrl, this.config.path);

    const res = await got
      .post(url, {
        headers: {
          'Content-Type': undefined,
          Authorization: this._authorization(),
          Cookie: this._cookie?.cookieString(),
        },
        searchParams: params,
        body: form,
        retry: 0,
        timeout: this.config.timeout,
        agent: this.config.agent,
      })
      .json<BaseResponse>();

    return res;
  }

  /**
   * set a setting
   * @param settings settings to set [setting_name, value] as array of key value tuples
   */
  async setSetting(settings: Array<[string, string | number]>): Promise<BaseResponse> {
    const params = new URLSearchParams();
    for (const setting of settings) {
      params.append('s', setting[0]);
      params.append('v', setting[1].toString());
    }

    const res = await this.request<VersionResponse>('setsetting', params);
    return res.body;
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
    return res.body;
  }

  async rssRemove(id: number): Promise<BaseResponse> {
    const params = new URLSearchParams();
    params.set('feedid', id.toString());
    const res = await this.request<BaseResponse>('rss-remove', params);
    return res.body;
  }

  async listTorrents(): Promise<TorrentListResponse> {
    const params = new URLSearchParams();
    params.set('list', '1');
    const res = await this.request<TorrentListResponse>('', params);
    return res.body;
  }

  async connect(): Promise<void> {
    const url = urlJoin(this.config.baseUrl, this.config.path, '/token.html');

    const headers = {
      Authorization: this._authorization(),
    };
    const params = new URLSearchParams();
    params.set('t', Date.now().toString());
    const options: OptionsOfTextResponseBody = {
      headers,
      searchParams: params,
      retry: 0,
      responseType: 'text',
    };
    if (this.config.timeout) {
      options.timeout = this.config.timeout;
    }

    if (this.config.agent) {
      options.agent = this.config.agent;
    }

    const res = await got.get(url, options);
    this._cookie = Cookie.parse(res.headers?.['set-cookie']?.[0] ?? '');
    // example token response
    // <html><div id='token' style='display:none;'>gBPEW_SyrgB-RSmF3tZvqSsK9Ht7jk4uAAAAAC61XoYAAAAATyqNE_uq8lwAAAAA</div></html>
    const regex = />([^<]+)</;
    const match = regex.exec(res.body);
    if (match) {
      this._token = match[match.length - 1];
      return;
    }

    throw new Error('Valid token not found');
  }

  // eslint-disable-next-line @typescript-eslint/ban-types
  async request<T extends object>(
    action: string,
    params: URLSearchParams = new URLSearchParams(),
  ): Promise<Response<T>> {
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
    params.set('t', Date.now().toString());
    // allows action to be an empty string
    if (action) {
      params.set('action', action);
    }

    const url = urlJoin(this.config.baseUrl, this.config.path);
    return got.get<T>(url, {
      headers: {
        Authorization: this._authorization(),
        Cookie: this._cookie?.cookieString(),
      },
      searchParams: params,
      retry: 0,
      timeout: this.config.timeout,
      agent: this.config.agent,
      responseType: 'json',
    });
  }

  private _authorization(): string {
    const str = `${this.config.username ?? ''}:${this.config.password ?? ''}`;
    const encoded = Buffer.from(str).toString('base64');
    return 'Basic ' + encoded;
  }

  private _normalizeTorrentData(torrent: TorrentData): NormalizedTorrent {
    const torrentState: number = torrent[1];
    const progress: number = torrent[4] / 100;
    const done = progress >= 100;
    const isCompleted = progress >= 100;

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
      dateAdded: new Date(torrent[23]).toISOString(),
      dateCompleted: new Date(torrent[24]).toISOString(),
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
    };
    return result;
  }
}

const STATE_STARTED = 1;
const STATE_CHECKING = 2;
const STATE_ERROR = 16;
const STATE_PAUSED = 32;
const STATE_QUEUED = 64;
