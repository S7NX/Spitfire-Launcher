import partyService from '$lib/core/services/party';
import Authentication from '$lib/core/authentication';
import type { AccountData } from '$types/accounts';
import type { FetchPartyResponse } from '$types/game/party';

export default class PartyManager {
  static async get(account: AccountData) {
    const { access_token } = await Authentication.verifyOrRefreshAccessToken(account);

    return partyService.get<FetchPartyResponse>(
      `user/${account.accountId}`,
      {
        headers: {
          Authorization: `Bearer ${access_token}`
        }
      }
    ).json();
  }

  static async kick(account: AccountData, partyId: string, accountToKick: string) {
    const { access_token } = await Authentication.verifyOrRefreshAccessToken(account);

    return partyService.delete<any>(
      `parties/${partyId}/members/${accountToKick}`,
      {
        headers: {
          Authorization: `Bearer ${access_token}`
        }
      }
    ).json();
  }
}
