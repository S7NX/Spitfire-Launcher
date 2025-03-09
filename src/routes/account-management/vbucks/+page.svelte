<script lang="ts">
  import AccountSelect from '$components/auth/account/AccountSelect.svelte';
  import Button from '$components/ui/Button.svelte';
  import { accountsStore, doingBulkOperations } from '$lib/stores';
  import LoaderCircleIcon from 'lucide-svelte/icons/loader-circle';
  import MCPManager from '$lib/core/managers/mcp';
  import { calculateVbucks } from '$lib/utils';
  import EpicAPIError from '$lib/exceptions/EpicAPIError';

  type VbucksStatuses = Array<{
    accountId: string;
    displayName: string;
    vbucksAmount?: number;
    error?: string;
  }>;

  let selectedAccounts = $state<string[]>([]);
  let isFetching = $state(false);
  let vbucksStatuses = $state<VbucksStatuses>([]);

  async function handleSubmit() {
    isFetching = true;
    doingBulkOperations.set(true);

    const accounts = selectedAccounts.map((accountId) => $accountsStore.allAccounts.find((account) => account.accountId === accountId)).filter(x => !!x);
    await Promise.all(accounts.map(async (account) => {
      const status = vbucksStatuses.find((status) => status.accountId === account.accountId) || { accountId: account.accountId, displayName: account.displayName, vbucksAmount: 0 };
      if (!vbucksStatuses.includes(status)) vbucksStatuses = [...vbucksStatuses, status];

      try {
        const queryProfile = await MCPManager.queryProfile(account, 'common_core');
        status.vbucksAmount = calculateVbucks(queryProfile);
      } catch (error) {
        status.error = error instanceof EpicAPIError && error.errorCode === 'errors.com.epicgames.account.invalid_account_credentials'
          ? 'Login session has expired. Please log in again'
          : 'Unknown error';
      }
    }));

    doingBulkOperations.set(false);
    isFetching = false;
  }
</script>

<div class="flex flex-col items-center justify-center h-full">
  <div class="flex flex-col gap-4 w-96 p-5 border rounded-md">
    <h2 class="text-lg font-medium">V-Bucks Information</h2>
    <AccountSelect type="multiple" bind:selected={selectedAccounts}/>

    <Button
      class="flex justify-center items-center gap-x-2 mt-2"
      disabled={!selectedAccounts?.length || isFetching}
      onclick={handleSubmit}
      variant="epic"
    >
      {#if isFetching}
        <LoaderCircleIcon class="size-6 animate-spin"/>
        Fetching V-Bucks
      {:else}
        Fetch V-Bucks
      {/if}
    </Button>

    {#if !isFetching && vbucksStatuses.length}
      <div class="mt-2 w-full max-w-2xl">
        <h3 class="text-base font-medium mb-3">Result</h3>

        <div class="flex flex-col p-2 border rounded-md">
          {#each vbucksStatuses as { accountId, displayName, vbucksAmount, error } (accountId)}
            <div class="flex gap-x-2">
              <p class="font-medium">{displayName}:</p>

              {#if vbucksAmount != null}
                <div class="flex items-center gap-x-1">
                  <p>{vbucksAmount.toLocaleString()}</p>
                  <img class="size-5" alt="V-Bucks" src="/assets/vbuck.png"/>
                </div>
              {/if}

              {#if error}
                <p class="text-red-500">{error}</p>
              {/if}
            </div>
          {/each}
        </div>
      </div>
    {/if}
  </div>
</div>