import type { SpitfireShopItem } from '$types/game/shop';
import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { accountsStore, language, ownedItemsStore } from '$lib/stores';
import { derived, get } from 'svelte/store';
import { toast } from 'svelte-sonner';
import { goto } from '$app/navigation';
import EpicAPIError from '$lib/exceptions/EpicAPIError';
import type { EpicAPIErrorData } from '$types/game/authorizations';
import type { FullQueryProfile } from '$types/game/mcp';
import type { AllSettings } from '$types/settings';
import DataStorage, { SETTINGS_FILE_PATH } from '$lib/core/dataStorage';
import { Pages } from '$lib/constants/pages';
import { m } from '$lib/paraglide/messages';
import { setLocale, type Locale } from '$lib/paraglide/runtime';

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

  return Pages[startingPage] || Pages.stwWorldInfo;
}

export function calculateDiscountedShopPrice(accountId: string, item: SpitfireShopItem) {
  const isBundle = item.contents.some(item => item.alreadyOwnedPriceReduction != null);
  const ownedItems = get(ownedItemsStore)[accountId];
  if (!ownedItems?.size || !isBundle) return item.price.final;

  return item.contents.reduce((acc, content) => {
    const isOwned = ownedItems.has(content.id?.toLowerCase());
    const reduction = content.alreadyOwnedPriceReduction;

    if (isOwned && reduction != null) return Math.max(acc - reduction, item.price.floor);
    return Math.max(acc, item.price.floor);
  }, item.price.final);
}

export function formatRemainingDuration(ms: number) {
  const translate = get(t);
  const days = Math.floor(ms / 86400000);
  const hours = Math.floor((ms % 86400000) / 3600000);
  const minutes = Math.floor((ms % 3600000) / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);

  const parts = [];

  if (days) {
    const key = days === 1 ? 'one' : 'other' as const;
    parts.push(translate(`times.days.${key}`, { count: days }));
  }

  if (hours) {
    const key = hours === 1 ? 'one' : 'other' as const;
    parts.push(translate(`times.hours.${key}`, { count: hours }));
  }

  if (minutes) {
    const key = minutes === 1 ? 'one' : 'other' as const;
    parts.push(translate(`times.minutes.${key}`, { count: minutes }));
  }

  if (seconds) {
    const key = seconds === 1 ? 'one' : 'other' as const;
    parts.push(translate(`times.seconds.${key}`, { count: seconds }));
  }

  return parts.length ? parts.join(' ') : translate('times.seconds.other', { count: 0 });
}

export async function getResolvedResults<T extends readonly unknown[]>(
  promises: { [K in keyof T]: Promise<T[K]> }
): Promise<{ [K in keyof T]: T[K] | null }> {
  const results = await Promise.allSettled(promises);
  return results.map(result => result.status === 'fulfilled' ? result.value : null) as { [K in keyof T]: T[K] | null };
}

export function evaluateCurve(keys: { Time: number, Value: number; }[], time: number) {
  if (time < keys[0].Time) {
    return keys[0].Value;
  }

  if (time >= keys[keys.length - 1].Time) {
    return keys[keys.length - 1].Value;
  }

  const index = keys.findIndex((k) => k.Time > time);

  const prev = keys[index - 1];
  const next = keys[index];

  const fac = (time - prev.Time) / (next.Time - prev.Time);
  return prev.Value * (1 - fac) + next.Value * fac;
}

type MessageKey = keyof typeof m;
type MessageFn<K extends MessageKey> = typeof m[K];
type InputsOf<K extends MessageKey> = Parameters<MessageFn<K>>[0];
type OptionsOf<K extends MessageKey> = Parameters<MessageFn<K>>[1];

export const t = derived(language, ($language) => {
  return function t<K extends MessageKey>(
    key: K,
    inputs?: InputsOf<K>,
    options?: Omit<OptionsOf<K>, "locale">
  ): string {
    return m[key](inputs ?? {} as any, {
      locale: $language,
      ...options,
    }) as ReturnType<MessageFn<K>>;
  };
});

export async function changeLocale(locale: Locale) {
  setLocale(locale, { reload: false });
  language.set(locale);

  const allSettings = await DataStorage.getSettingsFile();
  allSettings.app = { ...allSettings.app, language: locale };

  DataStorage.writeConfigFile<AllSettings>(SETTINGS_FILE_PATH, allSettings).catch(console.error);
}