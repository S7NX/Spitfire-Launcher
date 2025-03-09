import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { accountsStore } from '$lib/stores';
import { get } from 'svelte/store';
import { toast } from 'svelte-sonner';
import { goto } from '$app/navigation';
import type { EpicAPIErrorData } from '$types/game/authorizations';
import type { FullQueryProfile } from '$types/game/mcp';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function checkLogin() {
  const hasAccount = !!get(accountsStore).activeAccount;

  if (!hasAccount) {
    goto('/', {
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