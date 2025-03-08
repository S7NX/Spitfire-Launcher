import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { accountsStore } from '$lib/stores';
import { get } from 'svelte/store';
import { toast } from 'svelte-sonner';
import { goto } from '$app/navigation';

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
