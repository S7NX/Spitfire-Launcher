import type { AccountData } from '$types/accounts';
import fulfillmentService from '$lib/core/services/fulfillment';
import type { RedeemedCodeData } from '$types/game/fulfillment';
import Authentication from '$lib/core/authentication';

export default class CodeManager {
  static async redeem(account: AccountData, code: string) {
    const accessToken = await Authentication.verifyOrRefreshAccessToken(account);

    code = encodeURIComponent(code.toUpperCase().replaceAll('-', '').replaceAll('_', '').trim());

    return fulfillmentService.post<RedeemedCodeData>(
      `accounts/${account.accountId}/codes/${code}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`
        },
        json: {}
      }
    ).json();
  }

  // todo: add
  static get(account: AccountData, code: string) {

  }
}