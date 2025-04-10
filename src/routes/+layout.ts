import { redirect } from '@sveltejs/kit';
import DataStorage from '$lib/core/dataStorage';
import { accountsStore, activeAccountId, customizableMenuStore } from '$lib/stores';
import { page } from '$app/state';
import { getStartingPage } from '$lib/utils/util';

export const prerender = true;
export const ssr = false;

export async function load() {
  const accountsFile = await DataStorage.getAccountsFile();
  const settings = await DataStorage.getSettingsFile();

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

  if (page.url.pathname === '/') {
    const pagePath = await getStartingPage();
    if (pagePath) {
      page.url.pathname = pagePath;
      redirect(307, pagePath);
    }
  }
}