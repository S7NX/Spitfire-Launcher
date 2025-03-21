import type { SpitfireShopItem } from '$types/game/shop';
import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { accountsStore, ownedItemsStore } from '$lib/stores';
import { get } from 'svelte/store';
import { toast } from 'svelte-sonner';
import { goto } from '$app/navigation';
import EpicAPIError from '$lib/exceptions/EpicAPIError';
import type { EpicAPIErrorData } from '$types/game/authorizations';
import type { FullQueryProfile } from '$types/game/mcp';
import type { AllSettings } from '$types/settings';
import DataStorage from '$lib/core/dataStorage';
import { Pages } from '$lib/constants/pages';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function checkLogin() {
  const hasAccount = !!get(accountsStore).activeAccount;

  if (!hasAccount) {
    goto('/br-stw/stw-world-info', {
      state: {
        showLoginModal: true
      }
    }).then(() => {
      toast.error('You must be logged in to view this page.');
    });

    return false;
  }

  return true;
}

export function nonNull<T>(value: T): NonNullable<T> {
  return value as NonNullable<T>;
}

export function isEpicApiError(data: any): data is EpicAPIErrorData {
  return (data as EpicAPIErrorData)?.errorCode !== undefined;
}

export function calculateVbucks(queryProfile: FullQueryProfile<'common_core'>) {
  const profile = queryProfile.profileChanges[0].profile;
  const vbucksItems = Object.values(profile.items).filter(
    (x) => x.templateId.startsWith('Currency:Mtx') && !(profile.stats.attributes.current_mtx_platform === 'Nintendo' && x.attributes.platform !== 'Nintendo')
  );

  return vbucksItems.reduce((acc, x) => acc + x.quantity, 0);
}

// TODO: Temporary solution to avoid showing multiple toasts when the system logs the user out
export function shouldErrorBeIgnored(error: unknown) {
  if (error instanceof EpicAPIError) {
    if (error.errorCode === 'errors.com.epicgames.account.invalid_account_credentials') return true;
  }
}

export function isLegendaryOrMythicSurvivor(itemId: string) {
  return itemId.includes('workerbasic_sr') || (itemId.startsWith('Worker:manager') && itemId.includes('_sr_'));
}

export async function getStartingPage(settingsData?: AllSettings) {
  const settings = settingsData || await DataStorage.getSettingsFile();
  const startingPage = settings.app?.startingPage!;

  return Pages[startingPage];
}

export function calculateDiscountedShopPrice(accountId: string, item: SpitfireShopItem) {
  const isBundle = item.contents.some(item => item.alreadyOwnedPriceReduction != null);
  const ownedItems = get(ownedItemsStore)[accountId];
  if (!ownedItems?.size || !isBundle) return item.price.final;

  return item.contents.reduce((acc, item) => {
    const isOwned = ownedItems.has(item.id?.toLowerCase());
    const reduction = item.alreadyOwnedPriceReduction;

    if (isOwned && reduction != null) return acc - reduction;
    return acc;
  }, item.price.final);
}