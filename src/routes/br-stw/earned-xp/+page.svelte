<script lang="ts" module>
  import type { BulkActionStatus } from '$types/accounts';

  type XPStatus = BulkActionStatus<{
    battleRoyale: number;
    creative: number;
    saveTheWorld: number;
    resetDate: Date;
    stwResetDate: Date;
  }>;

  let isFetching = $state(false);
  let xpStatuses = $state<XPStatus[]>([]);

  function getNextSunday(): Date {
    const now = new Date();
    const daysUntilSunday = 7 - now.getDay();
    const nextSunday = new Date(now);
    nextSunday.setDate(now.getDate() + (daysUntilSunday === 7 ? 0 : daysUntilSunday));
    nextSunday.setHours(0, 0, 0, 0);
    return nextSunday;
  }

  function getNextThursday(): Date {
    const now = new Date();
    const daysUntilThursday = 4 - now.getDay();
    const nextThursday = new Date(now);
    nextThursday.setDate(now.getDate() + (daysUntilThursday === 7 ? 0 : daysUntilThursday));
    nextThursday.setHours(0, 0, 0, 0);
    return nextThursday;
  }
</script>

<script lang="ts">
  import CenteredPageContent from '$components/CenteredPageContent.svelte';
  import { accountsStore, doingBulkOperations } from '$lib/stores';
  import Button from '$components/ui/Button.svelte';
  import AccountCombobox from '$components/auth/account/AccountCombobox.svelte';
  import { getResolvedResults, t } from '$lib/utils/util';
  import MCPManager from '$lib/core/managers/mcp';
  import BulkResultAccordion from '$components/auth/account/BulkResultAccordion.svelte';

  let selectedAccounts = $state<string[]>([]);

  async function fetchXPData() {
    isFetching = true;
    doingBulkOperations.set(true);
    xpStatuses = [];

    const nextSunday = getNextSunday();
    const nextThursday = getNextThursday();
    
    const accounts = selectedAccounts.map((accountId) => $accountsStore.allAccounts.find((account) => account.accountId === accountId)).filter(x => !!x);
    await Promise.allSettled(accounts.map(async (account) => {
      const status = xpStatuses.find((status) => status.accountId === account.accountId) ||
        { accountId: account.accountId, displayName: account.displayName, data: { resetDate: nextSunday, stwResetDate: nextThursday } as XPStatus['data'] } satisfies XPStatus;

      if (!xpStatuses.includes(status)) xpStatuses = [...xpStatuses, status];

      const [athenaProfile, campaignProfile] = await getResolvedResults([
        MCPManager.queryProfile(account, 'athena'),
        MCPManager.queryProfile(account, 'campaign')
      ]);

      if (athenaProfile) {
        const attributes = athenaProfile.profileChanges[0].profile.stats.attributes;
        status.data.creative = attributes.creative_dynamic_xp?.currentWeekXp || 0;
        status.data.battleRoyale = attributes.playtime_xp?.currentWeekXp || 0;
        status.data.resetDate = nextSunday;
      }

      if (campaignProfile) {
        const items = Object.values(campaignProfile.profileChanges[0].profile.items);
        const xpItem = items.find((item) => item.templateId === 'Token:stw_accolade_tracker');
        if (xpItem) {
          status.data.saveTheWorld = xpItem.attributes?.weekly_xp || 0;
          status.data.stwResetDate = nextThursday;
        }
      }
    }));

    doingBulkOperations.set(false);
    selectedAccounts = [];
    isFetching = false;
  }
</script>

<CenteredPageContent
  description={$t('earnedXP.page.description')}
  title={$t('earnedXP.page.title')}
>
  <form class="flex flex-col gap-y-4" onsubmit={fetchXPData}>
    <AccountCombobox
      disabled={isFetching}
      type="multiple"
      bind:selected={selectedAccounts}
    />

    <Button
      disabled={!selectedAccounts?.length || isFetching}
      loading={isFetching}
      loadingText={$t('earnedXP.loading')}
      onclick={fetchXPData}
      variant="epic"
    >
      {$t('earnedXP.check')}
    </Button>
  </form>

  {#if !isFetching && xpStatuses.length}
    <BulkResultAccordion statuses={xpStatuses}>
      {#snippet content(status)}
        {@const gamemodes = [
          {
            name: $t('common.gameModes.battleRoyale'),
            value: status.data.battleRoyale || 0,
            limit: 4_000_000
          },
          {
            name: $t('common.gameModes.creative'),
            value: status.data.creative || 0,
            limit: 4_000_000
          },
          {
            name: $t('common.gameModes.saveTheWorld'),
            value: status.data.saveTheWorld || 0,
            limit: 4_000_000
          }
        ]}

        <div class="bg-muted/30 p-3 space-y-6">
          {#each gamemodes as gamemode (gamemode.name)}
            <div class="space-y-1">
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-1.5">
                  <img
                    class="size-4"
                    alt="XP Icon"
                    src="/assets/misc/battle-royale-xp.png"
                  />
                  <span class="font-medium">{gamemode.name}</span>
                </div>

                <div class="text-sm">
                  <span class="font-medium">{gamemode.value.toLocaleString()}</span>
                  <span class="text-muted-foreground">/ {gamemode.limit.toLocaleString()}</span>
                </div>
              </div>

              <div class="h-2 w-full bg-muted rounded-full overflow-hidden">
                <div
                  style="width: {Math.min(100,(gamemode.value / gamemode.limit) * 100)}%"
                  class="h-full bg-epic"
                ></div>
              </div>
              {#if gamemode.name === $t('common.gameModes.saveTheWorld') && status.data.stwResetDate}
                <div class="text-sm text-muted-foreground mt-1">
                  Resets At: {status.data.stwResetDate.toLocaleDateString()}, 7:00 PM EST
                </div>
              {/if}

              {#if gamemode.name !== $t('common.gameModes.saveTheWorld') && status.data.resetDate}
                <div class="text-sm text-muted-foreground mt-1">
                  Resets At: {status.data.resetDate.toLocaleDateString()}, 7:00 PM EST
                </div>
              {/if}
            </div>
          {/each}
        </div>
      {/snippet}
    </BulkResultAccordion>
  {/if}
</CenteredPageContent>
