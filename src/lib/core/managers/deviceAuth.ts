import publicAccountService from '$lib/core/services/publicAccount';
import type { EpicDeviceAuthData } from '$types/game/authorizations';
import type { AccountData } from '$types/accounts';
import Authentication from '$lib/core/authentication';

export default class DeviceAuthManager {
  static async create(account: AccountData | { accountId: string; accessToken: string }) {
    let token = 'accessToken' in account ? account.accessToken : null;

    if ('deviceId' in account && 'secret' in account) {
      const { access_token } = await Authentication.verifyOrRefreshAccessToken(account);
      token = access_token;
    }

    return publicAccountService.post<EpicDeviceAuthData>(
      `${account.accountId}/deviceAuth`,
      {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    ).json();
  }

  static async get(account: AccountData, deviceId: string) {
    const { access_token } = await Authentication.verifyOrRefreshAccessToken(account);

    return publicAccountService.get<EpicDeviceAuthData>(
      `${account.accountId}/deviceAuth/${deviceId}`,
      {
        headers: {
          Authorization: `Bearer ${access_token}`
        }
      }
    ).json();
  }

  static async getAll(account: AccountData) {
    const { access_token } = await Authentication.verifyOrRefreshAccessToken(account);

    return publicAccountService.get<EpicDeviceAuthData[]>(
      `${account.accountId}/deviceAuth`,
      {
        headers: {
          Authorization: `Bearer ${access_token}`
        }
      }
    ).json();
  }

  static async delete(account: AccountData, deviceId: string) {
    const { access_token } = await Authentication.verifyOrRefreshAccessToken(account);

    return publicAccountService.delete(
      `${account.accountId}/deviceAuth/${deviceId}`,
      {
        headers: {
          Authorization: `Bearer ${access_token}`
        }
      }
    );
  }
}
