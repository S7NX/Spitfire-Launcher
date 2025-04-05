import { eulaService } from '$lib/core/services';
import Authentication from '$lib/core/authentication';
import type { EULACheckData } from '$types/game/eula';
import type { AccountData } from '$types/accounts';

export default class EULAManager {
  static async check(account: AccountData) {
    const accessToken = await Authentication.verifyOrRefreshAccessToken(account);

    const response = await eulaService.get<EULACheckData>(
      `account/${account.accountId}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      }
    );

    if (response.status === 204) return null;
    return await response.json();
  }

  static async accept(account: AccountData, version: number) {
    const accessToken = await Authentication.verifyOrRefreshAccessToken(account);

    return eulaService.post(
      `version/${version}/${account.accountId}/accept`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      }
    );
  }
}
