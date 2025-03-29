import publicAccountService from '$lib/core/services/publicAccount';
import type { AccountData } from '$types/accounts';
import Authentication from '$lib/core/authentication';
import type { EpicAccountById, EpicAccountByName } from '$types/game/lookup';

export default class LookupManager {
  static async fetchById(account: AccountData, accountId: string) {
    const accessToken = await Authentication.verifyOrRefreshAccessToken(account);

    return publicAccountService.get<EpicAccountById>(
      `${accountId}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      }
    ).json();
  }

  static async fetchByIds(account: AccountData, accountIds: string[]) {
    const MAX_IDS_PER_REQUEST = 100;

    const accessToken = await Authentication.verifyOrRefreshAccessToken(account);
    const accounts: EpicAccountById[] = [];

    for (let i = 0; i < accountIds.length; i += MAX_IDS_PER_REQUEST) {
      const ids = accountIds.slice(i, i + MAX_IDS_PER_REQUEST);

      const list = await publicAccountService.get<EpicAccountById[]>(
        `?${ids.map((x) => `accountId=${x}`).join('&')}`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`
          }
        }
      ).json().catch(() => null);

      if (list) {
        accounts.push(...list);
      }
    }

    return accounts;
  }

  static async fetchByName(account: AccountData, displayName: string) {
    const accessToken = await Authentication.verifyOrRefreshAccessToken(account);

    return publicAccountService.get<EpicAccountByName>(
      `displayName/${displayName.trim()}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      }
    ).json();
  }
}
