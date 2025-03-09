<script lang="ts">
  import CenteredPageContent from '$components/CenteredPageContent.svelte';
  import AccountSelect from '$components/auth/account/AccountSelect.svelte';
  import Button from '$components/ui/Button.svelte';
  import TagInput from '$lib/components/ui/TagInput.svelte';
  import { accountsStore, doingBulkOperations } from '$lib/stores';
  import CodeManager from '$lib/core/managers/code';
  import EpicAPIError from '$lib/exceptions/EpicAPIError';
  import Accordion from '$components/ui/Accordion.svelte';
  import ChevronDownIcon from 'lucide-svelte/icons/chevron-down';
  import LoaderCircleIcon from 'lucide-svelte/icons/loader-circle';

  type CodeStatuses = Array<{
    accountId: string;
    displayName: string;
    codes: Array<{
      code: string;
      error?: string
    }>
  }>;

  let selectedAccounts = $state<string[]>([]);
  let codesToRedeem = $state<string[]>([]);
  let isRedeeming = $state(false);
  let codeStatuses = $state<CodeStatuses>([]);

  const humanizedErrors: Record<string, string> = {
    'errors.com.epicgames.coderedemption.code_not_found': 'Code not found',
    'errors.com.epicgames.coderedemption.codeUse_already_used': 'Items already owned',
    'errors.com.epicgames.coderedemption.multiple_redemptions_not_allowed': 'Items already owned',
    'errors.com.epicgames.coderedemption.code_used': 'Code already used'
  };

  async function redeemCodes() {
    isRedeeming = true;
    doingBulkOperations.set(true);

    const nonExistentCodes: string[] = [];
    const invalidCredentialsAccounts: string[] = [];

    const accounts = selectedAccounts.map((accountId) => $accountsStore.allAccounts.find((account) => account.accountId === accountId)).filter(x => !!x);
    await Promise.all(accounts.map(async (account) => {
      await Promise.all(codesToRedeem.map(async (code) => {
        const status = codeStatuses.find((status) => status.accountId === account.accountId) || { accountId: account.accountId, displayName: account.displayName, codes: [] };
        if (!codeStatuses.includes(status)) codeStatuses = [...codeStatuses, status];

        if (nonExistentCodes.includes(code)) {
          status.codes.push({ code, error: 'Code not found' });
          return;
        }

        if (invalidCredentialsAccounts.includes(account.accountId)) {
          status.codes.push({ code, error: 'Your login session has expired. Please log in again.' });
          return;
        }

        try {
          await CodeManager.redeem(account, code);
          status.codes.push({ code });
        } catch (error) {
          let errorString = 'Unknown error';

          if (error instanceof EpicAPIError) {
            errorString = humanizedErrors[error.errorCode] || error.message;
            if (error.errorCode === 'errors.com.epicgames.coderedemption.code_not_found') nonExistentCodes.push(code);
            if (error.errorCode === 'errors.com.epicgames.account.invalid_account_credentials') {
              errorString = 'Login session has expired. Please log in again';
              invalidCredentialsAccounts.push(account.accountId);
            }
          }

          status.codes.push({ code, error: errorString });
        }
      }));
    }));

    codesToRedeem = [];
    doingBulkOperations.set(false);
    isRedeeming = false;
  }
</script>

<CenteredPageContent>
  <h2 class="text-lg font-medium">Redeem Codes</h2>
  <AccountSelect type="multiple" bind:selected={selectedAccounts}/>

  <TagInput
    placeholder="Enter codes to redeem and press Enter"
    bind:items={codesToRedeem}
  />

  <Button
    class="flex justify-center items-center gap-x-2 mt-2"
    disabled={!selectedAccounts?.length || !codesToRedeem.length || isRedeeming}
    onclick={redeemCodes}
    variant="epic"
  >
    {#if isRedeeming}
      <LoaderCircleIcon class="size-6 animate-spin"/>
      Redeeming
    {:else}
      Redeem Codes
    {/if}
  </Button>

  {#if !isRedeeming && codeStatuses.length}
    <div class="mt-2 w-full max-w-2xl">
      <h3 class="text-base font-medium mb-3">Redemption Results</h3>

      <Accordion items={codeStatuses} type="multiple">
        {#snippet trigger(status)}
          <div class="flex items-center justify-between px-2 h-10 w-full bg-muted-foreground/5 rounded-sm">
            <div class="flex items-center gap-2 overflow-hidden">
              <span class="font-medium truncate min-w-fit shrink-0">{status.displayName}</span>

              <div class="flex items-center ml-1 gap-1 overflow-hidden flex-wrap">
                {#each status.codes as { code, error } (code)}
                  <div class="size-2.5 rounded-full shrink-0 {error ? 'bg-red-500' : 'bg-green-500'}" title="{error ? 'Has errors' : 'All successful'}"></div>
                {/each}
              </div>
            </div>

            <span class="hover:bg-muted-foreground/10 inline-flex size-8 items-center justify-center bg-transparent shrink-0 ml-1">
              <ChevronDownIcon class="size-5 transition-transform duration-200"/>
            </span>
          </div>
        {/snippet}

        {#snippet content(status)}
          <div class="overflow-hidden text-sm mt-1 bg-muted-foreground/5 p-2">
            {#each status.codes as { code, error } (code)}
              <div class="flex items-center gap-1.5 py-1 truncate">
                <span class="font-medium">{code}:</span>
                <span class="truncate {error ? 'text-red-500' : 'text-green-500'}">{error || 'Redeemed'}</span>
              </div>
            {/each}
          </div>
        {/snippet}
      </Accordion>
    </div>
  {/if}
</CenteredPageContent>