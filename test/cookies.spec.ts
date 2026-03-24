import { expect, it } from 'vitest';

import { Utorrent } from '../src/index.js';

const baseUrl = 'http://localhost:8080/';

it('should build a request cookie header from the auth set-cookie header', () => {
  const client = new Utorrent({ baseUrl });
  client.state.auth = {
    token: 'token',
    setCookie: 'GUID=abc123; expires=Wed, 09 Jun 2027 10:18:14 GMT; HttpOnly',
    expires: '2027-06-09T10:18:14.000Z',
  };

  expect((client as any)._cookieHeader()).toBe('GUID=abc123');
});

it('should ignore malformed auth set-cookie headers', () => {
  const client = new Utorrent({ baseUrl });
  client.state.auth = {
    token: 'token',
    setCookie: '',
  };

  expect((client as any)._cookieHeader()).toBe('');
});

it('should preserve the auth cookie expiration from set-cookie', () => {
  const client = new Utorrent({ baseUrl });
  client.state.auth = {
    token: 'token',
    setCookie: 'GUID=abc123; expires=Wed, 09 Jun 2027 10:18:14 GMT; HttpOnly',
  };

  expect((client as any)._authCookie()?.expires?.toISOString()).toBe('2027-06-09T10:18:14.000Z');
});
