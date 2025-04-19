<script lang="ts" module>
  import { SvelteSet } from 'svelte/reactivity';

  let isSendingRequest = $state(false);
  const accountsAdding = new SvelteSet<string>();
  const accountsRemoving = new SvelteSet<string>();
  const accountsBlocking = new SvelteSet<string>();
  const accountsUnblocking = new SvelteSet<string>();
</script>

<script lang="ts">
  import Button from '$components/ui/Button.svelte';
  import FriendManager from '$lib/core/managers/friend';
  import LookupManager from '$lib/core/managers/lookup';
  import LoaderCircleIcon from 'lucide-svelte/icons/loader-circle';
  import UserPlusIcon from 'lucide-svelte/icons/user-plus';
  import UserMinusIcon from 'lucide-svelte/icons/user-minus';
  import BanIcon from 'lucide-svelte/icons/ban';
  import ShieldMinus from 'lucide-svelte/icons/shield-minus';
  import { accountsStore, avatarCache, displayNamesCache, friendsStore } from '$lib/stores';
  import { nonNull, shouldErrorBeIgnored, t } from '$lib/utils/util';
  import type { BlockedAccountData, FriendData, IncomingFriendRequestData, OutgoingFriendRequestData } from '$types/game/friends';
  import { toast } from 'svelte-sonner';
  import type { ClassValue } from 'svelte/elements';

  type Props = {
    listType: 'friends' | 'incoming' | 'outgoing' | 'blocklist';
    searchQuery?: string;
  };

  const {
    listType,
    searchQuery = $bindable()
  }: Props = $props();

  const activeAccount = $derived(nonNull($accountsStore.activeAccount));
  const baseActionButtonClasses: ClassValue = 'rounded-md p-2 disabled:opacity-50 disabled:cursor-not-allowed';

  const list = $derived(Array.from($friendsStore[activeAccount.accountId]?.[listType]?.values() || [])
    .map((data: FriendData | IncomingFriendRequestData | OutgoingFriendRequestData | BlockedAccountData) => ({
      accountId: data.accountId,
      displayName: $displayNamesCache[data.accountId] || data.accountId,
      nickname: 'alias' in data && data.alias,
      avatarUrl: $avatarCache[data.accountId] || 'https://fortnite-api.com/images/cosmetics/br/CID_DEFAULTOUTFIT/smallicon.png',
      createdAt: new Date(data.created)
    }))
    .toSorted((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .filter((friend) => {
      if (!searchQuery) return true;

      const search = searchQuery.toLowerCase();
      return friend.displayName.toLowerCase().includes(search) || friend.accountId.toLowerCase().includes(search);
    })
  );

  async function searchAndAdd() {
    if (!searchQuery) return;

    isSendingRequest = true;

    try {
      const lookupData = await LookupManager.fetchByNameOrId(activeAccount, searchQuery);
      if (!lookupData?.accountId) {
        toast.error($t('lookupPlayers.notFound'));
        return;
      }

      await acceptOrAddFriend(lookupData.accountId);
    } catch (error) {
      if (shouldErrorBeIgnored(error)) return;

      console.error(error);
      toast.error($t('lookupPlayers.notFound'));
    } finally {
      isSendingRequest = false;
    }
  }

  async function acceptOrAddFriend(id: string) {
    accountsAdding.add(id);

    try {
      await FriendManager.addFriend(activeAccount, id);
    } catch (error) {
      toast.error($t('friendManagement.failedToAdd'));
    } finally {
      accountsAdding.delete(id);
    }
  }

  async function denyOrRemoveFriend(id: string) {
    accountsRemoving.add(id);

    try {
      await FriendManager.removeFriend(activeAccount, id);
    } catch (error) {
      toast.error($t('friendManagement.failedToRemove'));
    } finally {
      accountsRemoving.delete(id);
    }
  }

  async function blockUser(id: string) {
    accountsBlocking.add(id);

    try {
      await FriendManager.block(activeAccount, id);
    } catch (error) {
      toast.error($t('friendManagement.failedToBlock'));
    } finally {
      accountsBlocking.delete(id);
    }
  }

  async function unblockUser(id: string) {
    accountsUnblocking.add(id);

    try {
      await FriendManager.unblock(activeAccount, id);
    } catch (error) {
      toast.error($t('friendManagement.failedToUnblock'));
    } finally {
      accountsUnblocking.delete(id);
    }
  }
</script>

<div class="space-y-4">
  {#if list?.length}
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {#each list as friend (friend.accountId)}
        <div class="flex items-center justify-between p-4 rounded-md bg-accent text-accent-foreground">
          <div class="flex items-center gap-4">
            <img
              class="size-10 rounded-full"
              alt={friend.displayName}
              loading="lazy"
              src={friend.avatarUrl}
            />

            <div class="flex flex-col">
              <span class="font-medium">{friend.displayName}</span>
              {#if friend.nickname}
                <span class="text-sm text-muted-foreground">{friend.nickname}</span>
              {/if}
            </div>
          </div>

          <div class="flex gap-2">
            {#if listType === 'friends'}
              {@render RemoveFriendButton(friend.accountId, 'friend')}
              {@render BlockButton(friend.accountId)}
            {:else if listType === 'incoming'}
              {@render AddFriendButton(friend.accountId)}
              {@render RemoveFriendButton(friend.accountId, 'incoming')}
              {@render BlockButton(friend.accountId)}
            {:else if listType === 'outgoing'}
              {@render RemoveFriendButton(friend.accountId, 'outgoing')}
              {@render BlockButton(friend.accountId)}
            {:else if listType === 'blocklist'}
              {@render UnblockButton(friend.accountId)}
            {/if}
          </div>
        </div>
      {/each}
    </div>
  {:else}
    <div class="flex flex-col items-center justify-center p-4 gap-1">
      <div class="rounded-full bg-muted p-4 mb-2">
        <BanIcon class="size-10 text-muted-foreground"/>
      </div>

      <h3 class="text-xl font-medium">
        {#if listType === 'friends'}
          {$t('friendManagement.noFriends')}
        {:else if listType === 'incoming'}
          {$t('friendManagement.noIncomingRequests')}
        {:else if listType === 'outgoing'}
          {$t('friendManagement.noOutgoingRequests')}
        {:else if listType === 'blocklist'}
          {$t('friendManagement.noBlockedUsers')}
        {/if}
      </h3>

      {#if listType === 'friends' && (searchQuery?.length || 0) >= 3}
        <Button
          class="not-disabled:underline not-disabled:underline-offset-2 text-muted-foreground"
          disabled={isSendingRequest}
          loading={isSendingRequest}
          loadingText={$t('friendManagement.sendingRequest')}
          onclick={searchAndAdd}
          variant="noStyle"
        >
          {$t('friendManagement.sendFriendRequest')}
        </Button>
      {/if}
    </div>
  {/if}
</div>

{#snippet AddFriendButton(friendId: string)}
  <button
    class="{baseActionButtonClasses} bg-green-500 text-primary hover:bg-green-500/80"
    disabled={accountsAdding.has(friendId)}
    onclick={() => acceptOrAddFriend(friendId)}
    title={$t('friendManagement.acceptRequest')}
  >
    {#if accountsAdding.has(friendId)}
      <LoaderCircleIcon class="size-5 animate-spin"/>
    {:else}
      <UserPlusIcon class="size-5"/>
    {/if}
  </button>
{/snippet}

{#snippet RemoveFriendButton(friendId: string, type: 'friend' | 'outgoing' | 'incoming')}
  <button
    class="{baseActionButtonClasses} bg-destructive text-destructive-foreground hover:bg-destructive/80"
    onclick={() => denyOrRemoveFriend(friendId)}
    title={type === 'friend' ? $t('friendManagement.removeFriend') : type === 'outgoing' ? $t('friendManagement.cancelRequest') : $t('friendManagement.denyRequest')}
  >
    {#if accountsRemoving.has(friendId)}
      <LoaderCircleIcon class="size-5 animate-spin"/>
    {:else}
      <UserMinusIcon class="size-5"/>
    {/if}
  </button>
{/snippet}

{#snippet BlockButton(accountId: string)}
  <button
    class="{baseActionButtonClasses} bg-destructive text-destructive-foreground hover:bg-destructive/80"
    onclick={() => blockUser(accountId)}
    title={$t('friendManagement.blockUser')}
  >
    {#if accountsBlocking.has(accountId)}
      <LoaderCircleIcon class="size-5 animate-spin"/>
    {:else}
      <BanIcon class="size-5"/>
    {/if}
  </button>
{/snippet}

{#snippet UnblockButton(accountId: string)}
  <button
    class="{baseActionButtonClasses} bg-green-500 text-primary hover:bg-green-500/80"
    disabled={accountsUnblocking.has(accountId)}
    onclick={() => unblockUser(accountId)}
    title={$t('friendManagement.unblockUser')}
  >
    {#if accountsUnblocking.has(accountId)}
      <LoaderCircleIcon class="size-5 animate-spin"/>
    {:else}
      <ShieldMinus class="size-5"/>
    {/if}
  </button>
{/snippet}