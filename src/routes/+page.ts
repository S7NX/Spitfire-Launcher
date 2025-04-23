import { redirect } from '@sveltejs/kit';
import { page } from '$app/state';
import { getStartingPage } from '$lib/utils/util';

export async function load() {
  const pagePath = await getStartingPage();
  if (pagePath) {
    page.url.pathname = pagePath;
    redirect(307, pagePath);
  }
}