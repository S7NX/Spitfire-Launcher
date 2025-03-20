<script lang="ts">
  import AlertDialog from '$components/ui/alert-dialog/AlertDialog.svelte';
  import AlertDialogButton from '$components/ui/alert-dialog/AlertDialogButton.svelte';
  import LoaderCircleIcon from 'lucide-svelte/icons/loader-circle';
  import type { SpitfireShopItem } from '$types/game/shop';
  import { toast } from 'svelte-sonner';
  import { accountDataStore, accountsStore, ownedItemsStore } from '$lib/stores';
  import MCPManager from '$lib/core/managers/mcp';
  import { calculateDiscountedShopPrice, nonNull } from '$lib/utils';
  import EpicAPIError from '$lib/exceptions/EpicAPIError';

  type Props = {
    item: SpitfireShopItem;
    isPurchasing: boolean;
    open: boolean;
  };

  let {
    item,
    isPurchasing,
    open = $bindable(false)
  }: Props = $props();

  const activeAccount = $derived(nonNull($accountsStore.activeAccount));
  const price = $derived(calculateDiscountedShopPrice(activeAccount.accountId, item));

  async function purchaseItem() {
    isPurchasing = true;

    try {
      const purchaseData = await MCPManager.purchaseCatalogEntry(activeAccount, item.offerId, price);

      accountDataStore.update((accounts) => {
        const account = accounts[activeAccount.accountId];
        account.vbucks = (account.vbucks || 0) - purchaseData.vbucksSpent;
        return accounts;
      });

      ownedItemsStore.update((accounts) => {
        const items = accounts[activeAccount.accountId] || new Set<string>();
        items.add(item.offerId);

        accounts[activeAccount.accountId] = items;
        return accounts;
      });

      toast.success('Successfully purchased item');
    } catch (error) {
      if (error instanceof EpicAPIError) {
        if (error.errorCode === 'errors.com.epicgames.modules.gameplayutils.not_enough_mtx') {
          const [, errorItemPrice, errorOwnedVbucks] = error.messageVars;

          toast.error(`You need ${Number.parseInt(errorItemPrice) - Number.parseInt(errorOwnedVbucks)} more V-Bucks to purchase this item`);
          accountDataStore.update((accounts) => {
            const account = accounts[activeAccount.accountId];
            account.vbucks = Number.parseInt(errorItemPrice);
            return accounts;
          });

          return;
        }

        if (error.errorCode === 'errors.com.epicgames.modules.gamesubcatalog.purchase_not_allowed') {
          toast.error('You already own this item');
          ownedItemsStore.update((accounts) => {
            const items = accounts[activeAccount.accountId] || new Set<string>();
            items.add(item.offerId);

            accounts[activeAccount.accountId] = items;
            return accounts;
          });

          return;
        }
      }

      toast.error('Failed to purchase item');
    } finally {
      isPurchasing = false;
      open = false;
    }
  }
</script>

<AlertDialog title="Purchase Confirmation" bind:open>
  {#snippet description()}
    <p class="flex items-center gap-1">
      Are you sure you want to purchase
      <span class="font-semibold">{item.name}</span>
      for <span class="font-semibold">{price.toLocaleString()}</span>
      <img class="size-5" alt="V-Bucks" src="/assets/resources/currency_mtxswap.png"/>?
    </p>
  {/snippet}

  <div class="flex w-full items-center justify-center gap-2">
    <AlertDialogButton buttonType="cancel">
      Cancel
    </AlertDialogButton>

    <AlertDialogButton buttonColor="epic" buttonType="action" disabled={isPurchasing} onclick={purchaseItem}>
      {#if isPurchasing}
        <LoaderCircleIcon class="size-5 animate-spin mr-2"/>
        Purchasing
      {:else}
        Confirm
      {/if}
    </AlertDialogButton>
  </div>
</AlertDialog>
