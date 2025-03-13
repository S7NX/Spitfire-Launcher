import type { AccountData } from '$types/accounts';
import baseGameService from '$lib/core/services/baseGame';
import Authentication from '$lib/core/authentication';
import type { FullQueryProfile, MCPOperation, MCPProfileId } from '$types/game/mcp';

export default class MCPManager {
  static async compose<T>(account: AccountData, operation: MCPOperation, profile: MCPProfileId, data: Record<string, any>) {
    const accessToken = await Authentication.verifyOrRefreshAccessToken(account);

    const route = operation === 'QueryPublicProfile' ? 'public' : 'client';
    let accountId = account.accountId;

    if (operation === 'QueryPublicProfile') {
      accountId = data._targetAccountId;
      delete data._targetAccountId;
    }

    return baseGameService.post<T>(
      `profile/${accountId}/${route}/${operation}?profileId=${profile}&rvn=-1`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`
        },
        json: data
      }
    ).json();
  }

  static async queryProfile<T extends MCPProfileId>(account: AccountData, profile: T) {
    return this.compose<FullQueryProfile<T>>(account, 'QueryProfile', profile, {});
  }

  static async queryPublicProfile<T extends Extract<MCPProfileId, 'campaign' | 'common_public'>>(account: AccountData, targetAccountId: string, profile: T) {
    const accessToken = await Authentication.verifyOrRefreshAccessToken(account);

    return baseGameService.post<FullQueryProfile<T>>(
      `profile/${targetAccountId}/public/QueryPublicProfile?profileId=${profile}&rvn=-1`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`
        },
        json: {}
      }
    ).json();
  }
}