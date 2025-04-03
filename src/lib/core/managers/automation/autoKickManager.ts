import type { AccountData } from '$types/accounts';
import MatchmakingManager from '$lib/core/managers/matchmaking';
import { type PartyState, PartyStates } from '$lib/constants/events';
import AutoKickBase from '$lib/core/managers/automation/autoKickBase';
import PartyManager from '$lib/core/managers/party';
import RewardClaimer from '$lib/core/managers/automation/rewardClaimer';
import transferBuildingMaterials from '$lib/core/managers/automation/transferBuildingMaterials';
import DataStorage from '$lib/core/dataStorage';
import { get } from 'svelte/store';
import { accountsStore } from '$lib/stores';

type MatchmakingState = {
  partyState: PartyState | null;
  started: boolean;
};

export default class AutoKickManager {
  private missionCheckerIntervalInitTimeout: NodeJS.Timeout | null = null;
  private missionCheckerInterval: NodeJS.Timeout | null = null;

  public matchmakingState: MatchmakingState = {
    partyState: null,
    started: false
  };

  constructor(private account: AccountData) {}

  initMissionCheckerIntervalTimeout(timeoutMs?: number) {
    if (this.missionCheckerIntervalInitTimeout) {
      clearTimeout(this.missionCheckerIntervalInitTimeout);
      this.missionCheckerIntervalInitTimeout = null;
    }

    this.missionCheckerIntervalInitTimeout = setTimeout(async () => {
      await this.initMissionCheckerInterval();
    }, timeoutMs || 10000);
  }

  async initMissionCheckerInterval() {
    if (this.missionCheckerInterval) {
      clearInterval(this.missionCheckerInterval);
      this.missionCheckerInterval = null;
    }

    let settings = await DataStorage.getSettingsFile();

    this.missionCheckerInterval = setInterval(async () => {
      settings = await DataStorage.getSettingsFile();

      const automationSettings = AutoKickBase.getAccountById(this.account.accountId)?.settings;
      const isAnySettingEnabled = Object.values(automationSettings || {}).some(x => x);
      if (!automationSettings || !isAnySettingEnabled) return;

      const matchmakingResponse = await MatchmakingManager.findPlayer(this.account, this.account.accountId);
      const matchmakingData = matchmakingResponse[0];
      const matchmakingState = this.matchmakingState;

      if (!matchmakingData) {
        const wasInMatch = matchmakingState.partyState === PartyStates.Matchmaking || matchmakingState.partyState === PartyStates.PostMatchmaking;
        if (!wasInMatch) {
          this.dispose();
        }

        return;
      }

      if (matchmakingData.started == null) return;

      if (matchmakingData.started && matchmakingState.partyState !== PartyStates.PostMatchmaking) {
        this.matchmakingState.partyState = PartyStates.PostMatchmaking;
        return;
      }

      if (matchmakingState.partyState !== PartyStates.PostMatchmaking
        || !matchmakingState.started
        || matchmakingData.started) {
        this.matchmakingState.started = matchmakingData.started;
        return;
      }

      this.dispose();

      if (automationSettings.autoKick) {
        await this.kick();
      }

      if (automationSettings.autoClaim) {
        await RewardClaimer.claimRewards(this.account);
      }

      if (automationSettings.autoTransferMaterials) {
        await transferBuildingMaterials(this.account);
      }
    }, (settings.app?.missionCheckInterval || 5) * 1000);
  }

  async checkMissionOnStartup() {
    const settings = AutoKickBase.getAccountById(this.account.accountId)?.settings;
    const isAnySettingEnabled = Object.values(settings || {}).some(x => x);
    if (!settings || !isAnySettingEnabled) return;

    const matchmakingResponse = await MatchmakingManager.findPlayer(this.account, this.account.accountId);
    const matchmakingData = matchmakingResponse[0];

    if (matchmakingData?.started == null) return;

    this.matchmakingState.started = matchmakingData.started;
    this.matchmakingState.partyState = matchmakingData.started ? PartyStates.PostMatchmaking : PartyStates.Matchmaking;

    await this.initMissionCheckerInterval();
  }

  dispose() {
    if (this.missionCheckerInterval) {
      clearInterval(this.missionCheckerInterval);
      this.missionCheckerInterval = null;
    }

    if (this.missionCheckerIntervalInitTimeout) {
      clearTimeout(this.missionCheckerIntervalInitTimeout);
      this.missionCheckerIntervalInitTimeout = null;
    }

    this.matchmakingState = {
      partyState: null,
      started: false
    };
  }

  private async kick() {
    const partyData = await PartyManager.get(this.account);
    const party = partyData.current[0];
    if (!party) return;

    const { allAccounts } = get(accountsStore);

    const partyMemberIds = party.members.map(x => x.account_id);
    const partyLeaderId = party.members.find(x => x.role === 'CAPTAIN')!.account_id;
    const partyLeaderAccount = allAccounts.find(x => x.accountId === partyLeaderId);

    const membersWithAutoKick = partyMemberIds.filter((id) => AutoKickBase.getAccountById(id)?.settings.autoKick);
    const membersWithNoAutoKick = partyMemberIds.filter((id) => !membersWithAutoKick.includes(id));

    if (partyLeaderAccount) {
      const accountsWithNoAutoKick = membersWithNoAutoKick.filter((id) => id !== this.account.accountId);

      await Promise.allSettled(accountsWithNoAutoKick.map(async (id) =>
        await PartyManager.kick(partyLeaderAccount, party.id, id)
      ));

      await PartyManager.leave(this.account, party.id);
    } else {
      const accountsWithNoAutoKick = membersWithNoAutoKick
        .map((id) => allAccounts.find(x => x.accountId === id))
        .filter(x => !!x);

      accountsWithNoAutoKick.push(this.account);

      await Promise.allSettled(accountsWithNoAutoKick.map(async (account) => {
        await PartyManager.leave(account, party.id);
      }));
    }
  }
}