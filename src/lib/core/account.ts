import DataStorage, { ACCOUNTS_FILE_PATH } from '$lib/core/dataStorage';
import { get } from 'svelte/store';
import { accountsStore, activeAccountId } from '$lib/stores';
import type { AccountData, AccountDataFile } from '$types/accounts';
import DeviceAuthManager from '$lib/core/managers/deviceAuth';
import AutomationBase from '$lib/core/managers/automation/base';

export default class Account {
  static async changeActiveAccount(id: string | null) {
    activeAccountId.set(id);
    await DataStorage.writeConfigFile<AccountDataFile>(ACCOUNTS_FILE_PATH, { activeAccountId: id || undefined });
  }

  static async addAccount(account: AccountData, setActive = true) {
    const { allAccounts } = get(accountsStore);
    allAccounts.push(account);

    if (setActive) {
      activeAccountId.set(account.accountId);
      accountsStore.set({
        activeAccount: account,
        allAccounts
      });
    }

    await DataStorage.writeConfigFile<AccountDataFile>(ACCOUNTS_FILE_PATH, {
      activeAccountId: setActive ? account.accountId : get(activeAccountId) || undefined,
      accounts: allAccounts
    });
  }

  static async logout(accountId?: string) {
    const targetAccountId = accountId || get(activeAccountId);
    const oldAccounts = get(accountsStore).allAccounts;
    const oldActiveAccount = oldAccounts.find(account => account.accountId === targetAccountId);

    const newAccounts = oldAccounts.filter(account => account.accountId !== targetAccountId);

    let newAccountId = get(activeAccountId);
    if (targetAccountId === newAccountId) {
      newAccountId = newAccounts[0]?.accountId || null;
      await Account.changeActiveAccount(newAccountId);
    }

    await DataStorage.writeConfigFile<AccountDataFile>(ACCOUNTS_FILE_PATH, {
      activeAccountId: newAccountId || undefined,
      accounts: newAccounts
    });

    accountsStore.set({
      activeAccount: newAccounts.find(account => account.accountId === newAccountId) || null,
      allAccounts: newAccounts
    });

    if (targetAccountId) AutomationBase.removeAccount(targetAccountId);

    if (oldActiveAccount?.deviceId)
      DeviceAuthManager.delete(oldActiveAccount, oldActiveAccount.deviceId).catch(console.error);
  }
}
