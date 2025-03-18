<script lang="ts">
  import CenteredPageContent from '$components/CenteredPageContent.svelte';
  import { accountsStore } from '$lib/stores';
  import Button from '$components/ui/Button.svelte';
  import AccountSelect from '$components/auth/account/AccountSelect.svelte';
  import LoaderCircleIcon from 'lucide-svelte/icons/loader-circle';
  import { doingBulkOperations } from '$lib/stores.js';
  import MCPManager from '$lib/core/managers/mcp';
  import BulkResultAccordion from '$components/auth/account/BulkResultAccordion.svelte';
  import type { BulkActionStatus } from '$types/accounts';

  type XPStatus = BulkActionStatus<{
    battleRoyale: number;
    creative: number;
    saveTheWorld: number;
  }>;

  let selectedAccounts = $state<string[]>([]);
  let isFetching = $state(false);
  let xpStatuses = $state<XPStatus[]>([]);

  async function fetchXPData() {
    isFetching = true;
    doingBulkOperations.set(true);

    const accounts = selectedAccounts.map((accountId) => $accountsStore.allAccounts.find((account) => account.accountId === accountId)).filter(x => !!x);
    await Promise.allSettled(accounts.map(async (account) => {
      const status = xpStatuses.find((status) => status.accountId === account.accountId) ||
        { accountId: account.accountId, displayName: account.displayName, data: {} as XPStatus['data'] } satisfies XPStatus;

      if (!xpStatuses.includes(status)) xpStatuses = [...xpStatuses, status];

      const [athenaProfile, campaignProfile] = await Promise.all([
        MCPManager.queryProfile(account, 'athena').catch(() => null),
        MCPManager.queryProfile(account, 'campaign').catch(() => null)
      ]);

      if (athenaProfile) {
        const attributes = athenaProfile.profileChanges[0].profile.stats.attributes;
        status.data.creative = attributes.creative_dynamic_xp?.currentWeekXp || 0;
        status.data.battleRoyale = attributes.playtime_xp?.currentWeekXp || 0;
      }

      if (campaignProfile) {
        const items = Object.values(campaignProfile.profileChanges[0].profile.items);
        const xpItem = items.find((item) => item.templateId === 'Token:stw_accolade_tracker');
        if (xpItem) {
          status.data.saveTheWorld = xpItem.attributes?.weekly_xp || 0;
        }
      }
    }));

    doingBulkOperations.set(false);
    selectedAccounts = [];
    isFetching = false;
  }
</script>

<CenteredPageContent>
  <div class="flex flex-col gap-y-2">
    <h2 class="text-lg font-medium">Earned XP</h2>

    <p class="text-sm text-muted-foreground">
      Check your XP progress from Battle Royale, Creative and Save the World
    </p>
  </div>

  <form class="flex flex-col gap-y-2" onsubmit={fetchXPData}>
    <AccountSelect disabled={isFetching} type="multiple" bind:selected={selectedAccounts}/>

    <Button
      class="flex justify-center items-center gap-x-2 mt-2"
      disabled={!selectedAccounts?.length || isFetching}
      onclick={fetchXPData}
      variant="epic"
    >
      {#if isFetching}
        <LoaderCircleIcon class="size-6 animate-spin"/>
        Loading XP information
      {:else}
        Check XP Progress
      {/if}
    </Button>
  </form>

  {#if !isFetching && xpStatuses.length}
    <BulkResultAccordion statuses={xpStatuses}>
      {#snippet content(status)}
        {@const gamemodes = [
          {
            name: 'Battle Royale',
            value: status.data.battleRoyale || 0,
            limit: 4_000_000
          },
          {
            name: 'Creative',
            value: status.data.creative || 0,
            limit: 4_000_000
          },
          {
            name: 'Save the World',
            value: status.data.saveTheWorld || 0,
            limit: 4_000_000
          }
        ]}

        <div class="bg-muted/30 p-3 space-y-6">
          {#each gamemodes as gamemode (gamemode.name)}
            <div class="space-y-1">
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-1.5">
                  <img class="size-4" alt="XP Icon" src="/assets/brxp.png"/>
                  <span class="font-medium">{gamemode.name}</span>
                </div>

                <div class="text-sm">
                  <span class="font-medium">{gamemode.value.toLocaleString()}</span>
                  <span class="text-muted-foreground">/ {gamemode.limit.toLocaleString()}</span>
                </div>
              </div>

              <div class="h-2 w-full bg-muted rounded-full overflow-hidden">
                <div
                  style="width: {Math.min(100, (gamemode.value / gamemode.limit) * 100)}%"
                  class="h-full bg-epic"
                ></div>
              </div>
            </div>
          {/each}
        </div>
      {/snippet}
    </BulkResultAccordion>
  {/if}
</CenteredPageContent>