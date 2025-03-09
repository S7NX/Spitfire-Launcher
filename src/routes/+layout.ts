// Tauri doesn't have a Node.js server to do proper SSR
// so we will use adapter-static to prerender the app (SSG)
// See: https://v2.tauri.app/start/frontend/sveltekit/ for more info
import DataStorage from '$lib/core/dataStorage';
import { accountsStore, activeAccountId } from '$lib/stores';

export const prerender = true;
export const ssr = false;

export async function load() {
  const accountsFile = await DataStorage.getAccountsFile();

  let accountId: string | null | undefined = accountsFile.activeAccountId
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
}