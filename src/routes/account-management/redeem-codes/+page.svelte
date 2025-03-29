<script lang="ts" module>
  import type { BulkActionStatus } from '$types/accounts';

  type CodeStatus = BulkActionStatus<Array<{
    code: string;
    error?: string
  }>>;

  let codesToRedeem = $state<string[]>([]);
  let isRedeeming = $state(false);
  let codeStatuses = $state<CodeStatus[]>([]);
</script>

<script lang="ts">
  import CenteredPageContent from '$components/CenteredPageContent.svelte';
  import AccountCombobox from '$components/auth/account/AccountCombobox.svelte';
  import Button from '$components/ui/Button.svelte';
  import TagInput from '$components/ui/TagInput.svelte';
  import { accountsStore, doingBulkOperations } from '$lib/stores';
  import CodeManager from '$lib/core/managers/code';
  import EpicAPIError from '$lib/exceptions/EpicAPIError';
  import BulkResultAccordion from '$components/auth/account/BulkResultAccordion.svelte';

  let selectedAccounts = $state<string[]>([]);

  const humanizedErrors: Record<string, string> = {
    'errors.com.epicgames.coderedemption.code_not_found': 'Code not found',
    'errors.com.epicgames.coderedemption.codeUse_already_used': 'Items already owned',
    'errors.com.epicgames.coderedemption.multiple_redemptions_not_allowed': 'Items already owned',
    'errors.com.epicgames.coderedemption.code_used': 'Code already used'
  };

  async function redeemCodes(event: SubmitEvent) {
    event.preventDefault();

    isRedeeming = true;
    doingBulkOperations.set(true);
    codeStatuses = [];

    const nonExistentCodes: string[] = [];
    const invalidCredentialsAccounts: string[] = [];

    const accounts = selectedAccounts.map((accountId) => $accountsStore.allAccounts.find((account) => account.accountId === accountId)).filter(x => !!x);
    await Promise.allSettled(accounts.map(async (account) => {
      await Promise.allSettled(codesToRedeem.map(async (code) => {
        const status = codeStatuses.find((status) => status.accountId === account.accountId)
          || { accountId: account.accountId, displayName: account.displayName, data: [] } satisfies CodeStatus;

        if (!codeStatuses.includes(status)) codeStatuses = [...codeStatuses, status];

        if (nonExistentCodes.includes(code)) {
          status.data.push({ code, error: 'Code not found' });
          return;
        }

        if (invalidCredentialsAccounts.includes(account.accountId)) {
          status.data.push({ code, error: 'Login session expired.' });
          return;
        }

        try {
          await CodeManager.redeem(account, code);
          status.data.push({ code });
        } catch (error) {
          let errorString = 'Unknown error';

          if (error instanceof EpicAPIError) {
            errorString = humanizedErrors[error.errorCode] || error.message;

            switch (error.errorCode) {
              case 'errors.com.epicgames.coderedemption.code_not_found': {
                nonExistentCodes.push(code);
                break;
              }
              case 'errors.com.epicgames.account.invalid_account_credentials': {
                errorString = 'Login session expired.';
                invalidCredentialsAccounts.push(account.accountId);
                break;
              }
            }
          }

          status.data.push({ code, error: errorString });
        }
      }));
    }));

    codeStatuses = codeStatuses.map((status) => {
      const successCount = status.data.filter(({ error }) => !error).length;
      return { ...status, displayName: `${status.displayName} - ${successCount}/${status.data.length}` };
    });

    codesToRedeem = [];
    selectedAccounts = [];
    doingBulkOperations.set(false);
    isRedeeming = false;
  }
</script>

<CenteredPageContent title="Redeem Codes">
  <form class="flex flex-col gap-2 w-full" onsubmit={redeemCodes}>
    <AccountCombobox disabled={isRedeeming} type="multiple" bind:selected={selectedAccounts}/>

    <TagInput
      placeholder="Enter the codes to redeem and press Enter"
      bind:items={codesToRedeem}
    />

    <Button
      class="mt-2"
      disabled={!selectedAccounts?.length || !codesToRedeem.length || isRedeeming}
      loading={isRedeeming}
      loadingText="Redeeming"
      variant="epic"
    >
      Redeem Codes
    </Button>
  </form>

  {#if !isRedeeming && codeStatuses.length}
    <BulkResultAccordion statuses={codeStatuses}>
      {#snippet content(status)}
        <div class="p-3 space-y-2 text-sm">
          {#each status.data as { code, error } (code)}
            <div class="flex items-center gap-1 truncate">
              <span class="font-medium">{code}:</span>
              <span class="truncate {error ? 'text-red-500' : 'text-green-500'}">{error || 'Redeemed'}</span>
            </div>
          {/each}
        </div>
      {/snippet}
    </BulkResultAccordion>
  {/if}
</CenteredPageContent>