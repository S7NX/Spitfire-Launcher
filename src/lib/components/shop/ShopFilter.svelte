<script lang="ts">
  import Select from '$components/ui/Select.svelte';
  import FilterIcon from 'lucide-svelte/icons/filter';
  import ChevronsUpAndDownIcon from 'lucide-svelte/icons/chevrons-up-down';
  import type { SpitfireShopFilter } from '$types/game/shop';
  import { t } from '$lib/utils/util';

  const filters: { name: string; id: SpitfireShopFilter }[] = [
    { name: $t('itemShop.filters.all'), id: 'all' },
    { name: $t('itemShop.filters.new'), id: 'new' },
    { name: $t('itemShop.filters.leavingSoon'), id: 'leavingSoon' },
    { name: $t('itemShop.filters.longestWait'), id: 'longestWait' }
  ];

  type Props = {
    selected: SpitfireShopFilter;
  };

  let { selected = $bindable() }: Props = $props();

  const items = filters.map((x) => ({ label: x.name, value: x.id }));
</script>

<Select {items} type="single" bind:value={selected}>
  {#snippet trigger(label)}
    <FilterIcon class="text-muted-foreground size-5 mr-2"/>
    <span class="text-muted-foreground">{label || $t('itemShop.selectFilter')}</span>
    <ChevronsUpAndDownIcon class="text-muted-foreground size-5 ml-auto"/>
  {/snippet}
</Select>
