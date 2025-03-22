<script lang="ts">
  import Switch from '$components/ui/Switch.svelte';
  import DataStorage, { SETTINGS_FILE_PATH } from '$lib/core/dataStorage';
  import type { AllSettings } from '$types/settings';
  import { sidebarCategories } from '$components/Sidebar.svelte';
  import { customizableMenuStore } from '$lib/stores';
  import { Separator } from 'bits-ui';

  let menuSettings = $derived($customizableMenuStore);

  function setVisibility<K extends keyof NonNullable<AllSettings['customizableMenu']>>(
    value: boolean,
    key: K
  ) {
    menuSettings = {
      ...menuSettings,
      [key]: value
    };

    customizableMenuStore.set(menuSettings);

    DataStorage.writeConfigFile<AllSettings>(SETTINGS_FILE_PATH, {
      customizableMenu: menuSettings
    });
  }
</script>

<div class="space-y-6">
  {#each sidebarCategories as category (category.name)}
    <div>
      <h2 class="text-lg font-semibold mb-1">{category.name}</h2>
      <Separator.Root class="bg-border h-px mb-3"/>

      <div class="grid grid-cols-1 xs:grid-cols-2 gap-y-1 gap-x-3">
        {#each category.items as item (item.name)}
          <div class="flex items-center justify-between">
            <p class="flex-1 text-sm">{item.name}</p>
            <Switch
              checked={menuSettings[item.key] !== false}
              onCheckedChange={(checked) => setVisibility(checked, item.key)}
            />
          </div>
        {/each}
      </div>
    </div>
  {/each}
</div>
