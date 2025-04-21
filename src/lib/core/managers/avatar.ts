import { avatarCache } from '$lib/stores';
import { processChunks } from '$lib/utils/util';
import type { AccountData } from '$types/accounts';
import { avatarService } from '$lib/core/services';
import type { AvatarData } from '$types/game/avatar';
import Authentication from '$lib/core/authentication';

export default class AvatarManager {
  static async fetchAvatars(account: AccountData, friendIds: string[]) {
    const accessToken = await Authentication.verifyOrRefreshAccessToken(account);
    const MAX_IDS_PER_REQUEST = 100;

    const avatarData = await processChunks(
      friendIds,
      MAX_IDS_PER_REQUEST,
      async (ids) => {
        return avatarService.get<AvatarData[]>(`?accountIds=${ids.join(',')}`, {
          headers: {
            Authorization: `Bearer ${accessToken}`
          }
        }).json();
      }
    );

    for (const avatar of avatarData) {
      if (avatar.namespace.toLowerCase() !== 'fortnite') continue;

      const cosmeticId = avatar.avatarId.split(':')[1];
      if (!cosmeticId) continue;

      avatarCache.set(avatar.accountId, `https://fortnite-api.com/images/cosmetics/br/${cosmeticId}/smallicon.png`);
    }

    return avatarData;
  }
}