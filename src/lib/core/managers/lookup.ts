import publicAccountService from '$lib/core/services/publicAccount';
import type { AccountData } from '$types/accounts';
import Authentication from '$lib/core/authentication';
import type { EpicAccountById, EpicAccountByName } from '$types/game/lookup';

export default class LookupManager {
  static async fetchById(account: AccountData, accountId: string) {
    const { access_token } = await Authentication.verifyOrRefreshAccessToken(account);

    return publicAccountService.get<EpicAccountById>(
      `${accountId}`,
      {
        headers: {
          Authorization: `Bearer ${access_token}`
        }
      }
    ).json();
  }

  static async fetchByName(account: AccountData, displayName: string) {
    const { access_token } = await Authentication.verifyOrRefreshAccessToken(account);

    return publicAccountService.get<EpicAccountByName>(
      `displayName/${displayName}`,
      {
        headers: {
          Authorization: `Bearer ${access_token}`
        }
      }
    ).json();
  }
}
