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
  private static automationAccounts: Map<string, AutomationAccount> = new Map();
  private static connections: Map<string, XMPPManager> = new Map();
  private static accountAutomations: Map<string, AccountAutomation> = new Map();

  static async loadAccounts() {
    doingBulkOperations.set(true);

    const automationAccounts = await DataStorage.getAutomationFile();
    const { allAccounts } = get(accountsStore);

    await Promise.allSettled(automationAccounts.map(async automationAccount => {
      const account = allAccounts.find(a => a.accountId === automationAccount.accountId);
      if (!account) return;

      await AutomationBase.addAccount(account, automationAccount, false);
    }));

    doingBulkOperations.set(false);
  }

  static async addAccount(account: AccountData, settings: AutomationAccount['settings'] = {}, writeToFile = true) {
    if (AutomationBase.automationAccounts.has(account.accountId)) return;

    AutomationBase.automationAccounts.set(account.accountId, {
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

    AutomationBase.accountAutomations.get(accountId)?.dispose();
    AutomationBase.accountAutomations.delete(accountId);

    automationStore.update(s => s.filter(a => a.accountId !== accountId));
    AutomationBase.automationAccounts.delete(accountId);

    DataStorage.writeConfigFile<AutomationSettings>(AUTOMATION_FILE_PATH, Array.from(AutomationBase.automationAccounts.values()).map((x) => ({
      accountId: x.account.accountId,
      ...x.settings
    }))).catch(() => null);
  }

  static async updateSettings(accountId: string, settings: Partial<AutomationSetting>, writeToFile = true) {
    const account = AutomationBase.getAccountById(accountId);
    if (!account) return;

    account.settings = {
      ...account.settings,
      ...settings
    };

    const newSettings = Array.from(AutomationBase.automationAccounts.values()).map((x) => ({
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

    const oldProvider = AutomationBase.accountAutomations.get(account.accountId);
    if (oldProvider) {
      oldProvider.dispose();
      AutomationBase.accountAutomations.delete(account.accountId);
    }

    const accountAutomation = new AccountAutomation(account);
    AutomationBase.accountAutomations.set(account.accountId, accountAutomation);

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
      if (data.account_id !== account.accountId) return;

      AutomationBase.updateStatus(account.accountId, 'DISCONNECTED');
      accountAutomation.dispose();
    });

    connection.addEventListener(EventNotifications.MemberExpired, async (data) => {
      if (data.account_id !== account.accountId) return;

      AutomationBase.updateStatus(account.accountId, 'DISCONNECTED');
      accountAutomation.dispose();
    });

    connection.addEventListener(EventNotifications.MemberKicked, async (data) => {
      if (data.account_id !== account.accountId) return;

      if (accountAutomation.matchmakingState.partyState === 'PostMatchmaking' && accountAutomation.matchmakingState.started) {
        const automationAccount = AutomationBase.getAccountById(account.accountId);

        if (automationAccount?.settings.autoClaim) {
          await RewardClaimer.claimRewards(account);
        }

        if (automationAccount?.settings.autoTransferMaterials) {
          await transferBuildingMaterials(account);
        }
      }
    });

    connection.addEventListener(EventNotifications.MemberJoined, async (data) => {
      if (data.account_id !== account.accountId) return;

      AutomationBase.updateStatus(account.accountId, 'ACTIVE');
      accountAutomation.initMissionCheckerIntervalTimeout(20000);
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
    return AutomationBase.automationAccounts.get(accountId);
  }

  private static updateStatus(accountId: string, status: AutomationAccount['status']) {
    const account = AutomationBase.getAccountById(accountId);
    if (!account) return;

    account.status = status;
    automationStore.update(s => s.map(a => a.accountId === accountId ? { ...a, status } : a));
  }
}