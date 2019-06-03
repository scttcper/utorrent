/* eslint-disable max-params */
import urljoin from 'url-join';
import got, { Response, GotJSONOptions, GotBodyOptions, GotOptions, GotFormOptions } from 'got';
import { Cookie } from 'tough-cookie';
import urlJoin from 'url-join';
import fs from 'fs';
import { TorrentSettings, TorrentClient } from '@ctrl/shared-torrent';
import { request } from 'http';
import FormData from 'form-data';
import { VersionResponse, SettingsResponse, BaseResponse, RssUpdateResponse } from './types';
import { URLSearchParams } from 'url';

const defaults: TorrentSettings = {
  baseUrl: 'http://localhost:8080/',
  path: '/gui/',
  username: 'admin',
  password: '',
  timeout: 5000,
};

export class Utorrent {
  config: TorrentSettings;

  private _token?: string;

  private _cookie?: Cookie;

  constructor(options: Partial<TorrentSettings> = {}) {
    this.config = { ...defaults, ...options };
  }

  resetSession() {
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

  async startTorrent(hash: string): Promise<BaseResponse> {
    const params = new URLSearchParams();
    params.set('hash', hash);
    const res = await this.request<BaseResponse>('pause', params);
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
    const res = await this.request<BaseResponse>('start', params);
    return res.body;
  }

  async stopTorrent(hash: string): Promise<BaseResponse> {
    const params = new URLSearchParams();
    params.set('hash', hash);
    const res = await this.request<BaseResponse>('stop', params);
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
      if (fs.existsSync(torrent)) {
        form.append('torrent_file', Buffer.from(fs.readFileSync(torrent)), {
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
    params.set('token', this._token as string);

    const url = urlJoin(this.config.baseUrl, this.config.path);
    const options: GotBodyOptions<any> = {
      headers: {
        'Content-Type': undefined,
        Authorization: this._authorization(),
        Cookie: this._cookie && this._cookie.cookieString(),
      },
      query: params,
      body: form,
      retry: 0,
    };
    if (this.config.timeout) {
      options.timeout = this.config.timeout;
    }

    if (this.config.agent) {
      options.agent = this.config.agent;
    }

    const res = await got.post(url, options);
    return JSON.parse(res.body);
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
    params.set('enabled', enabled.toString());
    const res = await this.request<RssUpdateResponse>('rss-update', params);
    return res.body;
  }

  async rssRemove(id: number) {
    const params = new URLSearchParams();
    params.set('feedid', id.toString());
    const res = await this.request<BaseResponse>('rss-remove', params);
    return res.body;
  }

  async listTorrents() {}

  async connect(): Promise<void> {
    const url = urlJoin(this.config.baseUrl, this.config.path, '/token.html');

    const headers = {
      Authorization: this._authorization(),
    };
    const params = new URLSearchParams();
    params.set('t', Date.now().toString());
    const options: any = {
      headers,
      query: params,
      retry: 0,
    };
    if (this.config.timeout) {
      options.timeout = this.config.timeout;
    }

    if (this.config.agent) {
      options.agent = this.config.agent;
    }

    const res = await got.get(url, options);
    this._cookie = Cookie.parse(
      (res.headers && res.headers['set-cookie'] && res.headers['set-cookie'][0]) || '',
    );
    // example token response
    // <html><div id='token' style='display:none;'>gBPEW_SyrgB-RSmF3tZvqSsK9Ht7jk4uAAAAAC61XoYAAAAATyqNE_uq8lwAAAAA</div></html>
    const regex = />([^<]+)</;
    const match = res.body.match(regex);
    if (match) {
      this._token = match[match.length - 1];
      return;
    }

    throw new Error('Valid token not found');
  }

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

    params.set('token', this._token as string);
    params.set('t', Date.now().toString());
    params.set('action', action);

    const url = urlJoin(this.config.baseUrl, this.config.path);
    const options: GotJSONOptions = {
      headers: {
        Authorization: this._authorization(),
        Cookie: this._cookie && this._cookie.cookieString(),
      },
      query: params,
      retry: 0,
      json: true,
    };

    if (this.config.timeout) {
      options.timeout = this.config.timeout;
    }

    if (this.config.agent) {
      options.agent = this.config.agent;
    }

    return got.get(url, options);
  }

  private _authorization() {
    const str = `${this.config.username || ''}:${this.config.password || ''}`;
    const encoded = Buffer.from(str).toString('base64');
    return 'Basic ' + encoded;
  }
}
