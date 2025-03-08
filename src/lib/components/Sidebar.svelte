<script lang="ts">
  import { slide } from 'svelte/transition';
  import { cubicInOut } from 'svelte/easing';
  import ChevronDownIcon from 'lucide-svelte/icons/chevron-down';
  import config from '$lib/config';
  import { cn } from '$lib/utils';
  import Button from '$components/ui/Button.svelte';
  import packageJson from '../../../package.json';
  import { page } from '$app/state';

  const categories = $state([
    {
      name: 'Account',
      expanded: true,
      items: [
        { name: 'V-Bucks', href: '/account-management/vbucks' },
        { name: 'Redeem Codes', href: '/account-management/redeem-codes' },
        { name: 'Epic Games Settings', href: '/account-management/epic-games-settings' },
        { name: 'EULA', href: '/account-management/eula' }
      ]
    },
    {
      name: 'BR & STW',
      expanded: true,
      items: [
        { name: 'Item Shop', href: '/br-stw/item-shop' },
        { name: 'Earned XP', href: '/br-stw/earned-xp' },
        { name: 'STW Shop', href: '/br-stw/stw-shop' },
        { name: 'STW World Info', href: '/br-stw/stw-world-info' },
        { name: 'Lookup Players', href: '/br-stw/lookup-players' }
      ]
    },
    {
      name: 'Authentication',
      expanded: true,
      items: [
        { name: 'Exchange Token', href: '/authentication/generate-exchange-code' },
        { name: 'Access Token', href: '/authentication/generate-access-token' },
        { name: 'Device Auth', href: '/authentication/device-auth' }
      ]
    }
  ]);

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
</script>

<aside class="h-screen w-54 bg-surface-alt border-r border-border flex flex-col overflow-hidden select-none sticky top-0">
  <div class="flex align-center justify-center p-4 border-b border-border h-16" data-tauri-drag-region>
    <a class="text-xl font-bold" href="/">{config.name}</a>
  </div>

  <nav class="flex-1 overflow-y-auto py-4">
    <ul class="space-y-1 px-2">
      {#each categories as category, i (category.name)}
        <li>
          <button
            class={cn(
              'w-full px-3 py-2 text-sm font-medium rounded-md',
              'flex justify-between items-center',
              'hover:bg-accent hover:text-accent-foreground transition-colors'
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
                <li>
                  <a
                    class={cn(
                      'block px-3 py-1 text-sm rounded-md truncate',
                      'hover:bg-accent hover:text-accent-foreground transition-colors',
                      page.url.pathname === item.href && 'bg-accent text-accent-foreground'
                    )}
                    href={item.href}
                  >
                    {item.name}
                  </a>
                </li>
              {/each}
            </ul>
          {/if}
        </li>
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

      <div class="text-center mt-4 text-xs text-muted-foreground">
        <span>Version
          <a
            class="underline underline-offset-2"
            href="{config.links.github}/releases/tag/v{packageJson.version}"
            target="_blank"
          >
            v{packageJson.version}
          </a>
        </span>
      </div>
    </div>
  </nav>
</aside>
