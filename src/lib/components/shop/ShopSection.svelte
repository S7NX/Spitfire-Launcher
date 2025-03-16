<script lang="ts">
  import type { SpitfireShopSection } from '$lib/types/game/shop';
  import ShopItemCard from '$components/shop/ShopItemCard.svelte';
  import Button from '$components/ui/Button.svelte';

  type ShopSectionProps = {
    section: SpitfireShopSection;
  };

  const { section }: ShopSectionProps = $props();

  section.items.sort((a, b) => b.sortPriority - a.sortPriority);

  const isJamTracksSection = section.name.toLowerCase() === 'jam tracks' || section.id.toLowerCase().includes('jamtracks');
  const MAX_ITEMS_PER_SECTION = isJamTracksSection ? 18 : Infinity;

  let shownItemCount = $state(MAX_ITEMS_PER_SECTION);

  const displayedItems = $derived(section.items.slice(0, shownItemCount));
  const shouldShowViewHandler = isJamTracksSection && section.items.length > MAX_ITEMS_PER_SECTION;
</script>

<div class="flex flex-col items-center mb-9">
  <h2 class="w-full text-2xl text-primary font-extrabold uppercase tracking-wider mb-4">
    {section.name}
  </h2>

  <div class="w-full @container">
    <div class="grid gap-4 @max-[28rem]:grid-cols-2 @max-[36rem]:grid-cols-3 @max-[48rem]:grid-cols-4 @max-[60rem]:grid-cols-5 @max-[75rem]:grid-cols-6 @max-[90rem]:grid-cols-7">
      {#each displayedItems as item (item.offerId)}
        <ShopItemCard {item}/>
      {/each}
    </div>
  </div>

  {#if shouldShowViewHandler}
    <div class="mt-6">
      {#if shownItemCount < section.items.length}
        <Button
          color="primary"
          onclick={() => shownItemCount = section.items.length}
        >
          Show All
        </Button>
      {/if}

      {#if shownItemCount !== MAX_ITEMS_PER_SECTION}
        <Button
          color="primary"
          onclick={() => shownItemCount = MAX_ITEMS_PER_SECTION}
        >
          Show Less
        </Button>
      {/if}
    </div>
  {/if}
</div>