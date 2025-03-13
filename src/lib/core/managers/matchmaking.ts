import matchmakingService from '$lib/core/services/matchmaking';
import Authentication from '$lib/core/authentication';
import type { MatchmakingTrackResponse } from '$types/game/matchmaking';
import type { AccountData } from '$types/accounts';

export default class MatchmakingManager {
  static async findPlayer(account: AccountData, accountToFind: string) {
    const accessToken = await Authentication.verifyOrRefreshAccessToken(account);

    return matchmakingService.get<MatchmakingTrackResponse>(
      `findPlayer/${accountToFind}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      }
    ).json();
  }
}
