<script lang="ts">
  import WorldInfoOverview from '$components/stw/worldInfo/WorldInfoOverview.svelte';
  import WorldInfoCompletedAlerts from '$components/stw/worldInfo/WorldInfoCompletedAlerts.svelte';
  import { cn } from '$lib/utils';

  const tabs = [
    { name: 'Overview', component: WorldInfoOverview },
    { name: 'Claimed Alerts', component: WorldInfoCompletedAlerts }
  ];

  let activeTab = $state(tabs[0].name);
</script>

<div class="flex flex-col gap-y-5">
  <h2 class="font-bold text-2xl">World Info</h2>

  <div class="flex flex-col">
    <div class="flex border-b mb-4">
      {#each tabs as tab (tab.name)}
        <button
          class={cn(
            'px-3 py-2 font-medium text-sm transition-colors',
            activeTab === tab.name
              ? 'border-b-2 border-primary text-primary'
              : 'text-muted-foreground hover:text-foreground'
          )}
          onclick={() => activeTab = tab.name}
        >
          {tab.name}
        </button>
      {/each}
    </div>

    <div>
      {#each tabs as tab (tab.name)}
        {@const TabComponent = tab.component}

        <div class="{activeTab === tab.name ? 'block' : 'hidden'}">
          <TabComponent/>
        </div>
      {/each}
    </div>
  </div>
</div>