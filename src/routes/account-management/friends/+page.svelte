<script lang="ts" module>
  let isLoading = $state(false);
</script>

<script lang="ts">
  import CenteredPageContent from '$components/CenteredPageContent.svelte';
  import FriendsList from '$components/friends/FriendsList.svelte';
  import Tabs from '$components/ui/Tabs.svelte';
  import FriendManager from '$lib/core/managers/friend';
  import XMPPManager from '$lib/core/managers/xmpp';
  import { accountsStore, friendsStore } from '$lib/stores';
  import Input from '$components/ui/Input.svelte';
  import { nonNull, t } from '$lib/utils/util';

  type ListType = 'friends' | 'incoming' | 'outgoing' | 'blocklist';

  const activeAccount = $derived(nonNull($accountsStore.activeAccount));

  $effect(() => {
    FriendManager.getSummary(activeAccount);
    XMPPManager.create(activeAccount, 'friendManagement').then(xmpp => {
      xmpp.connect();
    });
  });

  const tabs = $derived([
    { id: 'friends', name: $t('friendManagement.lists.friends'), disabled: !hasFriendsInList('friends') },
    { id: 'incoming', name: $t('friendManagement.lists.incoming'), disabled: !hasFriendsInList('incoming') },
    { id: 'outgoing', name: $t('friendManagement.lists.outgoing'), disabled: !hasFriendsInList('outgoing') },
    { id: 'blocklist', name: $t('friendManagement.lists.blocklist'), disabled: !hasFriendsInList('blocklist') }
  ]);

  // svelte-ignore state_referenced_locally
  let activeTab = $state(tabs[0].id as ListType);
  let searchQuery = $state<string>();

  function hasFriendsInList(listType: ListType) {
    return !!$friendsStore[activeAccount.accountId]?.[listType]?.size;
  }
</script>

<CenteredPageContent class="!w-full" title={$t('friendManagement.page.title')}>
  <Input
    class="grow"
    disabled={isLoading}
    placeholder={$t('lookupPlayers.search')}
    bind:value={searchQuery}
  />

  <div>
    <Tabs {tabs} bind:activeTab/>
    <FriendsList listType={activeTab} bind:searchQuery/>
  </div>
</CenteredPageContent>