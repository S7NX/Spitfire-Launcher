<script lang="ts">
  import Select from '$components/ui/Select.svelte';
  import FilterIcon from 'lucide-svelte/icons/filter';
  import ChevronsUpAndDownIcon from 'lucide-svelte/icons/chevrons-up-down';
  import type { SpitfireShopFilter } from '$types/game/shop';

  const filters: SpitfireShopFilter[] = ['All', 'New', 'Leaving Soon', 'Longest Wait'];

  type Props = {
    selected: typeof filters[number];
  };

  let { selected = $bindable() }: Props = $props();

  const items = filters.map((x: string) => ({ label: x, value: x }));
</script>

<Select {items} type="single" bind:value={selected}>
  {#snippet trigger(label)}
    <FilterIcon class="text-muted-foreground size-5 mr-2"/>
    <span class="text-muted-foreground">{label || 'Select a filter'}</span>
    <ChevronsUpAndDownIcon class="text-muted-foreground size-5 ml-auto"/>
  {/snippet}
</Select>