<script lang="ts">
  import CenteredPageContent from '$components/CenteredPageContent.svelte';
  import AccountSelect from '$components/auth/account/AccountSelect.svelte';
  import Button from '$components/ui/Button.svelte';
  import { accountsStore, doingBulkOperations } from '$lib/stores';
  import LoaderCircleIcon from 'lucide-svelte/icons/loader-circle';
  import MCPManager from '$lib/core/managers/mcp';
  import { calculateVbucks } from '$lib/utils';
  import EpicAPIError from '$lib/exceptions/EpicAPIError';
  import type { BulkActionStatus } from '$types/accounts';

  type VbucksStatus = BulkActionStatus<{
    vbucksAmount?: number;
    error?: string;
  }>;

  let selectedAccounts = $state<string[]>([]);
  let isFetching = $state(false);
  let vbucksStatuses = $state<VbucksStatus[]>([]);

  async function fetchVbucksData(event: SubmitEvent) {
    event.preventDefault();

    isFetching = true;
    doingBulkOperations.set(true);

    const accounts = selectedAccounts.map((accountId) => $accountsStore.allAccounts.find((account) => account.accountId === accountId)).filter(x => !!x);
    await Promise.allSettled(accounts.map(async (account) => {
      const status = vbucksStatuses.find((status) => status.accountId === account.accountId)
        || { accountId: account.accountId, displayName: account.displayName, data: { vbucksAmount: 0 } } satisfies VbucksStatus;

      if (!vbucksStatuses.includes(status)) vbucksStatuses = [...vbucksStatuses, status];

      try {
        const queryProfile = await MCPManager.queryProfile(account, 'common_core');
        status.data.vbucksAmount = calculateVbucks(queryProfile);
      } catch (error) {
        status.data.error = error instanceof EpicAPIError && error.errorCode === 'errors.com.epicgames.account.invalid_account_credentials'
          ? 'Login session has expired. Please log in again'
          : 'Unknown error';
      }
    }));

    selectedAccounts = [];
    doingBulkOperations.set(false);
    isFetching = false;
  }
</script>

<CenteredPageContent title="V-Bucks Information">
  <form class="flex flex-col gap-y-2" onsubmit={fetchVbucksData}>
    <AccountSelect disabled={isFetching} type="multiple" bind:selected={selectedAccounts}/>

    <Button
      class="flex justify-center items-center gap-x-2 mt-2"
      disabled={!selectedAccounts?.length || isFetching}
      variant="epic"
    >
      {#if isFetching}
        <LoaderCircleIcon class="size-6 animate-spin"/>
        Loading V-Bucks information
      {:else}
        Get V-Bucks Information
      {/if}
    </Button>
  </form>

  {#if !isFetching && vbucksStatuses.length}
    <div class="flex flex-col p-2 border rounded-md">
      {#each vbucksStatuses as status (status.accountId)}
        <div class="flex gap-x-2">
          <p class="font-medium">{status.displayName}:</p>

          {#if status.data.vbucksAmount != null}
            <div class="flex items-center gap-x-1">
              <p>{status.data.vbucksAmount.toLocaleString()}</p>
              <img class="size-5" alt="V-Bucks" src="/assets/resources/currency_mtxswap.png"/>
            </div>
          {/if}

          {#if status.data.error}
            <p class="text-red-500">{status.data.error}</p>
          {/if}
        </div>
      {/each}
    </div>
  {/if}
</CenteredPageContent>