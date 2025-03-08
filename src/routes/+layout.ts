// Tauri doesn't have a Node.js server to do proper SSR
// so we will use adapter-static to prerender the app (SSG)
// See: https://v2.tauri.app/start/frontend/sveltekit/ for more info
import DataStorage from '$lib/core/dataStorage';
import { accountsStore, activeAccountId } from '$lib/stores';

export const prerender = true;
export const ssr = false;

export async function load() {
  const allAccounts = await DataStorage.getAccountsFile();

  activeAccountId.set(allAccounts.activeAccountId || null);

  accountsStore.set({
    activeAccount: allAccounts.activeAccountId ? allAccounts.accounts.find((account) => account.accountId === allAccounts.activeAccountId) || null : null,
    allAccounts: allAccounts.accounts
  });
}