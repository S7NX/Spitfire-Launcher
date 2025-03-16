<script lang="ts">
  import CenteredPageContent from '$components/CenteredPageContent.svelte';
  import AccountSelect from '$components/auth/account/AccountSelect.svelte';
  import Button from '$components/ui/Button.svelte';
  import LoaderCircleIcon from 'lucide-svelte/icons/loader-circle';
  import ExternalLinkIcon from 'lucide-svelte/icons/external-link';
  import { accountsStore, doingBulkOperations } from '$lib/stores';
  import { toast } from 'svelte-sonner';
  import Authentication from '$lib/core/authentication';
  import EpicAPIError from '$lib/exceptions/EpicAPIError';
  import type { BulkActionStatus } from '$types/accounts';

  type EULAStatus = BulkActionStatus<{
    acceptLink?: string;
  }>;

  let selectedAccounts = $state<string[]>([]);
  let isFetching = $state(false);
  let eulaStatuses = $state<EULAStatus[]>([]);

  async function checkEULA(event: SubmitEvent) {
    event.preventDefault();

    isFetching = true;
    doingBulkOperations.set(true);

    const accounts = selectedAccounts.map((accountId) => $accountsStore.allAccounts.find((account) => account.accountId === accountId)).filter(x => !!x);
    await Promise.all(accounts.map(async (account) => {
      const status = eulaStatuses.find((status) => status.accountId === account.accountId)
        || { accountId: account.accountId, displayName: account.displayName, data: {} } satisfies EULAStatus;

      if (!eulaStatuses.includes(status)) eulaStatuses = [...eulaStatuses, status];

      try {
        const accessToken = await Authentication.verifyOrRefreshAccessToken(account);
        await Authentication.verifyAccessToken(accessToken);
      } catch (error) {
        if (!(error instanceof EpicAPIError)) return;

        if (error.errorCode === 'errors.com.epicgames.oauth.corrective_action_required' && error.continuationUrl) {
          status.data.acceptLink = error.continuationUrl;
        }
      }
    }));

    eulaStatuses = eulaStatuses.filter(status => status.data.acceptLink);

    if (!eulaStatuses.length) {
      toast.info('All selected accounts have already accepted the EULA');
    }

    selectedAccounts = [];
    doingBulkOperations.set(false);
    isFetching = false;
  }
</script>

<CenteredPageContent>
  <h2 class="text-lg font-medium">EULA</h2>

  <form class="flex flex-col gap-y-2" onsubmit={checkEULA}>
    <AccountSelect disabled={isFetching} type="multiple" bind:selected={selectedAccounts}/>

    <Button
      class="flex justify-center items-center gap-x-2 mt-2"
      disabled={!selectedAccounts?.length || isFetching}
      variant="epic"
    >
      {#if isFetching}
        <LoaderCircleIcon class="size-6 animate-spin"/>
        Checking EULA
      {:else}
        Check EULA
      {/if}
    </Button>
  </form>

  {#if !isFetching && eulaStatuses.length}
    <div class="mt-4 space-y-4">
      {#each eulaStatuses as status (status.accountId)}
        <div class="flex items-center justify-between px-3 py-2 bg-muted border rounded-lg">
          <span class="font-semibold truncate">{status.displayName}</span>

          <a
            class="hover:bg-muted-foreground/10 flex size-8 items-center justify-center rounded-md"
            href={status.data.acceptLink}
            target="_blank"
          >
            <ExternalLinkIcon class="size-5"/>
          </a>
        </div>
      {/each}
    </div>
  {/if}
</CenteredPageContent>