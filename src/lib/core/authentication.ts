import oauthService from '$lib/core/services/oauth';
import type { DeviceAuthData, EpicAPIErrorData, EpicDeviceAuthLoginData, EpicExchangeCodeData, EpicExchangeCodeLoginData, EpicOAuthData, EpicVerifyAccessTokenData } from '$types/game/authorizations';
import { accessTokenCache } from '$lib/stores';
import { get } from 'svelte/store';
import { type ClientCredentials, defaultClient } from '$lib/constants/clients';
import { HTTPError } from 'ky';
import { toast } from 'svelte-sonner';
import Account from '$lib/core/account';
import { goto } from '$app/navigation';

type AccessTokenWithCache<C, T> = C extends false ? T : {
  account_id: string;
  access_token: string;
  expires_in: number;
  expires_at: string;
}

export default class Authentication {
  static async verifyOrRefreshAccessToken(
    deviceAuthData: DeviceAuthData,
    accessToken?: string
  ): Promise<ReturnType<typeof Authentication.verifyAccessToken>> {
    accessToken ??= getAccessTokenFromCache(deviceAuthData.accountId)?.accessToken;
    if (!accessToken) return await this.getAccessTokenUsingDeviceAuth(deviceAuthData, false);

    try {
      return await this.verifyAccessToken(accessToken);
    } catch (error) {
      if (error instanceof HTTPError) {
        const data = await error.response.json<EpicAPIErrorData>();

        if (data?.errorCode === 'errors.com.epicgames.account.invalid_account_credentials') {
          await goto('/', {
            state: {
              showLoginModal: true
            }
          });

          await Account.logout();

          toast.error('Your login has expired, please log in again.');
          throw new Error('Your login has expired, please log in again.');
        }
      }

      return await this.getAccessTokenUsingDeviceAuth(deviceAuthData, false);
    }
  }

  static async verifyAccessToken(accessToken: string): Promise<Omit<EpicOAuthData, 'refresh_token' | 'refresh_expires' | 'refresh_expires_at'>> {
    const verifyData = await oauthService.get<EpicVerifyAccessTokenData>('verify', {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    }).json();

    return {
      ...verifyData,
      access_token: verifyData.token,
      displayName: verifyData.display_name
    };
  }

  static async getAccessTokenUsingDeviceAuth<C extends boolean = true>(
    deviceAuthData: DeviceAuthData,
    useCache?: C
  ): Promise<AccessTokenWithCache<C, EpicDeviceAuthLoginData>> {
    const cachedAccessToken = useCache && getAccessTokenFromCache(deviceAuthData.accountId);
    if (cachedAccessToken && cachedAccessToken.accessToken) return {
      account_id: deviceAuthData.accountId,
      access_token: cachedAccessToken.accessToken,
      expires_in: Math.floor((cachedAccessToken.expiresAt.getTime() - Date.now()) / 1000),
      expires_at: cachedAccessToken.expiresAt.toISOString()
    } as AccessTokenWithCache<C, EpicDeviceAuthLoginData>;

    const accessTokenData = await oauthService.post<EpicDeviceAuthLoginData>('token', {
      body: new URLSearchParams({
        grant_type: 'device_auth',
        account_id: deviceAuthData.accountId,
        device_id: deviceAuthData.deviceId,
        secret: deviceAuthData.secret,
        token_type: 'eg1'
      }).toString()
    }).json();

    updateAccessTokenCache(deviceAuthData.accountId, accessTokenData);

    return accessTokenData;
  }

  static getAccessTokenUsingClientCredentials(clientCredentials: ClientCredentials = defaultClient) {
    return oauthService.post<EpicOAuthData>('token', {
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        token_type: 'eg1'
      }).toString(),
      headers: {
        Authorization: `Basic ${clientCredentials.base64}`
      }
    }).json();
  }

  static getAccessTokenUsingDeviceCode(deviceCode: string, clientCredentials: ClientCredentials = defaultClient) {
    return oauthService.post<EpicOAuthData>('token', {
      body: new URLSearchParams({
        grant_type: 'device_code',
        device_code: deviceCode,
        token_type: 'eg1'
      }).toString(),
      headers: {
        Authorization: `Basic ${clientCredentials.base64}`
      }
    }).json();
  }

  static getExchangeCodeUsingAccessToken(accessToken: string) {
    return oauthService.get<EpicExchangeCodeData>('exchange', {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    }).json();
  }

  static getAccessTokenUsingExchangeCode(exchange_code: string, clientCredentials: ClientCredentials = defaultClient) {
    return oauthService.post<EpicExchangeCodeLoginData>('token', {
      body: new URLSearchParams({
        grant_type: 'exchange_code',
        exchange_code,
        token_type: 'eg1'
      }).toString(),
      headers: {
        Authorization: `Basic ${clientCredentials.base64}`
      }
    }).json();
  }
}

function getAccessTokenFromCache(accountId: string) {
  const accessTokenData = get(accessTokenCache)?.[accountId];
  const isExpired = accessTokenData?.expiresAt.getTime() < Date.now();
  return isExpired ? null : accessTokenData;
}

function updateAccessTokenCache(accountId: string, response: EpicOAuthData) {
  if (!response.account_id || !response.access_token || !response.expires_in) return;

  accessTokenCache.update((cache) => {
    return {
      ...cache,
      [accountId]: {
        accessToken: response.access_token,
        expiresAt: new Date(Date.now() + response.expires_in * 1000)
      }
    };
  });
}