<script lang="ts">
  import ShopFilter from '$components/shop/ShopFilter.svelte';
  import ShopSection from '$components/shop/ShopSection.svelte';
  import SkeletonShopSection from '$components/shop/SkeletonShopSection.svelte';
  import FriendManager from '$lib/core/managers/friend';
  import LookupManager from '$lib/core/managers/lookup';
  import MCPManager from '$lib/core/managers/mcp';
  import ShopManager from '$lib/core/managers/shop';
  import { accountDataStore, accountsStore, brShopStore, ownedItemsStore } from '$lib/stores';
  import { calculateVbucks, formatRemainingDuration, getResolvedResults } from '$lib/utils/util';
  import type { AccountStoreData } from '$types/accounts';
  import type { SpitfireShopFilter, SpitfireShopSection } from '$types/game/shop';
  import { onMount } from 'svelte';

  const activeAccount = $derived($accountsStore.activeAccount);

  $effect(() => {
    fetchAccountData();
  });

  let nextResetTime = $state(new Date(new Date().setUTCHours(0, 0, 0, 0) + 24 * 60 * 60 * 1000));
  let remainingTime = $state<number>();
  let shopLastUpdated = $state<Date>();
  let shopSections = $state<SpitfireShopSection[] | null>(null);
  let errorOccurred = $state(false);
  let selectedFilter = $state<SpitfireShopFilter>('All');

  const filteredItems = $derived.by(() => {
    if (!shopSections)
      return null;

    if (!selectedFilter || selectedFilter === 'All')
      return shopSections;

    if (selectedFilter === 'New')
      return shopSections.map((section) => ({
        ...section,
        items: section.items.filter((item) => !item.dates.lastSeen)
      })).filter((section) => section.items.length > 0);

    if (selectedFilter === 'Leaving Soon')
      return shopSections.map((section) => ({
        ...section,
        items: section.items.filter((item) => item.dates.out && new Date(item.dates.out).getTime() - Date.now() < 3 * 24 * 60 * 60 * 1000)
      })).filter((section) => section.items.length > 0);

    if (selectedFilter === 'Longest Wait')
      return shopSections.map((section) => ({
        ...section,
        items: section.items.filter((item) => item.dates.lastSeen && Date.now() - new Date(item.dates.lastSeen).getTime() > 120 * 24 * 60 * 60 * 1000)
      })).filter((section) => section.items.length > 0);
  });

  async function fetchShop(force?: boolean) {
    try {
      const shopResponse = (!force && $brShopStore) || await ShopManager.fetch();

      nextResetTime = new Date(new Date().setUTCHours(0, 0, 0, 0) + 24 * 60 * 60 * 1000);
      shopLastUpdated = new Date(shopResponse.lastUpdated);
      shopSections = ShopManager.groupBySections(shopResponse.offers);
    } catch (error) {
      console.error(error);
      errorOccurred = true;
    }
  }

  async function fetchAccountData() {
    const alreadyFetched = activeAccount && Object.keys($accountDataStore[activeAccount.accountId] || {}).length > 0;
    if (!activeAccount || alreadyFetched) return;

    const [athenaProfile, commonCoreProfile, friendList] = await getResolvedResults([
      MCPManager.queryProfile(activeAccount, 'athena'),
      MCPManager.queryProfile(activeAccount, 'common_core'),
      FriendManager.getFriends(activeAccount)
    ]);

    let accountData: AccountStoreData = {
      vbucks: 0,
      remainingGifts: 0,
      friends: []
    };

    if (athenaProfile) {
      const profile = athenaProfile.profileChanges[0].profile;
      const items = Object.values(profile.items);
      const ownedItems = items.filter((item) => item.attributes.item_seen != null).map((item) => item.templateId.split(':')[1].toLowerCase());

      ownedItemsStore.update((accounts) => {
        accounts[activeAccount.accountId] = new Set<string>(ownedItems);
        return accounts;
      });
    }

    if (commonCoreProfile) {
      const profile = commonCoreProfile.profileChanges[0].profile;
      accountData.vbucks = calculateVbucks(commonCoreProfile);
      accountData.remainingGifts = profile.stats.attributes.allowed_to_send_gifts ? 5 : 0;
    }

    if (friendList) {
      const accountsData = await LookupManager.fetchByIds(activeAccount, friendList.map((friend) => friend.accountId));
      accountData.friends = accountsData.map((account) => ({
        displayName: account.displayName,
        accountId: account.id
      }));
    }

    if (commonCoreProfile || friendList) accountDataStore.update((accounts) => {
      accounts[activeAccount.accountId] = accountData;
      return accounts;
    });
  }

  onMount(async () => {
    remainingTime = nextResetTime.getTime() - Date.now();

    await fetchShop();

    setInterval(() => {
      remainingTime = nextResetTime.getTime() - Date.now();

      if (Date.now() > nextResetTime.getTime()) {
        fetchShop(true);
      }
    }, 1000);
  });
</script>

<div class="flex flex-col gap-y-2">
  <div>
    <h1 class="text-2xl font-bold">BR Item Shop</h1>
    <h2 class="text-muted-foreground font-medium">Last updated: {shopLastUpdated?.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    }) || '...'}</h2>

    {#if remainingTime}
      <h2 class="text-muted-foreground font-medium">Next rotation in {formatRemainingDuration(remainingTime)}</h2>
    {/if}
  </div>

  <div>
    <ShopFilter bind:selected={selectedFilter}/>
  </div>

  <div class="mt-6">
    {#if !filteredItems}
      {#if errorOccurred}
        <p class="text-red-500">Failed to fetch shop items. Please try again later.</p>
      {:else}
        <div class="space-y-6">
          {#each Array(2) as _, index (index)}
            <SkeletonShopSection/>
          {/each}
        </div>
      {/if}
    {:else}
      {#if filteredItems?.length}
        {#each filteredItems as section (section.id)}
          <ShopSection {section}/>
        {/each}
      {:else}
        <p>No items found</p>
      {/if}
    {/if}
  </div>
</div>