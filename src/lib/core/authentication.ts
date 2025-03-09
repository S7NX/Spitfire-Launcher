import oauthService from '$lib/core/services/oauth';
import type { DeviceAuthData, EpicDeviceAuthLoginData, EpicExchangeCodeData, EpicExchangeCodeLoginData, EpicOAuthData, EpicVerifyAccessTokenData } from '$types/game/authorizations';
import { accessTokenCache, accountsStore, doingBulkOperations } from '$lib/stores';
import { get } from 'svelte/store';
import { type ClientCredentials, defaultClient } from '$lib/constants/clients';
import EpicAPIError from '$lib/exceptions/EpicAPIError';
import { toast } from 'svelte-sonner';
import Account from '$lib/core/account';
import { goto } from '$app/navigation';

export default class Authentication {
  static async verifyOrRefreshAccessToken(
    deviceAuthData: DeviceAuthData,
    accessToken?: string
  ): Promise<ReturnType<typeof Authentication.verifyAccessToken>> {
    accessToken ??= getAccessTokenFromCache(deviceAuthData.accountId)?.access_token;
    if (!accessToken) return await this.getAccessTokenUsingDeviceAuth(deviceAuthData, false);

    try {
      return await this.verifyAccessToken(accessToken);
    } catch (error) {
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

  static async getAccessTokenUsingDeviceAuth(deviceAuthData: DeviceAuthData, useCache = true) {
    const cachedAccessToken = useCache && getAccessTokenFromCache(deviceAuthData.accountId);
    if (cachedAccessToken) return cachedAccessToken;

    try {
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
    } catch (error) {
      if (error instanceof EpicAPIError) {
        const isDoingBulkOperations = get(doingBulkOperations);

        if (error.errorCode === 'errors.com.epicgames.account.invalid_account_credentials') {
          if (!isDoingBulkOperations) await goto('/', {
            state: {
              showLoginModal: true
            }
          });

          const { allAccounts } = get(accountsStore);
          const accountName = allAccounts.find(account => account.accountId === deviceAuthData.accountId)?.displayName;

          await Account.logout(deviceAuthData.accountId);

          if (accountName) toast.error(`${accountName}'s login session has expired, please log in again.`);
        }
      }

      throw error;
    }
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

  static getAccessTokenUsingExchangeCode(exchange_code: string, clientCredentials: ClientCredentials = defaultClient, tokenType: 'eg1' | 'bearer' = 'eg1') {
    return oauthService.post<EpicExchangeCodeLoginData>('token', {
      body: new URLSearchParams({
        grant_type: 'exchange_code',
        exchange_code,
        token_type: tokenType
      }).toString(),
      headers: {
        Authorization: `Basic ${clientCredentials.base64}`
      }
    }).json();
  }
}

function getAccessTokenFromCache(accountId: string) {
  const accessTokenData = get(accessTokenCache)?.[accountId];
  const isExpired = !accessTokenData || new Date(accessTokenData.expires_at).getTime() < Date.now();
  return isExpired ? null : accessTokenData;
}

function updateAccessTokenCache(accountId: string, response: EpicOAuthData) {
  if (!response.account_id || !response.access_token || !response.expires_in) return;

  accessTokenCache.update((cache) => {
    return {
      ...cache,
      [accountId]: response
    };
  });
}