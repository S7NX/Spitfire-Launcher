<script lang="ts">
  import { cn } from '$lib/utils';
  import type { Component, Snippet } from 'svelte';

  type Props = {
    tabs: { name: string; component: Snippet | Component, disabled?: boolean }[];
    // Default is if-else, however it is slower to render than class if the tab component is too heavy
    switchType?: 'if-else' | 'class'
    activeTab?: string;
  };

  let {
    tabs,
    switchType = 'if-else',
    activeTab = $bindable()
  }: Props = $props();

  $effect(() => {
    if (!activeTab) activeTab = tabs[0].name;
  });
</script>

<div class="flex flex-col">
  <div class="flex border-b mb-4">
    {#each tabs as tab (tab.name)}
      <button
        class={cn(
          'px-3 py-2 font-medium text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-50',
          activeTab === tab.name
            ? 'border-b-2 border-primary text-primary'
            : 'text-muted-foreground hover:text-foreground'
        )}
        disabled={tab.disabled}
        onclick={() => activeTab = tab.name}
      >
        {tab.name}
      </button>
    {/each}
  </div>

  {#each tabs as tab (tab.name)}
    {@const TabComponent = tab.component}

    {#if switchType === 'if-else'}
      {#if activeTab === tab.name}
        <TabComponent/>
      {/if}
    {:else}
      <div class="{activeTab === tab.name ? 'block' : 'hidden'}">
        <TabComponent/>
      </div>
    {/if}
  {/each}
</div>