<script lang="ts">
  import Dialog from '$components/ui/Dialog.svelte';
  import Select from '$components/ui/Select.svelte';
  import Button from '$components/ui/Button.svelte';
  import UserIcon from 'lucide-svelte/icons/user';
  import ChevronsUpAndDownIcon from 'lucide-svelte/icons/chevrons-up-down';
  import LoaderCircleIcon from 'lucide-svelte/icons/loader-circle';
  import GiftIcon from 'lucide-svelte/icons/gift';
  import { accountDataStore, accountsStore } from '$lib/stores';
  import { nonNull } from '$lib/utils';
  import { toast } from 'svelte-sonner';
  import type { SpitfireShopItem } from '$types/game/shop';
  import MCPManager from '$lib/core/managers/mcp';
  import type { AccountStoreData } from '$types/accounts';
  import EpicAPIError from '$lib/exceptions/EpicAPIError';

  type Props = {
    item: SpitfireShopItem;
    isSendingGifts: boolean;
    open: boolean;
  };

  let {
    item,
    isSendingGifts,
    open = $bindable(false)
  }: Props = $props();

  const activeAccount = $derived(nonNull($accountsStore.activeAccount));

  const {
    vbucks: ownedVbucks = 0,
    friends = [],
    remainingGifts = 5
  } = $derived<AccountStoreData>($accountDataStore[activeAccount.accountId] || {});

  let selectedFriends = $state<string[]>([]);

  async function sendGifts() {
    isSendingGifts = true;

    try {
      const giftData = await MCPManager.giftCatalogEntry(activeAccount, item.offerId, selectedFriends, item.price.final);

      accountDataStore.update((accounts) => {
        const account = accounts[activeAccount.accountId];
        account.remainingGifts = (account.remainingGifts || 0) - selectedFriends.length;
        account.vbucks = (account.vbucks || 0) - giftData.vbucksSpent;
        return accounts;
      });

      toast.success('Successfully sent all gifts');
    } catch (error) {
      if (error instanceof EpicAPIError) {
        switch (error.errorCode) {
          case 'errors.com.epicgames.modules.gamesubcatalog.gift_limit_reached': {
            toast.error('You have reached the daily gift limit');
            accountDataStore.update((accounts) => {
              const account = accounts[activeAccount.accountId];
              account.remainingGifts = 0;
              return accounts;
            });

            return;
          }
          case 'errors.com.epicgames.modules.gameplayutils.not_enough_mtx': {
            const [, errorItemPrice, errorOwnedVbucks] = error.messageVars;

            toast.error(`You need ${Number.parseInt(errorItemPrice) - Number.parseInt(errorOwnedVbucks)} more V-Bucks to send these gifts`);
            accountDataStore.update((accounts) => {
              const account = accounts[activeAccount.accountId];
              account.vbucks = Number.parseInt(errorItemPrice);
              return accounts;
            });

            return;
          }
          case 'errors.com.epicgames.modules.gamesubcatalog.purchase_not_allowed': {
            toast.error('Couldn\'t send gifts, one or more friends may already own this item');
            return;
          }
          case 'errors.com.epicgames.modules.gamesubcatalog.gift_recipient_not_eligible': {
            toast.error('Couldn\'t send gifts, one or more friends are not eligible to receive gifts');
            return;
          }
          case 'errors.com.epicgames.modules.gamesubcatalog.receiver_owns_item_from_bundle': {
            toast.error('Couldn\'t send gifts, one or more friends already own an item from this bundle');
            return;
          }
          default: {
            if (error.message.toLowerCase().includes('mfa')) {
              toast.error('You need to enable Multi-Factor Authentication on your account to send gifts');
              return;
            }

            if (error.messageVars?.[0] === 'errors.com.epicgames.modules.gamesubcatalog.receiver_will_not_accept_gifts') {
              toast.error('Couldn\'t send gifts, one or more friends do not accept gifts');
              return;
            }
          }
        }
      }

      toast.error('Failed to send gifts');
    } finally {
      isSendingGifts = false;
      open = false;
    }
  }
</script>

<Dialog contentProps={{ class: 'w-96 space-y-4' }} title="Gift to {remainingGifts > 1 ? 'Friends' : 'a Friend'}" bind:open>
  {#snippet description()}
    <p class="flex flex-wrap items-start gap-1">
      Choose {remainingGifts > 1 ? 'friends' : 'a friend'} to gift <span class="font-semibold">{item.name}</span> to
      for <span class="font-semibold">{(item.price.final * (selectedFriends.length || 1)).toLocaleString()}</span>
      <img class="inline-block size-5 align-middle" alt="V-Bucks" src="/assets/resources/currency_mtxswap.png"/>
    </p>
  {/snippet}

  <Select
    disabled={!friends?.length}
    items={friends.map((friend) => ({ label: friend.displayName, value: friend.accountId }))}
    maxSelections={remainingGifts}
    triggerClass="w-full"
    type="multiple"
    bind:value={selectedFriends}>
    {#snippet trigger(label)}
      <UserIcon class="text-muted-foreground size-5 mr-2"/>
      <span class="text-muted-foreground">
        {!selectedFriends.length ? `Select ${remainingGifts > 1 ? 'friends' : 'a friend'}` : selectedFriends.length > 1 ? `${selectedFriends.length} friends selected` : label}
      </span>
      <ChevronsUpAndDownIcon class="text-muted-foreground size-5 ml-auto"/>
    {/snippet}
  </Select>

  <div class="flex justify-end gap-1">
    <Button
      onclick={() => open = false}
      variant="outline"
    >
      Cancel
    </Button>

    <Button
      class="flex justify-center items-center gap-x-2"
      disabled={!selectedFriends.length || isSendingGifts || ownedVbucks < (item.price.final * (selectedFriends.length || 1))}
      onclick={sendGifts}
      variant="epic"
    >
      {#if isSendingGifts}
        <LoaderCircleIcon class="size-5 animate-spin"/>
        Sending
      {:else}
        <GiftIcon class="size-5"/>
        Send Gift{selectedFriends.length > 1 ? 's' : ''}
      {/if}
    </Button>
  </div>
</Dialog>
