import DataStorage, { ACCOUNTS_FILE_PATH } from '$lib/core/dataStorage';
import { get } from 'svelte/store';
import { accountsStore, activeAccountId } from '$lib/stores';
import type { AccountData, AccountDataFile } from '$types/accounts';
import DeviceAuthManager from '$lib/core/managers/deviceAuth';

export default class Account {
  static async getAllAccounts() {
    const accountsFile = await DataStorage.getAccountsFile();
    return accountsFile.accounts;
  }

  static async changeActiveAccount(id: string | null) {
    activeAccountId.set(id);
    await DataStorage.writeConfigFile<AccountDataFile>(ACCOUNTS_FILE_PATH, { activeAccountId: id || undefined });
  }

  static async addAccount(account: AccountData, setActive = true) {
    const accounts = await Account.getAllAccounts();
    accounts.push(account);

    if (setActive) {
      activeAccountId.set(account.accountId);
      accountsStore.set({
        activeAccount: account,
        allAccounts: accounts
      });
    }

    await DataStorage.writeConfigFile<AccountDataFile>(ACCOUNTS_FILE_PATH, {
      activeAccountId: setActive ? account.accountId : get(activeAccountId) || undefined,
      accounts
    });
  }

  static async logout() {
    const oldActiveActiveAccount = get(accountsStore).activeAccount;
    const oldAccountId = get(activeAccountId);
    const oldAccounts = await Account.getAllAccounts();

    const newAccounts = oldAccounts.filter((account) => account.accountId !== oldAccountId);
    const newAccountId = newAccounts[0]?.accountId || null;

    await Account.changeActiveAccount(newAccountId || null);
    await DataStorage.writeConfigFile<AccountDataFile>(ACCOUNTS_FILE_PATH, {
      activeAccountId: newAccountId || undefined,
      accounts: newAccounts
    });

    const newActiveAccountData = get(accountsStore).activeAccount;

    accountsStore.set({
      activeAccount: newActiveAccountData,
      allAccounts: newAccounts
    });

    if (oldActiveActiveAccount?.deviceId)
      DeviceAuthManager.delete(oldActiveActiveAccount, oldActiveActiveAccount.deviceId).catch(console.error);
  }
}
