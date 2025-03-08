import type { AccountData } from '$types/accounts';
import tauriKy from '$lib/core/services/tauriKy';
import Authentication from '$lib/core/authentication';
import type { FullQueryProfile, MCPOperation, MCPProfileId } from '$types/game/mcp';

export default class MCPManager {
  static async compose<T>(account: AccountData, operation: MCPOperation, profile: MCPProfileId, data: Record<string, any>) {
    const { access_token } = await Authentication.verifyOrRefreshAccessToken(account);

    const route = operation === 'QueryPublicProfile' ? 'public' : 'client';
    let accountId = account.accountId;

    if (operation === 'QueryPublicProfile') {
      accountId = data._targetAccountId;
      delete data._targetAccountId;
    }

    return tauriKy.post<T>(
      `https://fortnite-public-service-prod11.ol.epicgames.com/fortnite/api/game/v2/profile/${accountId}/${route}/${operation}?profileId=${profile}&rvn=-1`,
      {
        headers: {
          Authorization: `Bearer ${access_token}`
        },
        json: data
      }
    ).json();
  }

  static async queryPublicProfile<T extends Extract<MCPProfileId, 'campaign' | 'common_public'>>(account: AccountData, targetAccountId: string, profile: T) {
    // todo: temporary solution
    return this.compose<FullQueryProfile<T>>(account, 'QueryPublicProfile', profile, { _targetAccountId: targetAccountId });
  }
}