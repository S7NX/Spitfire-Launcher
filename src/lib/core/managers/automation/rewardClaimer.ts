import DataStorage from '$lib/core/dataStorage';
import MCPManager from '$lib/core/managers/mcp';
import type { AccountData } from '$types/accounts';
import type { CampaignProfile } from '$types/game/mcp';

export default class RewardClaimer {
  static async claimRewards(account: AccountData) {
    const settings = await DataStorage.getSettingsFile();
    const delaySeconds = settings.app?.claimRewardsDelay;

    if (delaySeconds) {
      await new Promise(resolve => setTimeout(resolve, delaySeconds * 1000));
    }

    const queryProfile = await MCPManager.queryProfile(account, 'campaign');
    const profile = queryProfile.profileChanges[0].profile;
    const attributes = profile.stats.attributes;

    const missionAlertRewardsTotal = attributes.mission_alert_redemption_record?.pendingMissionAlertRewards?.items?.length || 0;
    const difficultyIncreaseRewardsTotal = attributes.difficulty_increase_rewards_record?.pendingRewards?.length || 0;

    const claimedRewardsPromises: Promise<any>[] = [
      RewardClaimer.claimQuestRewards(account, profile.items),
      RewardClaimer.openCardPackBatch(account, profile.items),
      MCPManager.compose(account, 'RedeemSTWAccoladeTokens', 'athena', {})
    ];

    if (missionAlertRewardsTotal) {
      claimedRewardsPromises.push(MCPManager.compose(account, 'ClaimMissionAlertRewards', 'campaign', {}));
    }

    if (difficultyIncreaseRewardsTotal) {
      claimedRewardsPromises.push(MCPManager.compose(account, 'ClaimDifficultyIncreaseRewards', 'campaign', {}));
    }

    return await Promise.allSettled(claimedRewardsPromises);
  }

  private static async openCardPackBatch(account: AccountData, queryProfileItems: CampaignProfile['items']) {
    const cardPackItemIds = Object.entries(queryProfileItems)
      .filter(([, x]) =>
        x.templateId.startsWith('CardPack:') && (x.attributes.match_statistics || x.attributes.pack_source === 'ItemCache')
      )
      .map(([key]) => key);

    if (!cardPackItemIds.length) return;

    return await MCPManager.compose(account, 'OpenCardPackBatch', 'campaign', { cardPackItemIds });
  }

  private static async claimQuestRewards(account: AccountData, queryProfileItems: CampaignProfile['items']) {
    const questItems = Object.entries(queryProfileItems)
      .filter(([, x]) =>
        x.templateId.startsWith('Quest:') && x.attributes.quest_state === 'Completed'
      )
      .map(([, x]) => x);

    if (!questItems.length) return;

    const questIds = questItems.map(x => x.templateId);

    const claimResult = await Promise.allSettled(
      questIds.map(x =>
        MCPManager.compose(account, 'ClaimQuestReward', 'campaign', { questId: x, selectedRewardIndex: 0 })
      )
    );

    // @ts-expect-error - Internal TS Error, already filtered out rejected promises
    return claimResult.filter(x => x.status === 'fulfilled' && x.value).map(x => x.value);
  }
}