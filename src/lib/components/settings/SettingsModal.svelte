<script lang="ts">
  import Dialog from '$components/ui/Dialog.svelte';
  import AppSettings from '$components/settings/categories/AppSettings.svelte';
  import SettingsIcon from 'lucide-svelte/icons/settings';
  import { cn } from '$lib/utils';
  import ScrollArea from '$components/ui/ScrollArea.svelte';

  const categories = [
    { id: 'app-settings', label: 'App Settings', component: AppSettings }
  ];

  let activeTab = $state(categories[0].id);
</script>

<Dialog
  contentProps={{ class: '!max-w-[calc(100%-9rem)]' }}
  triggerClass="p-2 rounded-md hover:bg-accent hover:text-accent-foreground"
>
  {#snippet trigger()}
    <SettingsIcon class="size-6"/>
  {/snippet}

  {#snippet title()}
    Settings
  {/snippet}

  <div class="flex flex-col sm:flex-row">
    <div class="sm:w-48 sm:pr-4 sm:border-r">
      <div class="flex flex-row sm:flex-col gap-2 mb-2 sm:mb-0">
        {#each categories as category (category.id)}
          <button
            class={cn(
              'text-left px-3 py-2 rounded-md text-sm font-medium transition-colors w-fit sm:w-full',
              activeTab === category.id
                ? 'bg-primary text-primary-foreground'
                : 'hover:bg-muted'
            )}
            onclick={() => activeTab = category.id}
          >
            {category.label}
          </button>
        {/each}
      </div>
    </div>

    <div class="flex-1 p-1 sm:p-4 h-96 overflow-y-auto">
      <ScrollArea>
        {#each categories as category (category.id)}
          {@const CategoryComponent = category.component}

          <div class="space-y-6 {activeTab === category.id ? 'block' : 'hidden'}">
            <CategoryComponent/>
          </div>
        {/each}
      </ScrollArea>
    </div>
  </div>
</Dialog>