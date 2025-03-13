import DataStorage, { AUTOMATION_FILE_PATH } from '$lib/core/dataStorage';
import { get } from 'svelte/store';
import { accountsStore, automationStore, doingBulkOperations } from '$lib/stores';
import type { AccountData } from '$types/accounts';
import type { AutomationSetting, AutomationSettings } from '$types/settings';
import Authentication from '$lib/core/authentication';
import XMPPManager from '$lib/core/managers/xmpp';
import { EventNotifications, type PartyState, ServiceEvents } from '$lib/constants/events';
import AccountAutomation from '$lib/core/managers/automation/accountAutomation';
import RewardClaimer from '$lib/core/managers/automation/rewardClaimer';
import transferBuildingMaterials from '$lib/core/managers/automation/transferBuildingMaterials';

export type AutomationAccount = {
  status: 'LOADING' | 'ACTIVE' | 'INVALID_CREDENTIALS' | 'DISCONNECTED';
  account: AccountData;
  settings: Partial<Omit<AutomationSetting, 'accountId'>>;
}

export default class AutomationBase {
  private static automationAccounts: AutomationAccount[] = [];
  private static connections: Map<string, XMPPManager> = new Map();
  private static providers: Map<string, AccountAutomation> = new Map();

  static async loadAccounts() {
    if (AutomationBase.automationAccounts.length) return;

    const automationAccounts = await DataStorage.getAutomationFile();
    const { allAccounts } = get(accountsStore);

    for (const automationAccount of automationAccounts) {
      const account = allAccounts.find(a => a.accountId === automationAccount.accountId);
      if (!account) continue;

      await AutomationBase.addAccount(account, automationAccount, false);
    }
  }

  static async addAccount(account: AccountData, settings: AutomationAccount['settings'] = {}, writeToFile = true) {
    AutomationBase.automationAccounts.push({
      status: 'LOADING',
      account,
      settings
    });

    await AutomationBase.updateSettings(account.accountId, settings, writeToFile);
    await AutomationBase.startAccount(account.accountId);
  }

  static removeAccount(accountId: string) {
    AutomationBase.connections.get(accountId)?.disconnect();
    AutomationBase.connections.delete(accountId);

    AutomationBase.providers.get(accountId)?.dispose();
    AutomationBase.providers.delete(accountId);

    automationStore.update(s => s.filter(a => a.accountId !== accountId));
    AutomationBase.automationAccounts = AutomationBase.automationAccounts.filter((x) => x.account.accountId !== accountId);

    DataStorage.writeConfigFile<AutomationSettings>(AUTOMATION_FILE_PATH, AutomationBase.automationAccounts.map((x) => ({
      accountId: x.account.accountId,
      ...x.settings
    })));
  }

  static async updateSettings(accountId: string, settings: Partial<AutomationSetting>, writeToFile = true) {
    const account = AutomationBase.getAccountById(accountId);
    if (!account) return;

    account.settings = {
      ...account.settings,
      ...settings
    };

    const newSettings = AutomationBase.automationAccounts.map((x) => ({
      accountId: x.account.accountId,
      ...x.settings
    }));

    automationStore.set(newSettings.map((x) => ({
      ...x,
      status: AutomationBase.getAccountById(x.accountId)?.status ?? 'LOADING'
    })));

    if (writeToFile) await DataStorage.writeConfigFile<AutomationSettings>(AUTOMATION_FILE_PATH, newSettings);
  }

  static async startAccount(accountId: string) {
    doingBulkOperations.set(true);

    const account = get(accountsStore).allAccounts.find(a => a.accountId === accountId)!;
    const automationAccount = AutomationBase.getAccountById(accountId);
    if (!automationAccount) return;

    try {
      const accessToken = await Authentication.getAccessTokenUsingDeviceAuth(account, false).catch(() => null);
      if (!accessToken) {
        AutomationBase.updateStatus(accountId, 'INVALID_CREDENTIALS');
        return;
      }

      AutomationBase.updateStatus(accountId, 'LOADING');

      const existingConnection = AutomationBase.connections.get(accountId);
      if (existingConnection) {
        existingConnection.disconnect();
        AutomationBase.connections.delete(accountId);
      }

      const connection = new XMPPManager({ accountId, accessToken: accessToken.access_token });
      AutomationBase.addEventListeners(connection);

      await connection.connect();

      AutomationBase.connections.set(accountId, connection);
      AutomationBase.updateStatus(accountId, 'ACTIVE');
    } catch (error) {
      AutomationBase.updateStatus(accountId, 'DISCONNECTED');
    }

    doingBulkOperations.set(false);
  }

  private static addEventListeners(connection: XMPPManager) {
    const { account } = AutomationBase.getAccountById(connection.accountId!)!;

    const oldProvider = AutomationBase.providers.get(account.accountId);
    if (oldProvider) {
      oldProvider.dispose();
      AutomationBase.providers.delete(account.accountId);
    }

    const accountAutomation = new AccountAutomation(account);
    this.providers.set(account.accountId, accountAutomation);

    let partyState: PartyState;

    connection.addEventListener(ServiceEvents.SessionStarted, async () => {
      AutomationBase.updateStatus(account.accountId, 'ACTIVE');
      await accountAutomation.checkOnStartup();
    });

    connection.addEventListener(ServiceEvents.Disconnected, async () => {
      AutomationBase.updateStatus(account.accountId, 'DISCONNECTED');
      accountAutomation.dispose();
    });

    connection.addEventListener(EventNotifications.MemberDisconnected, async (data) => {
      if (data.account_id === account.accountId) {
        AutomationBase.updateStatus(account.accountId, 'DISCONNECTED');
        accountAutomation.dispose();
      }
    });

    connection.addEventListener(EventNotifications.MemberExpired, async (data) => {
      if (data.account_id === account.accountId) {
        AutomationBase.updateStatus(account.accountId, 'DISCONNECTED');
        accountAutomation.dispose();
      }
    });

    connection.addEventListener(EventNotifications.MemberKicked, async (data) => {
      if (data.account_id === account.accountId) {
        if (accountAutomation.matchmakingState.partyState === 'PostMatchmaking' && accountAutomation.matchmakingState.started) {
          const automationAccount = AutomationBase.getAccountById(account.accountId);

          if (automationAccount?.settings.autoClaim) {
            await RewardClaimer.claimRewards(account);
          }

          if (automationAccount?.settings.autoTransferMaterials) {
            await transferBuildingMaterials(account);
          }
        }
      }
    });

    connection.addEventListener(EventNotifications.MemberJoined, async (data) => {
      if (data.account_id === account.accountId) {
        AutomationBase.updateStatus(account.accountId, 'ACTIVE');

        accountAutomation.initMissionCheckerIntervalTimeout(20000);
      }
    });

    connection.addEventListener(EventNotifications.PartyUpdated, async (data) => {
      const newPartyState = data.party_state_updated['Default:PartyState_s'] as PartyState | undefined;
      if (!newPartyState) return;

      partyState = newPartyState;

      if (partyState === 'PostMatchmaking') {
        accountAutomation.initMissionCheckerIntervalTimeout();
      }
    });
  }

  static getAccountById(accountId: string) {
    return AutomationBase.automationAccounts.find((x) => x.account.accountId === accountId);
  }

  private static updateStatus(accountId: string, status: AutomationAccount['status']) {
    const account = AutomationBase.getAccountById(accountId);
    if (!account) return;

    account.status = status;
    automationStore.update(s => s.map(a => a.accountId === accountId ? { ...a, status } : a));
  }
}