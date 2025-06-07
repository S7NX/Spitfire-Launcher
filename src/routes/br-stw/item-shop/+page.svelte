<script lang="ts">
  import PageContent from '$components/PageContent.svelte';
  import ShopFilter from '$components/shop/ShopFilter.svelte';
  import ShopSection from '$components/shop/ShopSection.svelte';
  import SkeletonShopSection from '$components/shop/SkeletonShopSection.svelte';
  import Input from '$components/ui/Input.svelte';
  import FriendManager from '$lib/core/managers/friend';
  import LookupManager from '$lib/core/managers/lookup';
  import MCPManager from '$lib/core/managers/mcp';
  import ShopManager from '$lib/core/managers/shop';
  import { accountDataStore, accountsStore, brShopStore, ownedItemsStore } from '$lib/stores';
  import { calculateVbucks, formatRemainingDuration, getResolvedResults, t } from '$lib/utils/util';
  import type { AccountStoreData } from '$types/accounts';
  import type { SpitfireShopFilter, SpitfireShopSection } from '$types/game/shop';
  import { onMount } from 'svelte';

  const activeAccount = $derived($accountsStore.activeAccount);

  $effect(() => {
    fetchAccountData();
  });

  let remainingTime = $state<number>();
  let shopSections = $state<SpitfireShopSection[] | null>(null);
  let errorOccurred = $state(false);
  let searchQuery = $state<string>('');
  let selectedFilter = $state<SpitfireShopFilter>('all');

  const filteredItems = $derived.by(() => {
    if (!shopSections) return null;

    let result: SpitfireShopSection[] = [];

    switch (selectedFilter || 'all') {
      case 'all':
        result = shopSections;
        break;
      case 'new':
        result = shopSections.map((section) => ({
          ...section,
          items: section.items.filter((item) => !item.dates.lastSeen)
        }));
        break;
      case 'leavingSoon':
        result = shopSections.map((section) => ({
          ...section,
          items: section.items.filter((item) => item.dates.out && new Date(item.dates.out).getTime() - Date.now() < 3 * 24 * 60 * 60 * 1000)
        }));
        break;
      case 'longestWait':
        result = shopSections.map((section) => ({
          ...section,
          items: section.items.filter((item) => item.dates.lastSeen && Date.now() - new Date(item.dates.lastSeen).getTime() > 120 * 24 * 60 * 60 * 1000)
        }));
        break;
    }

    return result.map(section => {
      const search = searchQuery.toLowerCase().trim();
      if (!search) return section;

      const filteredItems = section.items.filter((item) => {
        const itemName = item.name?.toLowerCase();
        return itemName?.includes(search)
          || item.id?.toLowerCase()?.includes(search)
          || item.offerId.toLowerCase()?.includes(search);
      });

      return {
        ...section,
        items: filteredItems
      };
    }).filter(x => x.items.length > 0);
  });

  async function fetchShop(force?: boolean) {
    shopSections = null;

    try {
      const shopResponse = (!force && $brShopStore) || await ShopManager.fetch();
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
      const accountsData = await LookupManager.fetchByIds(
        activeAccount,
        friendList.map((friend) => friend.accountId)
      );
      accountData.friends = accountsData.map((account) => ({
        displayName: account.displayName,
        accountId: account.id
      }));
    }

    if (commonCoreProfile || friendList) {
      accountDataStore.update((accounts) => {
        accounts[activeAccount.accountId] = accountData;
        return accounts;
      });
    }
  }

  function getResetDate() {
    const now = new Date();
    const year = now.getUTCFullYear();
    const month = now.getUTCMonth();
    const day = now.getUTCDate();

    return new Date(Date.UTC(year, month, day + 1));
  }

  onMount(() => {
    remainingTime = getResetDate().getTime() - Date.now();

    let intervalId: number;
    let isFetching = false;

    fetchShop().then(() => {
      intervalId = window.setInterval(() => {
        const nextResetDate = getResetDate();
        remainingTime = nextResetDate.getTime() - Date.now();

        if (Date.now() > nextResetDate.getTime() && !isFetching) {
          isFetching = false;
          fetchShop(true).then(() => {
            isFetching = true;
          });
        }
      }, 1000);
    });

    return () => {
      clearInterval(intervalId);
    };
  });
</script>

<PageContent
  class="mt-2"
  description={remainingTime ? $t('itemShop.nextRotation', { time: formatRemainingDuration(remainingTime) }) : undefined}
  title={$t('itemShop.page.title')}
>
  <div class="flex max-xs:flex-col items-center gap-2">
    <Input
      class="max-w-64 max-xs:max-w-full w-full"
      placeholder={$t('itemShop.searchPlaceholder')}
      type="search"
      bind:value={searchQuery}
    />
    <ShopFilter bind:selected={selectedFilter}/>
  </div>

  <div class="mt-4">
    {#if !filteredItems}
      {#if errorOccurred}
        <p class="text-red-500">{$t('itemShop.failedtoFetch')}</p>
      {:else}
        <div class="space-y-6">
          {#each Array(2) as _, index (index)}
            <SkeletonShopSection/>
          {/each}
        </div>
      {/if}
    {:else if filteredItems?.length}
      {#each filteredItems as section (section.id)}
        <ShopSection {section}/>
      {/each}
    {:else}
      <p>{$t('itemShop.noItems')}</p>
    {/if}
  </div>
</PageContent>