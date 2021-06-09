export interface BaseResponse {
  build: number;
}

export interface VersionResponse extends BaseResponse {
  name: string;
  version: Version;
}

export interface Version {
  device_id: string;
  engine_version: number;
  features: Features;
  major_version: number;
  minor_version: number;
  name: string;
  peer_id: string;
  product_code: string;
  tiny_version: number;
  ui_version: number;
  user_agent: string;
  version_date: string;
}

export interface Features {
  device_pairing: DevicePairing;
  remote: number;
  settings_set: number;
}

export interface DevicePairing {
  jsonp: number;
  supported_types: number[];
}

export interface SettingsResponse extends BaseResponse {
  settings: Setting[];
}

export type SettingName = string;
export enum SettingType {
  Integer = 0,
  Boolean = 1,
  String = 2,
}
export type SettingValue = string | number;
export interface SettingAccess {
  access: Access;
}
export type Setting = [SettingName, SettingType, SettingAccess];

export enum Access {
  R = 'R',
  W = 'W',
  Y = 'Y',
}

export interface TorrentListResponse extends BaseResponse {
  torrents: TorrentData[];
  /**
   * array of types containing label name and count
   */
  label: Array<[string, number]>;
  /**
   * CACHE ID
   */
  torrentc: string;
  rssfeeds: any[];
  rssfilters: any[];
}

/**
 * torrent list, its a huge tuple
 * HASH (string)
 * STATUS* (integer)
 * NAME (string)
 * SIZE (integer in bytes)
 * PERCENT PROGRESS (integer in per mils)
 * DOWNLOADED (integer in bytes)
 * UPLOADED (integer in bytes)
 * RATIO (integer in per mils)
 * UPLOAD SPEED (integer in bytes per second)
 * DOWNLOAD SPEED (integer in bytes per second)
 * ETA (integer in seconds)
 * LABEL (string)
 * PEERS CONNECTED (integer)
 * PEERS IN SWARM (integer)
 * SEEDS CONNECTED (integer)
 * SEEDS IN SWARM (integer)
 * AVAILABILITY (integer in 1/65536ths)
 * TORRENT QUEUE ORDER (integer)
 * REMAINING (integer in bytes)
 */
export type TorrentData = [
  HASH: string,
  STATUS: number,
  NAME: string,
  SIZE: number,
  PROGRESS: number,
  DOWNLOADED: number,
  UPLOADED: number,
  RATIO: number,
  UPSPEED: number,
  DOWNSPEED: number,
  ETA: number,
  LABEL: string,
  PEERS_CONNECTED: number,
  PEERS_SWARM: number,
  SEEDS_CONNECTED: number,
  SEEDS_SWARM: number,
  AVAILABILITY: number,
  QUEUE_POSITION: number,
  REMAINING: number,
  DOWNLOAD_URL: string,
  RSS_FEED_URL: string,
  STATUS_MESSAGE: string,
  STREAM_ID: string,
  DATE_ADDED: number,
  DATE_COMPLETED: number,
  APP_UPDATE_URL: string,
  SAVE_PATH: string,
  UNKNOWN: number,
  UNKNOWN: string,
  UNKNOWN: boolean,
];

export interface RssUpdateResponse extends BaseResponse {
  rss_ident: number;
}
