<script lang="ts" module>
  import type { AllSettings } from '$types/settings';
  import { writable } from 'svelte/store';

  type Category = {
    name: string;
    expanded: boolean;
    items: { key: keyof NonNullable<AllSettings['customizableMenu']>; name: string; href: string }[];
  };

  export const sidebarOpen = writable(false);

  export const sidebarCategories: Category[] = [
    {
      name: 'Account',
      expanded: true,
      items: [
        { key: 'vbucksInformation', name: 'V-Bucks', href: '/account-management/vbucks' },
        { key: 'redeemCodes', name: 'Redeem Codes', href: '/account-management/redeem-codes' },
        { key: 'epicGamesSettings', name: 'Epic Games Settings', href: '/account-management/epic-games-settings' },
        { key: 'eula', name: 'EULA', href: '/account-management/eula' }
      ]
    },
    {
      name: 'BR & STW',
      expanded: true,
      items: [
        { key: 'autoKick', name: 'Auto-Kick', href: '/br-stw/auto-kick' },
        { key: 'taxiService', name: 'Taxi Service', href: '/br-stw/taxi-service' },
        { key: 'botLobby', name: 'Bot Lobby', href: '/br-stw/bot-lobby' },
        { key: 'customStatus', name: 'Custom Status', href: '/br-stw/custom-status' },
        { key: 'partyManagement', name: 'Party', href: '/br-stw/party' },
        { key: 'serverStatus', name: 'Server Status', href: '/br-stw/server-status' },
        { key: 'itemShop', name: 'Item Shop', href: '/br-stw/item-shop' },
        { key: 'earnedXp', name: 'Earned XP', href: '/br-stw/earned-xp' },
        { key: 'dailyQuests', name: 'Daily Quests', href: '/br-stw/daily-quests' },
        { key: 'stwWorldInfo', name: 'STW World Info', href: '/br-stw/stw-world-info' },
        { key: 'lookupPlayers', name: 'Lookup Players', href: '/br-stw/lookup-players' }
      ]
    },
    {
      name: 'Authentication',
      expanded: true,
      items: [
        { key: 'exchangeCode', name: 'Exchange Code', href: '/authentication/generate-exchange-code' },
        { key: 'accessToken', name: 'Access Token', href: '/authentication/generate-access-token' },
        { key: 'deviceAuth', name: 'Device Auth', href: '/authentication/device-auth' }
      ]
    }
  ];
</script>

<script lang="ts">
  import { getVersion } from '@tauri-apps/api/app';
  import { slide } from 'svelte/transition';
  import { cubicInOut } from 'svelte/easing';
  import ChevronDownIcon from 'lucide-svelte/icons/chevron-down';
  import config from '$lib/config';
  import { cn, getStartingPage } from '$lib/utils/util';
  import Button from '$components/ui/Button.svelte';
  import { page } from '$app/state';
  import { onMount } from 'svelte';
  import { customizableMenuStore } from '$lib/stores';

  let startingPage = $state('/');

  const categories = $state(sidebarCategories);
  const externalLinks = [
    {
      name: 'Discord Server',
      href: config.links.discord,
      icon: 'https://cdn.simpleicons.org/discord/A1A1AA'
    },
    {
      name: 'GitHub Repository',
      href: config.links.github,
      icon: 'https://cdn.simpleicons.org/github/A1A1AA'
    }
  ];

  function toggleCategory(index: number) {
    categories[index].expanded = !categories[index].expanded;
  }
  
  function getCategoryVisibility(name: string) {
    return categories.find(category => category.name === name)?.items.some(item => getItemVisibility(item.key));
  }

  function getItemVisibility(key: string) {
    return $customizableMenuStore[key] !== false;
  }

  onMount(() => {
    getStartingPage().then(page => {
      startingPage = page;
    });
  });
</script>

<div
  class="fixed inset-0 bg-black/50 z-40 md:hidden {$sidebarOpen ? 'block' : 'hidden'}"
  onclick={() => sidebarOpen.set(false)}
  onkeydown={(e) => e.key === 'Escape' && sidebarOpen.set(false)}
  role="button"
  tabindex="0"
></div>

<aside
  class={cn(
    'w-54 h-screen bg-surface-alt flex flex-col overflow-hidden select-none',
    'fixed inset-y-0 right-0 z-50 transition-transform duration-300 ease-in-out',
    'md:sticky md:top-0 md:translate-x-0',
    $sidebarOpen ? 'translate-x-0' : 'translate-x-full'
  )}
>
  <div class="flex items-center justify-center p-4 border-b border-r h-16" data-tauri-drag-region>
    <a class="text-xl font-bold" href={startingPage}>{config.name}</a>
  </div>

  <nav class="flex-1 overflow-y-auto py-4 border-r">
    <ul class="space-y-1 px-2">
      {#each categories as category, i (category.name)}
        {#if getCategoryVisibility(category.name)}
          <li>
            <button
              class={cn(
                'w-full px-2 py-1 text-sm font-medium rounded-md',
                'flex justify-between items-center',
                'hover:bg-accent'
              )}
              onclick={() => toggleCategory(i)}
            >
              <span>{category.name}</span>
              <ChevronDownIcon
                class={cn(
                  'size-4 transition-transform duration-200',
                  category.expanded && 'rotate-180'
                )}
              />
            </button>

            {#if category.expanded}
              <ul
                class="mt-1 ml-4 space-y-1 border-l border-border pl-2"
                transition:slide|local={{ duration: 200, easing: cubicInOut }}
              >
                {#each category.items as item (item.name)}
                  {#if getItemVisibility(item.key)}
                    <li>
                      <a
                        class={cn(
                          'block px-3 py-1 text-sm rounded-md truncate',
                          'hover:bg-accent',
                          page.url.pathname === item.href && 'bg-accent text-accent-foreground'
                        )}
                        href={item.href}
                        onclick={() => sidebarOpen.set(false)}
                      >
                        {item.name}
                      </a>
                    </li>
                  {/if}
                {/each}
              </ul>
            {/if}
          </li>
        {/if}
      {/each}
    </ul>

    <div class="border-t mt-4">
      <div class="flex flex-col mt-4">
        {#each externalLinks as link (link.name)}
          <Button
            class="font-medium text-muted-foreground ml-2 px-4 py-2 text-left flex items-center"
            href={link.href}
            size="sm"
            variant="ghost"
          >
            <img class="size-4 mr-2 inline-block" alt={link.name} src={link.icon}/>
            {link.name}
          </Button>
        {/each}
      </div>

      {#await getVersion()}
        <!-- -->
      {:then version}
        <div class="text-center mt-4 text-xs text-muted-foreground">
          <span>Version
            <a
              class="underline underline-offset-2"
              href="{config.links.github}/releases/tag/v{version}"
              target="_blank"
            >
              v{version}
            </a>
          </span>
        </div>
      {/await}
    </div>
  </nav>
</aside>