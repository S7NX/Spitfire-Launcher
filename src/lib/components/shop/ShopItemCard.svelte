<script lang="ts">
  import type { SpitfireShopItem } from '$types/game/shop';
  import { ItemColors } from '$lib/constants/itemColors';
  import { activeAccountId } from '$lib/stores';
  import ShopItemModal from '$components/shop/modals/ShopItemModal.svelte';

  type ItemCardProps = {
    item: SpitfireShopItem;
  };

  const { item }: ItemCardProps = $props();

  const hasActiveAccount = $derived(!!$activeAccountId);
  let showItemModal = $state(false);

  const displayName = item.name;
  const imageUrl = item.assets.featured || item.assets.icon || item.assets.smallIcon;

  const colors: Record<string, string> = { ...ItemColors.rarities, ...ItemColors.series };

  const seriesId = item.series?.id?.toLowerCase() || '';
  const rarityId = item.rarity.id.toLowerCase();

  const backgroundColorHex = colors[seriesId] || colors[rarityId] || colors.common;

  function handleItemModal() {
    if (!hasActiveAccount) return;
    showItemModal = true;
  }
</script>

<div
  style="background-color: {backgroundColorHex}"
  class="relative pb-[100%] rounded-xl overflow-hidden transition-all duration-300 w-full hover:scale-105 {hasActiveAccount ? 'cursor-pointer' : ''}"
  onclick={handleItemModal}
  onkeydown={(e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleItemModal();
    }
  }}
  role="button"
  tabindex="0"
>
  {#if imageUrl}
    <img
      class="absolute pointer-events-none select-none"
      alt={displayName}
      draggable="false"
      src={imageUrl}
    />
  {/if}

  <div class="absolute bottom-0 left-0 right-0 p-2.5 bg-gradient-to-t from-black/80 to-transparent">
    <div class="item-info">
      <h3
        style="text-shadow: 0 2px 4px #000000"
        class="text-white text-lg font-bold mb-2 leading-none text-left"
      >
        {displayName}
      </h3>

      <div class="relative flex items-center justify-start pl-6">
        <img
          class="absolute left-0 top-1/2 -translate-y-1/2 w-5 h-5 object-contain"
          alt="V-Bucks"
          draggable="false"
          src="/assets/resources/currency_mtxswap.png"
        />

        <span
          style="text-shadow: 0 2px 4px #000000"
          class="text-sm text-white font-bold pb-0.5"
        >
          {item.price.final.toLocaleString()}
        </span>
      </div>
    </div>
  </div>
</div>

<ShopItemModal {item} bind:open={showItemModal}/>