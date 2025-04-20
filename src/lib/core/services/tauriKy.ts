import Authentication from '$lib/core/authentication';
import { accessTokenCache, accountsStore } from '$lib/stores';
import ky from 'ky';
import { fetch } from '@tauri-apps/plugin-http';
import Manifest from '$lib/core/manifest';
import { isEpicApiError } from '$lib/utils/util';
import EpicAPIError from '$lib/exceptions/EpicAPIError';
import { get } from 'svelte/store';

const MAX_AUTH_RETRIES = 1;

type InternalProperties = {
  _authRetryCount?: number;
}

// Used to avoid any CORS issues
const tauriKy = ky.create({
  fetch: async (input, options: (RequestInit & InternalProperties) | undefined) => {
    const request = new Request(input, options);
    const headers = new Headers(request.headers);

    options = options || {};
    options._authRetryCount = options._authRetryCount || 0;

    if (!headers.has('x-user-agent')) {
      const userAgent = await Manifest.getFortniteUserAgent();
      headers.set('User-Agent', userAgent);
    } else {
      headers.set('User-Agent', request.headers.get('x-user-agent')!);
      headers.delete('x-user-agent');
    }

    let textBody = request.body ? await request.text() : undefined;

    const response = await fetch(request.url, {
      method: request.method,
      headers,
      body: textBody
    });

    let data: unknown;

    try {
      data = await response.json();
    } catch (e) {
      data = textBody;
    }

    if (isEpicApiError(data)) {
      const isInvalidTokenError = [
        'errors.com.epicgames.common.authentication.token_verification_failed',
        'errors.com.epicgames.common.oauth.invalid_token'
      ].includes(data.errorCode);

      if (isInvalidTokenError && options && options._authRetryCount < MAX_AUTH_RETRIES) {
        options._authRetryCount++;

        const accessTokenAccountId = Object.entries(get(accessTokenCache)).find(([, value]) => value.access_token === request.headers.get('Authorization')?.split(' ')[1])?.[0];
        accessTokenCache.update(cache => {
          if (accessTokenAccountId) {
            delete cache[accessTokenAccountId];
          }

          return cache;
        });

        if (!accessTokenAccountId) {
          throw new EpicAPIError(data, request, response.status);
        }

        const account = get(accountsStore).allAccounts.find(account => account.accountId === accessTokenAccountId)!;
        const accessTokenData = await Authentication.getAccessTokenUsingDeviceAuth(account, false);

        if (options.headers instanceof Headers) {
          options.headers.set('Authorization', `Bearer ${accessTokenData.access_token}`);
        } else {
          options.headers = {
            ...options.headers,
            Authorization: `Bearer ${accessTokenData.access_token}`
          };
        }

        return tauriKy(input, options);
      } else {
        throw new EpicAPIError(data, request, response.status);
      }
    }

    return new Response(data ? JSON.stringify(data) : null, response);
  },
  retry: 0,
  timeout: 30000
});

export default tauriKy;
