import DataStorage from '$lib/core/dataStorage';
import { accountsStore, activeAccountId, customizableMenuStore, language } from '$lib/stores';
import { changeLocale } from '$lib/utils/util';
import { get } from 'svelte/store';

export const prerender = true;
export const ssr = false;

export async function load() {
  const accountsFile = await DataStorage.getAccountsFile();
  const settings = await DataStorage.getSettingsFile();

  if (settings.app?.language && get(language) !== settings.app?.language) {
    await changeLocale(settings.app.language).catch(console.error);
  }

  const startingAccount = settings.app?.startingAccount;

  let accountId: string | null | undefined = startingAccount === 'lastUsed'
    ? accountsFile.activeAccountId
    : accountsFile.accounts[0]?.accountId;

  let activeAccount = accountsFile.accounts.find((account) => account.accountId === accountId) || null;

  if (accountId && !activeAccount) {
    accountId = accountsFile.accounts?.[0]?.accountId || null;
    activeAccount = accountsFile.accounts?.[0] || null;
  }

  accountsStore.set({
    activeAccount: activeAccount,
    allAccounts: accountsFile.accounts
  });

  activeAccountId.set(accountId || null);

  if (settings.customizableMenu) {
    customizableMenuStore.set(settings.customizableMenu);
  }
}